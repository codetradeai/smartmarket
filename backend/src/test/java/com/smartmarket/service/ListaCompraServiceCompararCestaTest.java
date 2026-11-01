package com.smartmarket.service;

import com.smartmarket.dto.lista.ComparacaoCestaResponse;
import com.smartmarket.model.*;
import com.smartmarket.repository.*;
import com.smartmarket.security.UsuarioAutenticado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Comparador de precos - ListaCompraService.compararCesta")
class ListaCompraServiceCompararCestaTest {
    @Mock ListaCompraRepository listaCompraRepository;
    @Mock ItemListaRepository itemListaRepository;
    @Mock ProdutoRepository produtoRepository;
    @Mock MercadoRepository mercadoRepository;
    @Mock PrecoRepository precoRepository;
    @Mock PromocaoRepository promocaoRepository;
    @Mock UsuarioAutenticado usuarioAutenticado;
    @InjectMocks ListaCompraService service;

    private ListaCompra lista;
    private Produto arroz;
    private Produto feijao;
    private Mercado mercadoA;
    private Mercado mercadoB;
    private Mercado mercadoC;

    @BeforeEach
    void preparar() {
        Usuario usuario = Usuario.builder().id(1L).email("usuario@teste.com").build();
        lista = ListaCompra.builder().id(3L).nome("Compras").usuario(usuario).build();
        arroz = Produto.builder().id(9L).nome("Arroz").build();
        feijao = Produto.builder().id(10L).nome("Feijao").build();
        mercadoA = Mercado.builder().id(11L).nome("A").ativo(true).build();
        mercadoB = Mercado.builder().id(12L).nome("B").ativo(true).build();
        mercadoC = Mercado.builder().id(13L).nome("C").ativo(true).build();

        when(listaCompraRepository.findById(3L)).thenReturn(Optional.of(lista));
        when(usuarioAutenticado.atual()).thenReturn(usuario);
    }

    private void adicionarItem(Produto produto, int quantidade) {
        lista.getItens().add(ItemLista.builder().produto(produto).quantidade(quantidade).build());
    }

    private static Preco preco(Produto produto, Mercado mercado, String valor) {
        return Preco.builder().produto(produto).mercado(mercado).valor(new BigDecimal(valor)).build();
    }

    private static Promocao promocao(Produto produto, Mercado mercado, String valorPromocional) {
        return Promocao.builder().produto(produto).mercado(mercado)
            .valorPromocional(new BigDecimal(valorPromocional)).build();
    }

