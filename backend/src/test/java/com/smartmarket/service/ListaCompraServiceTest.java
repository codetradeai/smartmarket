package com.smartmarket.service;

import com.smartmarket.dto.lista.ItemListaRequest;
import com.smartmarket.dto.lista.ListaCompraRequest;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.*;
import com.smartmarket.repository.*;
import com.smartmarket.security.UsuarioAutenticado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ListaCompraServiceTest {
    @Mock ListaCompraRepository listaCompraRepository;
    @Mock ItemListaRepository itemListaRepository;
    @Mock ProdutoRepository produtoRepository;
    @Mock MercadoRepository mercadoRepository;
    @Mock PrecoRepository precoRepository;
    @Mock PromocaoRepository promocaoRepository;
    @Mock UsuarioAutenticado usuarioAutenticado;
    @InjectMocks ListaCompraService service;

    private Usuario usuario;
    private ListaCompra lista;
    private Produto produto;

    @BeforeEach
    void preparar() {
        usuario = Usuario.builder().id(1L).email("usuario@teste.com").build();
        produto = Produto.builder().id(9L).nome("Arroz").build();
        lista = ListaCompra.builder().id(3L).nome("Compras").usuario(usuario).build();
    }

    private void permitirAcesso() {
        when(listaCompraRepository.findById(3L)).thenReturn(Optional.of(lista));
        when(usuarioAutenticado.atual()).thenReturn(usuario);
    }

    @Test
    void listarMinhas_DeveRetornarApenasListasDoUsuario() {
        when(usuarioAutenticado.atual()).thenReturn(usuario);
        when(listaCompraRepository.findByUsuarioId(1L)).thenReturn(List.of(lista));
        assertThat(service.listarMinhas()).singleElement()
            .satisfies(resposta -> assertThat(resposta.getNome()).isEqualTo("Compras"));
    }

    @Test
    void criar_DevePersistirListaDoUsuario() {
        when(usuarioAutenticado.atual()).thenReturn(usuario);
        when(listaCompraRepository.save(any(ListaCompra.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        var request = ListaCompraRequest.builder().nome("  Mercado  ").build();
        assertThat(service.criar(request).getNome()).isEqualTo("Mercado");
        verify(listaCompraRepository).save(any(ListaCompra.class));
    }

    @Test
    void buscarPorId_DeOutroUsuario_DeveNegarAcesso() {
        when(listaCompraRepository.findById(3L)).thenReturn(Optional.of(lista));
        when(usuarioAutenticado.atual()).thenReturn(Usuario.builder().id(2L).build());
        assertThatThrownBy(() -> service.buscarPorId(3L))
            .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void renomear_DevePreservarItensEAlterarNome() {
        permitirAcesso();
        when(listaCompraRepository.save(lista)).thenReturn(lista);
        var request = ListaCompraRequest.builder().nome("  Festa  ").build();

        assertThat(service.renomear(3L, request).getNome()).isEqualTo("Festa");
        verify(listaCompraRepository).save(lista);
    }

    @Test
    void atualizarItem_DeveAlterarQuantidadeSemTrocarProduto() {
        permitirAcesso();
        var item = ItemLista.builder().id(7L).listaCompra(lista)
            .produto(produto).quantidade(2).build();
        lista.getItens().add(item);
        when(itemListaRepository.findByIdAndListaCompraId(7L, 3L))
            .thenReturn(Optional.of(item));
        var request = ItemListaRequest.builder().produtoId(9L).quantidade(5).build();

        assertThat(service.atualizarItem(3L, 7L, request).getItens())
            .singleElement().satisfies(response ->
                assertThat(response.getQuantidade()).isEqualTo(5));
        verify(itemListaRepository).save(item);
    }

    @Test
    void atualizarItem_DeveImpedirTrocaDeProduto() {
        permitirAcesso();
        var item = ItemLista.builder().id(7L).listaCompra(lista)
            .produto(produto).quantidade(2).build();
        when(itemListaRepository.findByIdAndListaCompraId(7L, 3L))
            .thenReturn(Optional.of(item));

        var request = ItemListaRequest.builder().produtoId(8L).quantidade(5).build();
        assertThatThrownBy(() -> service.atualizarItem(3L, 7L, request))
            .isInstanceOf(IllegalArgumentException.class);
        verify(itemListaRepository, never()).save(any());
    }

    @Test
    void atualizarItem_Inexistente_DeveRetornarErro() {
        permitirAcesso();
        when(itemListaRepository.findByIdAndListaCompraId(99L, 3L))
            .thenReturn(Optional.empty());
        var request = ItemListaRequest.builder().produtoId(9L).quantidade(5).build();
        assertThatThrownBy(() -> service.atualizarItem(3L, 99L, request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void removerLista_DeveExcluirApenasListaPropria() {
        permitirAcesso();
        service.removerLista(3L);
        verify(listaCompraRepository).delete(lista);
    }

    @Test
    void adicionarItem_ComProdutoInexistente_DeveRejeitar() {
        permitirAcesso();
        when(produtoRepository.findById(99L)).thenReturn(Optional.empty());
        var request = ItemListaRequest.builder().produtoId(99L).quantidade(1).build();
        assertThatThrownBy(() -> service.adicionarItem(3L, request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void listarMinhas_SemListas() {
        when(usuarioAutenticado.atual()).thenReturn(usuario);
        when(listaCompraRepository.findByUsuarioId(1L)).thenReturn(List.of());
        assertThat(service.listarMinhas()).isEmpty();
    }

    @Test void buscarPorId_Inexistente() {
        when(listaCompraRepository.findById(3L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.buscarPorId(3L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void criar_ComItemExistente() {
        when(usuarioAutenticado.atual()).thenReturn(usuario);
        when(produtoRepository.findById(9L)).thenReturn(Optional.of(produto));
        when(listaCompraRepository.save(any(ListaCompra.class))).thenAnswer(inv -> inv.getArgument(0));
        var r = ListaCompraRequest.builder().nome("Feira")
            .itens(List.of(ItemListaRequest.builder().produtoId(9L).quantidade(2).build())).build();
        assertThat(service.criar(r).getItens()).hasSize(1);
        verify(listaCompraRepository, times(2)).save(any(ListaCompra.class));
    }

    @Test void criar_ProdutoInexistenteNaoSalvaSegundaVez() {
        when(usuarioAutenticado.atual()).thenReturn(usuario);
        when(listaCompraRepository.save(any(ListaCompra.class))).thenAnswer(inv -> inv.getArgument(0));
        when(produtoRepository.findById(9L)).thenReturn(Optional.empty());
        var r = ListaCompraRequest.builder().nome("Feira")
            .itens(List.of(ItemListaRequest.builder().produtoId(9L).quantidade(2).build())).build();
        assertThatThrownBy(() -> service.criar(r)).isInstanceOf(ResourceNotFoundException.class);
        verify(listaCompraRepository, times(1)).save(any(ListaCompra.class));
    }

    @Test void adicionarItem_NovoComQuantidadeMinima() {
        permitirAcesso();
        when(produtoRepository.findById(9L)).thenReturn(Optional.of(produto));
        when(listaCompraRepository.save(lista)).thenReturn(lista);
        var r = ItemListaRequest.builder().produtoId(9L).quantidade(0).build();
        assertThat(service.adicionarItem(3L, r).getItens()).singleElement()
            .satisfies(item -> assertThat(item.getQuantidade()).isEqualTo(1));
    }

    @Test void adicionarItem_AtualizaProdutoJaPresente() {
        permitirAcesso();
        lista.getItens().add(ItemLista.builder().produto(produto).quantidade(1).build());
        when(produtoRepository.findById(9L)).thenReturn(Optional.of(produto));
        when(listaCompraRepository.save(lista)).thenReturn(lista);
        var r = ItemListaRequest.builder().produtoId(9L).quantidade(4).build();
        assertThat(service.adicionarItem(3L, r).getItens()).singleElement()
            .satisfies(item -> assertThat(item.getQuantidade()).isEqualTo(4));
    }

    @Test void removerItem_Existente() {
        permitirAcesso();
        lista.getItens().add(ItemLista.builder().produto(produto).quantidade(1).build());
        when(listaCompraRepository.save(lista)).thenReturn(lista);
        assertThat(service.removerItem(3L, 9L).getItens()).isEmpty();
    }

    @Test void removerItem_InexistenteNaoAlteraItens() {
        permitirAcesso();
        lista.getItens().add(ItemLista.builder().produto(produto).quantidade(1).build());
        when(listaCompraRepository.save(lista)).thenReturn(lista);
        assertThat(service.removerItem(3L, 10L).getItens()).hasSize(1);
    }

    @Test void compararCesta_SemMercados() {
        permitirAcesso();
        lista.getItens().add(ItemLista.builder().produto(produto).quantidade(1).build());
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of());
        assertThat(service.compararCesta(3L).getMercados()).isEmpty();
    }

    @Test void compararCesta_MercadoSemProdutoMarcaFalta() {
        permitirAcesso();
        lista.getItens().add(ItemLista.builder().produto(produto).quantidade(2).build());
        when(mercadoRepository.findByAtivoTrue())
            .thenReturn(List.of(Mercado.builder().id(11L).nome("Fort").ativo(true).build()));
        var resposta = service.compararCesta(3L);
        assertThat(resposta.getMercados()).singleElement()
            .satisfies(cesta -> {
                assertThat(cesta.getTotal()).isEqualByComparingTo(BigDecimal.ZERO);
                assertThat(cesta.getItensIndisponiveis()).containsExactly("Arroz");
            });
    }

    @Test void compararCesta_DoisMercadosCalculaEconomia() {
        permitirAcesso();
        lista.getItens().add(ItemLista.builder().produto(produto).quantidade(2).build());
        Mercado fort = Mercado.builder().id(11L).nome("Fort").ativo(true).build();
        Mercado outro = Mercado.builder().id(12L).nome("Outro").ativo(true).build();
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of(outro, fort));
        when(precoRepository.findByDisponivelTrueOrderByColetadoEmDescIdDesc())
            .thenReturn(List.of(
                Preco.builder().produto(produto).mercado(fort).valor(new BigDecimal("5")).build(),
                Preco.builder().produto(produto).mercado(outro).valor(new BigDecimal("7")).build()));
        var resposta = service.compararCesta(3L);
        assertThat(resposta.getMercados()).hasSize(2);
        assertThat(resposta.getEconomiaMaxima()).isEqualByComparingTo("4");
    }

    @Test void compararCesta_DoisMercadosMesmaOfertaSemEconomia() {
        permitirAcesso();
        lista.getItens().add(ItemLista.builder().produto(produto).quantidade(1).build());
        Mercado a = Mercado.builder().id(11L).nome("A").build();
        Mercado b = Mercado.builder().id(12L).nome("B").build();
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of(a, b));
        when(precoRepository.findByDisponivelTrueOrderByColetadoEmDescIdDesc())
            .thenReturn(List.of(
                Preco.builder().produto(produto).mercado(a).valor(new BigDecimal("5")).build(),
                Preco.builder().produto(produto).mercado(b).valor(new BigDecimal("5")).build()));
        assertThat(service.compararCesta(3L).getEconomiaMaxima()).isEqualByComparingTo("0");
    }

    @Test void compararCesta_ListaVaziaNaoComparaMercados() {
        permitirAcesso();
        var resposta = service.compararCesta(3L);
        assertThat(resposta.getMercados()).isEmpty();
        assertThat(resposta.getMercadoMaisBarato()).isNull();
        assertThat(resposta.getEconomiaMaxima()).isEqualByComparingTo("0");
        verifyNoInteractions(mercadoRepository, promocaoRepository);
    }

    @Test void compararCesta_MercadoIncompletoNaoVenceMercadoCompleto() {
        permitirAcesso();
        Produto segundo = Produto.builder().id(10L).nome("Feijao").build();
        lista.getItens().add(ItemLista.builder().produto(produto).quantidade(1).build());
        lista.getItens().add(ItemLista.builder().produto(segundo).quantidade(1).build());
        Mercado completo = Mercado.builder().id(11L).nome("Completo").build();
        Mercado parcial = Mercado.builder().id(12L).nome("Parcial").build();
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of(parcial, completo));
        when(precoRepository.findByDisponivelTrueOrderByColetadoEmDescIdDesc())
            .thenReturn(List.of(
                Preco.builder().produto(produto).mercado(completo).valor(new BigDecimal("10")).build(),
                Preco.builder().produto(segundo).mercado(completo).valor(new BigDecimal("10")).build(),
                Preco.builder().produto(produto).mercado(parcial).valor(new BigDecimal("1")).build()));
        var resposta = service.compararCesta(3L);
        assertThat(resposta.getMercadoMaisBarato().getMercadoId()).isEqualTo(11L);
        assertThat(resposta.getMercados()).extracting(c -> c.getMercadoId()).containsExactly(11L, 12L);
        assertThat(resposta.getEconomiaMaxima()).isEqualByComparingTo("0");
    }

    @Test void compararCesta_NenhumMercadoCompletoNaoElegeVencedor() {
        permitirAcesso();
        Produto segundo = Produto.builder().id(10L).nome("Feijao").build();
        lista.getItens().add(ItemLista.builder().produto(produto).quantidade(1).build());
        lista.getItens().add(ItemLista.builder().produto(segundo).quantidade(1).build());
        Mercado mercado = Mercado.builder().id(11L).nome("Parcial").build();
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of(mercado));
        when(precoRepository.findByDisponivelTrueOrderByColetadoEmDescIdDesc())
            .thenReturn(List.of(Preco.builder().produto(produto).mercado(mercado)
                .valor(new BigDecimal("3")).build()));
        var resposta = service.compararCesta(3L);
        assertThat(resposta.getMercadoMaisBarato()).isNull();
        assertThat(resposta.getEconomiaMaxima()).isEqualByComparingTo("0");
        assertThat(resposta.getMercados()).hasSize(1);
    }

    @Test void compararCesta_PromocaoAtivaReduzCesta() {
        permitirAcesso();
        lista.getItens().add(ItemLista.builder().produto(produto).quantidade(2).build());
        Mercado mercado = Mercado.builder().id(11L).nome("Fort").build();
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of(mercado));
        when(precoRepository.findByDisponivelTrueOrderByColetadoEmDescIdDesc())
            .thenReturn(List.of(Preco.builder().produto(produto).mercado(mercado)
                .valor(new BigDecimal("10")).build()));
        when(promocaoRepository.findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(
            eq(List.of(9L)), any(), any()))
            .thenReturn(List.of(Promocao.builder().produto(produto).mercado(mercado)
                .valorPromocional(new BigDecimal("7")).build()));
        var resposta = service.compararCesta(3L);
        assertThat(resposta.getMercadoMaisBarato().getTotal()).isEqualByComparingTo("14");
    }

    @Test void compararCesta_PromocaoInvalidaNaoAumentaPreco() {
        permitirAcesso();
        lista.getItens().add(ItemLista.builder().produto(produto).quantidade(1).build());
        Mercado mercado = Mercado.builder().id(11L).nome("Fort").build();
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of(mercado));
        when(precoRepository.findByDisponivelTrueOrderByColetadoEmDescIdDesc())
            .thenReturn(List.of(Preco.builder().produto(produto).mercado(mercado)
                .valor(new BigDecimal("10")).build()));
        when(promocaoRepository.findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(
            eq(List.of(9L)), any(), any()))
            .thenReturn(List.of(Promocao.builder().produto(produto).mercado(mercado)
                .valorPromocional(new BigDecimal("12")).build()));
        assertThat(service.compararCesta(3L).getMercadoMaisBarato().getTotal())
            .isEqualByComparingTo("10");
    }
}
