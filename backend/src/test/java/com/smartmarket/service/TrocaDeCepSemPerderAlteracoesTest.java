package com.smartmarket.service;

import com.smartmarket.dto.localizacao.LocalizacaoResponse;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.UsuarioRepository;
import com.smartmarket.service.geo.LocalizacaoCep;
import com.smartmarket.service.geo.ResolvedorCep;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * A troca de CEP espera ate 2 s pela consulta externa. Uma mudanca feita no usuario nesse intervalo
 * (ex.: o admin alterando o papel) nao pode ser sobrescrita pelo valor que foi lido antes da espera.
 */
@SpringBootTest
@ActiveProfiles("test")
class TrocaDeCepSemPerderAlteracoesTest {

    private static final LocalizacaoCep PORTO_ALEGRE = new LocalizacaoCep("Porto Alegre", "RS", -30.0346, -51.2177);

    @Autowired private LocalizacaoService localizacaoService;
    @Autowired private UsuarioRepository usuarioRepository;
    @MockitoBean private ResolvedorCep resolvedorCep;

    private String email;

    @BeforeEach
    void cenario() {
        email = "troca-" + UUID.randomUUID() + "@email.com";
        Usuario u = Usuario.builder().nome("Usuario Troca").email(email).senha("x").papel(Papel.USER)
            .cep("11111111").cidade("Antiga").uf("SP").latitude(-23.0).longitude(-46.0).build();
        usuarioRepository.save(u);
    }

    @AfterEach
    void limpa() {
        usuarioRepository.findByEmail(email).ifPresent(usuarioRepository::delete);
    }

    @Test
    void mudancaDePapelFeitaDuranteAConsultaDeCepNaoEhSobrescrita() {
        // Durante resolver() o "admin" promove o usuario, como numa requisicao concorrente.
        when(resolvedorCep.resolver(anyString())).thenAnswer(inv -> {
            Usuario doBanco = usuarioRepository.findByEmail(email).orElseThrow();
            doBanco.setPapel(Papel.ADMIN);
            usuarioRepository.saveAndFlush(doBanco);
            return Optional.of(PORTO_ALEGRE);
        });

        LocalizacaoResponse resposta = localizacaoService.trocarCep(email, "90010-000");

        Usuario depois = usuarioRepository.findByEmail(email).orElseThrow();
        assertThat(depois.getPapel()).isEqualTo(Papel.ADMIN);
        assertThat(depois.getCep()).isEqualTo("90010000");
        assertThat(depois.getCidade()).isEqualTo("Porto Alegre");
        assertThat(depois.getUf()).isEqualTo("RS");
        assertThat(depois.getLatitude()).isEqualTo(-30.0346);
        assertThat(depois.getLongitude()).isEqualTo(-51.2177);
        assertThat(resposta.cep()).isEqualTo("90010000");
        assertThat(resposta.resolvida()).isTrue();
    }

    @Test
    void cepNaoResolvidoDescartaALocalizacaoAntigaSemMexerNoResto() {
        when(resolvedorCep.resolver(anyString())).thenReturn(Optional.empty());

        LocalizacaoResponse resposta = localizacaoService.trocarCep(email, "90010000");

        Usuario depois = usuarioRepository.findByEmail(email).orElseThrow();
        assertThat(depois.getCep()).isEqualTo("90010000");
        assertThat(depois.getCidade()).isNull();
        assertThat(depois.getUf()).isNull();
        assertThat(depois.getLatitude()).isNull();
        assertThat(depois.getLongitude()).isNull();
        assertThat(depois.getPapel()).isEqualTo(Papel.USER);
        assertThat(resposta.resolvida()).isFalse();
    }

    @Test
    void usuarioApagadoDuranteAConsultaDa404() {
        when(resolvedorCep.resolver(anyString())).thenAnswer(inv -> {
            usuarioRepository.delete(usuarioRepository.findByEmail(email).orElseThrow());
            return Optional.of(PORTO_ALEGRE);
        });

        assertThatThrownBy(() -> localizacaoService.trocarCep(email, "90010000"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void usuarioInexistenteDa404SemConsultarOCep() {
        assertThatThrownBy(() -> localizacaoService.trocarCep("nao-existe-" + UUID.randomUUID() + "@x.com", "90010000"))
            .isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(resolvedorCep);
    }
}