    private void mercadosAtivos(Mercado... mercados) {
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of(mercados));
    }

    private void precosDisponiveis(Preco... precos) {
        when(precoRepository.findByDisponivelTrueOrderByColetadoEmDescIdDesc()).thenReturn(List.of(precos));
    }

    private void promocoesAtivas(Promocao... promocoes) {
        when(promocaoRepository.findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(
            any(), any(), any())).thenReturn(List.of(promocoes));
    }

    private static List<Long> idsDosMercados(ComparacaoCestaResponse resposta) {
        return resposta.getMercados().stream().map(cesta -> cesta.getMercadoId()).toList();
    }

    @Test
    @DisplayName("Calcula o total exato de cada mercado e ordena do mais barato ao mais caro")
    void calculaTotaisExatosEOrdenaPorMenorTotal() {
        adicionarItem(arroz, 2);
        adicionarItem(feijao, 3);
        mercadosAtivos(mercadoA, mercadoB, mercadoC);
        precosDisponiveis(
            preco(arroz, mercadoA, "5"), preco(feijao, mercadoA, "2"),
            preco(arroz, mercadoB, "4"), preco(feijao, mercadoB, "3"),
            preco(arroz, mercadoC, "6"), preco(feijao, mercadoC, "1"));

        var resposta = service.compararCesta(3L);

        assertThat(idsDosMercados(resposta)).containsExactly(13L, 11L, 12L);
        assertThat(resposta.getMercados()).extracting(cesta -> cesta.getTotal())
            .usingElementComparator(BigDecimal::compareTo)
            .containsExactly(new BigDecimal("15"), new BigDecimal("16"), new BigDecimal("17"));
        assertThat(resposta.getMercadoMaisBarato().getMercadoId()).isEqualTo(13L);
        assertThat(resposta.getEconomiaMaxima()).isEqualByComparingTo("2");
        assertThat(resposta.getTotalItensDistintos()).isEqualTo(2);
    }

    // Os dois testes de empate registram o comportamento ATUAL (desempate por mercadoId, ver o
    // thenComparing em ListaCompraService.compararCesta). O criterio oficial ainda nao foi definido
    // pelo grupo (CENARIOS-DE-TESTE.md, 4.4); se ele mudar, ajustar estes testes.
    @Test
    @DisplayName("Empate de totais: vence o mercado de menor id quando o repositorio lista o menor primeiro")
    void empateDeTotais_DesempataPorMercadoId_OrdemCrescente() {
        adicionarItem(arroz, 1);
        mercadosAtivos(mercadoA, mercadoB);
        precosDisponiveis(preco(arroz, mercadoA, "5"), preco(arroz, mercadoB, "5"));

        var resposta = service.compararCesta(3L);

        assertThat(idsDosMercados(resposta)).containsExactly(11L, 12L);
        assertThat(resposta.getMercadoMaisBarato().getMercadoId()).isEqualTo(11L);
        assertThat(resposta.getEconomiaMaxima()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("Empate de totais: o resultado nao depende da ordem devolvida pelo repositorio")
    void empateDeTotais_DesempataPorMercadoId_OrdemInvertida() {
        adicionarItem(arroz, 1);
        mercadosAtivos(mercadoB, mercadoA);
        precosDisponiveis(preco(arroz, mercadoB, "5"), preco(arroz, mercadoA, "5"));

        var resposta = service.compararCesta(3L);

        assertThat(idsDosMercados(resposta)).containsExactly(11L, 12L);
        assertThat(resposta.getMercadoMaisBarato().getMercadoId()).isEqualTo(11L);
    }

    @Test
    @DisplayName("Usa apenas o preco mais recente do produto em cada mercado")
    void precoMaisRecentePrevaleceSobreOAntigo() {
        adicionarItem(arroz, 1);
        mercadosAtivos(mercadoA);
        // O repositorio devolve do mais recente para o mais antigo.
        precosDisponiveis(preco(arroz, mercadoA, "8"), preco(arroz, mercadoA, "5"));

        var resposta = service.compararCesta(3L);

        assertThat(resposta.getMercadoMaisBarato().getTotal()).isEqualByComparingTo("8");
    }

    @Test
    @DisplayName("Promocao vale apenas no mercado em que foi cadastrada")
    void promocaoAplicadaSomenteNoMercadoDaPromocao() {
        adicionarItem(arroz, 1);
        mercadosAtivos(mercadoA, mercadoB);
        precosDisponiveis(preco(arroz, mercadoA, "10"), preco(arroz, mercadoB, "10"));
        promocoesAtivas(promocao(arroz, mercadoA, "6"));

        var resposta = service.compararCesta(3L);

        assertThat(idsDosMercados(resposta)).containsExactly(11L, 12L);
        assertThat(resposta.getMercados().get(0).getTotal()).isEqualByComparingTo("6");
        assertThat(resposta.getMercados().get(1).getTotal()).isEqualByComparingTo("10");
        assertThat(resposta.getEconomiaMaxima()).isEqualByComparingTo("4");
    }

    @Test
    @DisplayName("Promocao com valor igual ao preco normal e aceita e nao altera o total")
    void promocaoIgualAoPrecoMantemTotal() {
        adicionarItem(arroz, 2);
        mercadosAtivos(mercadoA);
        precosDisponiveis(preco(arroz, mercadoA, "10"));
        promocoesAtivas(promocao(arroz, mercadoA, "10"));

        assertThat(service.compararCesta(3L).getMercadoMaisBarato().getTotal())
            .isEqualByComparingTo("20");
    }

    @Test
    @DisplayName("Com varias promocoes ativas do mesmo produto no mesmo mercado, usa a menor")
    void variasPromocoesNoMesmoMercadoUsaAMenor() {
        adicionarItem(arroz, 1);
        mercadosAtivos(mercadoA);
        precosDisponiveis(preco(arroz, mercadoA, "10"));
        promocoesAtivas(promocao(arroz, mercadoA, "8"), promocao(arroz, mercadoA, "6"));

        assertThat(service.compararCesta(3L).getMercadoMaisBarato().getTotal())
            .isEqualByComparingTo("6");
    }

    // A CONFIRMAR: o codigo aceita promocao de valor zero (compareTo(ZERO) >= 0), deixando o item
    // gratuito na comparacao. Este teste registra o comportamento atual, nao uma regra aprovada.
    @Test
    @DisplayName("A confirmar: promocao de valor zero zera o item na comparacao (comportamento atual)")
    void promocaoComValorZero_ComportamentoAtual_AConfirmar() {
        adicionarItem(arroz, 3);
        mercadosAtivos(mercadoA);
        precosDisponiveis(preco(arroz, mercadoA, "10"));
        promocoesAtivas(promocao(arroz, mercadoA, "0"));

        assertThat(service.compararCesta(3L).getMercadoMaisBarato().getTotal())
            .isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("Economia maxima e a diferenca entre o mercado completo mais caro e o mais barato")
    void economiaComTresMercadosCompletos() {
        adicionarItem(arroz, 1);
        mercadosAtivos(mercadoA, mercadoB, mercadoC);
        precosDisponiveis(
            preco(arroz, mercadoA, "15"), preco(arroz, mercadoB, "17"), preco(arroz, mercadoC, "20"));

        var resposta = service.compararCesta(3L);

        assertThat(idsDosMercados(resposta)).containsExactly(11L, 12L, 13L);
        assertThat(resposta.getEconomiaMaxima()).isEqualByComparingTo("5");
    }

    @Test
    @DisplayName("Mercado incompleto nao entra no calculo da economia, mesmo sendo o mais caro")
    void economiaIgnoraMercadoIncompleto() {
        adicionarItem(arroz, 1);
        adicionarItem(feijao, 1);
        mercadosAtivos(mercadoA, mercadoB, mercadoC);
        precosDisponiveis(
            preco(arroz, mercadoA, "5"), preco(feijao, mercadoA, "5"),
            preco(arroz, mercadoB, "6"), preco(feijao, mercadoB, "6"),
            preco(arroz, mercadoC, "50"));

        var resposta = service.compararCesta(3L);

        assertThat(idsDosMercados(resposta)).containsExactly(11L, 12L, 13L);
        assertThat(resposta.getEconomiaMaxima()).isEqualByComparingTo("2");
        assertThat(resposta.getMercados().get(2).getItensIndisponiveis()).containsExactly("Feijao");
    }
}
