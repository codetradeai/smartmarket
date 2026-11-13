package com.smartmarket.service;

import com.smartmarket.dto.localizacao.LojaProximaResponse;
import com.smartmarket.model.Loja;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.LojaRepository;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Latitude e longitude da loja em {@link LocalizacaoService#lojasProximas}: presentes na filial com
 * coordenadas, nulas (as duas, sempre juntas) na loja padrão e na loja sem coordenadas.
 */
@SpringBootTest
@ActiveProfiles("test")
class LocalizacaoServiceLojasProximasTest {

    @Autowired private LocalizacaoService localizacaoService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private MercadoRepository mercadoRepository;
    @Autowired private LojaRepository lojaRepository;

    private Mercado rede;
    private Loja padrao;
    private Loja centro;
    private String email;

    @BeforeEach
    void cenario() {
        rede = mercadoRepository.save(Mercado.builder()
            .nome("Rede Coord " + UUID.randomUUID().toString().substring(0, 8)).endereco("RS").ativo(true).build());
        padrao = loja("Rede padrao", Loja.CODIGO_PADRAO, null, null);
        centro = loja("Rede Centro", "f1", -30.0300, -51.2200);
        email = "coord-" + UUID.randomUUID() + "@email.com";
    }

    /** O H2 e compartilhado: lojas, mercado e usuario daqui nao podem sobrar (FK loja -> mercado). */
    @AfterEach
    void limpa() {
        usuarioRepository.findByEmail(email).ifPresent(usuarioRepository::delete);
        lojaRepository.deleteAll(lojaRepository.findByMercadoIdOrderByIdAsc(rede.getId()));
        mercadoRepository.deleteById(rede.getId());
    }

    private Loja loja(String nome, String codigo, Double lat, Double lon) {
        return lojaRepository.save(Loja.builder().mercado(rede).nome(nome).codigoExterno(codigo)
            .latitude(lat).longitude(lon).ativa(true).build());
    }

    private void usuario(Double lat, Double lon, Loja preferida) {
        usuarioRepository.save(Usuario.builder().nome("Usuario Coord").email(email).senha("x").papel(Papel.USER)
            .cep("90010000").cidade("Porto Alegre").uf("RS").latitude(lat).longitude(lon)
            .lojaPreferida(preferida).build());
    }

    private LojaProximaResponse daRede() {
        List<LojaProximaResponse> todas = localizacaoService.lojasProximas(email);
        return todas.stream().filter(l -> l.mercadoId().equals(rede.getId())).findFirst().orElseThrow();
    }

    @Test
    void filialMaisProximaDevolveAsCoordenadasDaLoja() {
        usuario(-30.0346, -51.2177, null);

        LojaProximaResponse resposta = daRede();

        assertThat(resposta.lojaId()).isEqualTo(centro.getId());
        assertThat(resposta.latitude()).isEqualTo(-30.0300);
        assertThat(resposta.longitude()).isEqualTo(-51.2200);
        assertThat(resposta.distanciaKm()).isNotNull();
    }

    @Test
    void lojaPadraoDevolveCoordenadasNulasQuandoNaoHaLocalizacao() {
        usuario(null, null, null);

        LojaProximaResponse resposta = daRede();

        assertThat(resposta.padrao()).isTrue();
        assertThat(resposta.latitude()).isNull();
        assertThat(resposta.longitude()).isNull();
    }

    @Test
    void lojaPadraoNuncaExpoeCoordenadasMesmoQueTenha() {
        padrao.setLatitude(-30.0346);
        padrao.setLongitude(-51.2177);
        lojaRepository.save(padrao);
        usuario(null, null, null);

        LojaProximaResponse resposta = daRede();

        assertThat(resposta.padrao()).isTrue();
        assertThat(resposta.latitude()).isNull();
        assertThat(resposta.longitude()).isNull();
    }

    @Test
    void lojaPadraoEscolhidaPorFaltaDeFilialComCoordenadasTambemVemSemCoordenadas() {
        // A unica filial nao tem coordenadas: mesmo com o usuario localizado, cai na padrao.
        centro.setLatitude(null);
        centro.setLongitude(null);
        lojaRepository.save(centro);
        usuario(-30.0346, -51.2177, null);

        LojaProximaResponse resposta = daRede();

        assertThat(resposta.padrao()).isTrue();
        assertThat(resposta.latitude()).isNull();
        assertThat(resposta.longitude()).isNull();
    }

    @Test
    void lojaPreferidaSemCoordenadasDevolveCoordenadasNulas() {
        Loja semCoordenadas = loja("Rede sem coordenadas", "f2", null, null);
        usuario(-30.0346, -51.2177, semCoordenadas);

        LojaProximaResponse resposta = daRede();

        assertThat(resposta.lojaId()).isEqualTo(semCoordenadas.getId());
        assertThat(resposta.preferida()).isTrue();
        assertThat(resposta.latitude()).isNull();
        assertThat(resposta.longitude()).isNull();
        assertThat(resposta.distanciaKm()).isNull();
    }

    @Test
    void coordenadaIncompletaNaLojaSaiComoParNulo() {
        Loja soLongitude = loja("Rede so longitude", "f3", null, -51.2);
        usuario(-30.0346, -51.2177, soLongitude);

        LojaProximaResponse resposta = daRede();

        assertThat(resposta.lojaId()).isEqualTo(soLongitude.getId());
        assertThat(resposta.latitude()).isNull();
        assertThat(resposta.longitude()).isNull();
    }

    @Test
    void asCoordenadasSaoDaLojaENaoOCepDoUsuario() {
        usuario(-30.0346, -51.2177, null);

        LojaProximaResponse resposta = daRede();

        assertThat(resposta.latitude()).isNotEqualTo(-30.0346);
        assertThat(resposta.longitude()).isNotEqualTo(-51.2177);
    }
}
