package com.smartmarket.service;

import com.smartmarket.dto.lista.ComparacaoResponse;
import com.smartmarket.model.ItemLista;
import com.smartmarket.model.ListaCompra;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Preco;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Promocao;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.ItemListaRepository;
import com.smartmarket.repository.ListaCompraRepository;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.PrecoRepository;
import com.smartmarket.repository.PromocaoRepository;
import com.smartmarket.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComparadorServiceTest {

    @Mock
    private ListaCompraRepository listaCompraRepository;

    @Mock
    private ItemListaRepository itemListaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PrecoRepository precoRepository;

    @Mock
    private PromocaoRepository promocaoRepository;

    @Mock
    private MercadoRepository mercadoRepository;

    @InjectMocks
    private ComparadorService comparadorService;

    private static final String EMAIL = "teste@email.com";

    private Usuario usuario;
    private ListaCompra lista;
    private Produto arroz;
    private Produto feijao;
    private Mercado fort;
    private Mercado carrefour;

    @BeforeEach
    void setUp() {
        usuario = Usuario.builder().id(1L).nome("Teste").email(EMAIL)
            .senha("$2a$10$hash").papel(Papel.USER).build();

        lista = ListaCompra.builder().id(1L).usuario(usuario).nome("Churrasco").build();

        arroz = Produto.builder().id(1L).nome("Arroz").categoria("mercearia").build();
        feijao = Produto.builder().id(2L).nome("Feijao").categoria("mercearia").build();

        fort = Mercado.builder().id(1L).nome("Fort").ativo(true).build();
        carrefour = Mercado.builder().id(2L).nome("Carrefour").ativo(true).build();

        lista.getItens().add(ItemLista.builder().id(10L).listaCompra(lista).produto(arroz).quantidade(1).build());
        lista.getItens().add(ItemLista.builder().id(11L).listaCompra(lista).produto(feijao).quantidade(1).build());
    }

    @Test
    void comparar_DoisMercados_DeveOrdenarMaisBaratoPrimeiro() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(itemListaRepository.findByListaCompraId(1L)).thenReturn(List.copyOf(lista.getItens()));
        when(precoRepository.findByProdutoIdInAndDisponivelTrueOrderByColetadoEmDesc(any()))
            .thenReturn(List.of(
                preco(1L, 1L, "5.00"),
                preco(2L, 1L, "4.00"),
                preco(1L, 2L, "6.00")));
        when(promocaoRepository.findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(
            any(), any(), any())).thenReturn(List.of());
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of(fort, carrefour));

        ComparacaoResponse response = comparadorService.comparar(EMAIL, 1L);

        assertThat(response.getComparacoes()).hasSize(2);
        assertThat(response.getComparacoes().get(0).getMercadoNome()).isEqualTo("Fort");
        assertThat(response.getComparacoes().get(0).getValorTotal()).isEqualByComparingTo("9.00");
        assertThat(response.getComparacoes().get(0).getMaisBarato()).isTrue();
        assertThat(response.getMercadoMaisBarato().getMercadoNome()).isEqualTo("Fort");
    }

    @Test
    void comparar_ComPromocaoAtiva_DeveUsarValorPromocional() {
        Promocao promocao = Promocao.builder()
            .produto(arroz).mercado(fort)
            .valorOriginal(new BigDecimal("5.00"))
            .valorPromocional(new BigDecimal("4.00"))
            .dataInicio(LocalDate.now().minusDays(1))
            .dataFim(LocalDate.now().plusDays(1))
            .coletadoEm(LocalDateTime.now())
            .build();

        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(itemListaRepository.findByListaCompraId(1L)).thenReturn(List.copyOf(lista.getItens()));
        when(precoRepository.findByProdutoIdInAndDisponivelTrueOrderByColetadoEmDesc(any()))
            .thenReturn(List.of(
                preco(1L, 1L, "5.00"),
                preco(2L, 1L, "4.00")));
        when(promocaoRepository.findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(
            any(), any(), any())).thenReturn(List.of(promocao));
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of(fort));

        ComparacaoResponse response = comparadorService.comparar(EMAIL, 1L);

        assertThat(response.getComparacoes().get(0).getValorTotal()).isEqualByComparingTo("8.00");
    }

    @Test
    void comparar_ComPromocaoVencida_DeveIgnorarPromocao() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(itemListaRepository.findByListaCompraId(1L)).thenReturn(List.copyOf(lista.getItens()));
        when(precoRepository.findByProdutoIdInAndDisponivelTrueOrderByColetadoEmDesc(any()))
            .thenReturn(List.of(
                preco(1L, 1L, "5.00"),
                preco(2L, 1L, "4.00")));
        when(promocaoRepository.findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(
            any(), any(), any())).thenReturn(List.of());
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of(fort));

        ComparacaoResponse response = comparadorService.comparar(EMAIL, 1L);

        assertThat(response.getComparacoes().get(0).getValorTotal()).isEqualByComparingTo("9.00");
    }

    @Test
    void comparar_ProdutoSemPreco_DeveMarcarIncompletoEIrParaOFim() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(itemListaRepository.findByListaCompraId(1L)).thenReturn(List.copyOf(lista.getItens()));
        when(precoRepository.findByProdutoIdInAndDisponivelTrueOrderByColetadoEmDesc(any()))
            .thenReturn(List.of(
                preco(1L, 1L, "5.00"),
                preco(2L, 1L, "4.00"),
                preco(1L, 2L, "6.00")));
        when(promocaoRepository.findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(
            any(), any(), any())).thenReturn(List.of());
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of(carrefour, fort));

        ComparacaoResponse response = comparadorService.comparar(EMAIL, 1L);

        var incompleto = response.getComparacoes().get(resultado.getComparacoes().size() - 1);
        assertThat(incompleto.getMercadoNome()).isEqualTo("Carrefour");
        assertThat(incompleto.getCompleto()).isFalse();
        assertThat(incompleto.getItensIndisponiveis()).isEqualTo(1);
        assertThat(incompleto.getValorTotal()).isEqualByComparingTo("6.00");
        assertThat(incompleto.getMaisBarato()).isFalse();
    }

    @Test
    void comparar_ListaVazia_DeveRetornarSemComparacoes() {
        ListaCompra vazia = ListaCompra.builder().id(2L).usuario(usuario).nome("Vazia").build();

        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(2L, 1L)).thenReturn(Optional.of(vazia));
        when(itemListaRepository.findByListaCompraId(2L)).thenReturn(List.of());

        ComparacaoResponse response = comparadorService.comparar(EMAIL, 2L);

        assertThat(response.getComparacoes()).isEmpty();
        assertThat(response.getMercadoMaisBarato()).isNull();
        assertThat(response.getTotalItens()).isZero();
        verifyNoInteractions(precoRepository, promocaoRepository, mercadoRepository);
    }

    @Test
    void comparar_ListaDeOutroUsuario_DeveLancarErro() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(99L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> comparadorService.comparar(EMAIL, 99L))
            .isInstanceOf(com.smartmarket.exception.ListaNaoEncontradaException.class);
    }

    private Preco preco(Long produtoId, Long mercadoId, String valor) {
        return Preco.builder()
            .produto(Produto.builder().id(produtoId).build())
            .mercado(Mercado.builder().id(mercadoId).build())
            .valor(new BigDecimal(valor))
            .disponivel(true)
            .coletadoEm(LocalDateTime.now())
            .build();
    }
}
