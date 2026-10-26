package com.smartmarket.service;

import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.*;
import com.smartmarket.security.UsuarioAutenticado;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {
    @Mock ProdutoRepository produtos;
    @Mock MercadoRepository mercados;
    @Mock UsuarioRepository usuarios;
    @Mock AlertaRepository alertas;
    @Mock PromocaoRepository promocoes;
    @Mock UsuarioAutenticado autenticado;
    @InjectMocks AdminService service;

    private Usuario usuario(long id, Papel papel) {
        return Usuario.builder().id(id).nome("Pessoa").email("pessoa@example.com").papel(papel).build();
    }

    @Test void painel_ContaIndicadores() {
        when(produtos.count()).thenReturn(10L);
        when(mercados.count()).thenReturn(3L);
        when(mercados.countByAtivoTrue()).thenReturn(2L);
        when(usuarios.count()).thenReturn(20L);
        when(alertas.countByAtivoTrue()).thenReturn(4L);
        when(promocoes.countByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(1L);
        var painel = service.painel();
        assertThat(painel.getProdutos()).isEqualTo(10);
        assertThat(painel.getMercadosAtivos()).isEqualTo(2);
        assertThat(painel.getPromocoesVigentes()).isEqualTo(1);
    }

    @Test void listarUsuarios_RespeitaPaginacao() {
        var pagina = PageRequest.of(0, 5);
        when(usuarios.findAll(pagina)).thenReturn(new PageImpl<>(List.of(usuario(1L, Papel.USER))));
        assertThat(service.listarUsuarios(pagina).getContent()).hasSize(1);
    }

    @Test void alterarPapel_EntradaInvalida() {
        assertThatThrownBy(() -> service.alterarPapel(1L, "GESTOR"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.alterarPapel(1L, null))
            .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(usuarios);
    }

    @Test void alterarPapel_UsuarioInexistente() {
        when(usuarios.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.alterarPapel(9L, "ADMIN"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void alterarPapel_MesmoPapelNaoGrava() {
        when(usuarios.findById(1L)).thenReturn(Optional.of(usuario(1L, Papel.USER)));
        assertThat(service.alterarPapel(1L, " user ").getPapel()).isEqualTo("USER");
        verify(usuarios, never()).save(any());
    }

    @Test void alterarPapel_ProprioPapelBloqueado() {
        when(usuarios.findById(1L)).thenReturn(Optional.of(usuario(1L, Papel.USER)));
        when(autenticado.atual()).thenReturn(usuario(1L, Papel.ADMIN));
        assertThatThrownBy(() -> service.alterarPapel(1L, "ADMIN"))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("proprio");
    }

    @Test void alterarPapel_UltimoAdminProtegido() {
        when(usuarios.findById(1L)).thenReturn(Optional.of(usuario(1L, Papel.ADMIN)));
        when(autenticado.atual()).thenReturn(usuario(2L, Papel.ADMIN));
        when(usuarios.countByPapel(Papel.ADMIN)).thenReturn(1L);
        assertThatThrownBy(() -> service.alterarPapel(1L, "USER"))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("administrador");
    }

    @Test void alterarPapel_AdminPodeAlterarOutroUsuario() {
        when(usuarios.findById(1L)).thenReturn(Optional.of(usuario(1L, Papel.USER)));
        when(autenticado.atual()).thenReturn(usuario(2L, Papel.ADMIN));
        when(usuarios.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        assertThat(service.alterarPapel(1L, "ADMIN").getPapel()).isEqualTo("ADMIN");
        verify(usuarios).save(argThat(u -> u.getPapel() == Papel.ADMIN));
    }
}
