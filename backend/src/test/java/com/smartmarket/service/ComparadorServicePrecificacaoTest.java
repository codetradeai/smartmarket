package com.smartmarket.service;

import com.smartmarket.dto.lista.ComparacaoResponse;
import com.smartmarket.dto.lista.MercadoComparacaoResponse;
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
import org.junit.jupiter.api.DisplayName;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Casos de precificacao portados de ListaCompraServiceCompararCestaTest, que
 * ficou sem compilar quando a comparacao saiu do ListaCompraService e virou
 * ComparadorService.comparar(email, listaId).
 *
 * Complementa ComparadorServiceTest, que cobre ordenacao basica, promocao
 * ativa/vencida, produto sem preco, lista vazia e lista de outro usuario.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ComparadorService - regras de precificacao da cesta")
class ComparadorServicePrecificacaoTest {

    @Mock private ListaCompraRepository listaCompraRepository;
    @Mock private ItemListaRepository itemListaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private PrecoRepository precoRepository;
    @Mock private PromocaoRepository promocaoRepository;
    @Mock private MercadoRepository mercadoRepository;

    @InjectMocks private ComparadorService comparadorService;

    private static final String EMAIL = "usuario@teste.com";

    private Usuario usuario;
    private ListaCompra lista;
    private Produto arroz;
    private Produto feijao;
    private Mercado mercadoA;
    private Mercado mercadoB;
    private Mercado mercadoC;

    @BeforeEach
    void preparar() {
        usuario = Usuario.builder().id(1L).nome("Teste").email(EMAIL)
            .senha("$2a$10$hash").papel(Papel.USER).build();
        lista = ListaCompra.builder().id(3L).nome("Compras").usuario(usuario).build();

        arroz = Produto.builder().id(9L).nome("Arroz").build();
        feijao = Produto.builder().id(10L).nome("Feijao").build();

        mercadoA = Mercado.builder().id(11L).nome("A").ativo(true).build();
        mercadoB = Mercado.builder().id(12L).nome("B").ativo(true).build();
        mercadoC = Mercado.builder().id(13L).nome("C").ativo(true).build();
    }

    // ---------- helpers ----------

    private void item(Produto produto, int quantidade) {
        lista.getItens().add(ItemLista.builder()
            .id(produto.getId() * 10).listaCompra(lista)
            .produto(produto).quantidade(quantidade).build());
    }

    private static Preco preco(Produto produto, Mercado mercado, String valor) {
        return Preco.builder()
            .produto(produto).mercado(mercado)
            .valor(new BigDecimal(valor)).disponivel(true)
            .coletadoEm(LocalDateTime.now())
            .build();
    }

    private static Promocao promocao(Produto produto, Mercado mercado, String valorPromocional) {
        return Promocao.builder()
            .produto(produto).mercado(mercado)
            .valorOriginal(new BigDecimal("999.00"))
            .valorPromocional(new BigDecimal(valorPromocional))
            .dataInicio(LocalDate.now().minusDays(1))
            .dataFim(LocalDate.now().plusDays(1))
            .coletadoEm(LocalDateTime.now())
            .build();
    }

    /** Liga os mocks comuns. Chamar depois de montar itens/mercados. */
    private void cenario(List<Mercado> mercados, List<Preco> precos, List<Promocao> promocoes) {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(3L, 1L)).thenReturn(Optional.of(lista));
        when(itemListaRepository.findByListaCompraId(3L)).thenReturn(List.copyOf(lista.getItens()));
        when(precoRepository.findByProdutoIdInAndDisponivelTrueOrderByColetadoEmDesc(any()))
            .thenReturn(precos);
        when(promocaoRepository.findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(
            any(), any(), any())).thenReturn(promocoes);
        when(mercadoRepository.findByAtivoTrue()).thenReturn(mercados);
    }

    private static List<Long> idsDosMercados(ComparacaoResponse resposta) {
        return resposta.getComparacoes().stream()
            .map(MercadoComparacaoResponse::getMercadoId).toList();
    }

    // ---------- casos ----------

    @Test
    @DisplayName("Calcula o total exato de cada mercado e ordena do mais barato ao mais caro")
    void calculaTotaisExatosEOrdenaPorMenorTotal() {
        item(arroz, 2);
        item(feijao, 3);
        cenario(
            List.of(mercadoA, mercadoB, mercadoC),
            List.of(
                preco(arroz, mercadoA, "5"), preco(feijao, mercadoA, "2"),
                preco(arroz, mercadoB, "4"), preco(feijao, mercadoB, "3"),
                preco(arroz, mercadoC, "6"), preco(feijao, mercadoC, "1")),
            List.of());

        ComparacaoResponse resposta = comparadorService.comparar(EMAIL, 3L);

        // A = 2*5 + 3*2 = 16 | B = 2*4 + 3*3 = 17 | C = 2*6 + 3*1 = 15
        assertThat(idsDosMercados(resposta)).containsExactly(13L, 11L, 12L);
        assertThat(resposta.getComparacoes()).extracting(MercadoComparacaoResponse::getValorTotal)
            .usingElementComparator(BigDecimal::compareTo)
            .containsExactly(new BigDecimal("15"), new BigDecimal("16"), new BigDecimal("17"));
        assertThat(resposta.getMercadoMaisBarato().getMercadoId()).isEqualTo(13L);
    }

    @Test
    @DisplayName("Usa apenas o preco mais recente do produto em cada mercado")
    void precoMaisRecentePrevaleceSobreOAntigo() {
        item(arroz, 1);
        // O repositorio devolve ordenado por coletadoEm desc: o primeiro vence.
        cenario(
            List.of(mercadoA),
            List.of(preco(arroz, mercadoA, "7"), preco(arroz, mercadoA, "50")),
            List.of());

        ComparacaoResponse resposta = comparadorService.comparar(EMAIL, 3L);

        assertThat(resposta.getComparacoes().get(0).getValorTotal()).isEqualByComparingTo("7");
    }

    @Test
    @DisplayName("Promocao vale apenas no mercado em que foi cadastrada")
    void promocaoAplicadaSomenteNoMercadoDaPromocao() {
        item(arroz, 1);
        cenario(
            List.of(mercadoA, mercadoB),
            List.of(preco(arroz, mercadoA, "10"), preco(arroz, mercadoB, "10")),
            List.of(promocao(arroz, mercadoA, "4")));

        ComparacaoResponse resposta = comparadorService.comparar(EMAIL, 3L);

        assertThat(resposta.getComparacoes()).hasSize(2);
        assertThat(resposta.getMercadoMaisBarato().getMercadoId()).isEqualTo(11L);
        assertThat(resposta.getMercadoMaisBarato().getValorTotal()).isEqualByComparingTo("4");
        // O mercado B nao tem promocao e mantem o preco cheio.
        assertThat(resposta.getComparacoes().get(1).getValorTotal()).isEqualByComparingTo("10");
    }

    @Test
    @DisplayName("Promocao com valor igual ao preco normal e aceita e nao altera o total")
    void promocaoIgualAoPrecoMantemTotal() {
        item(arroz, 2);
        cenario(
            List.of(mercadoA),
            List.of(preco(arroz, mercadoA, "8")),
            List.of(promocao(arroz, mercadoA, "8")));

        ComparacaoResponse resposta = comparadorService.comparar(EMAIL, 3L);

        assertThat(resposta.getComparacoes().get(0).getValorTotal()).isEqualByComparingTo("16");
    }

    @Test
    @DisplayName("Mercado sem o produto fica incompleto e vai para o fim, mesmo sendo mais barato")
    void mercadoIncompletoVaiParaOFim() {
        item(arroz, 1);
        item(feijao, 1);
        cenario(
            List.of(mercadoA, mercadoB),
            List.of(
                preco(arroz, mercadoA, "10"), preco(feijao, mercadoA, "10"),
                preco(arroz, mercadoB, "1")),
            List.of());

        ComparacaoResponse resposta = comparadorService.comparar(EMAIL, 3L);

        // B soma 1 e A soma 20, mas B so tem 1 dos 2 itens.
        assertThat(idsDosMercados(resposta)).containsExactly(11L, 12L);
        assertThat(resposta.getComparacoes().get(0).getCompleto()).isTrue();
        assertThat(resposta.getComparacoes().get(1).getCompleto()).isFalse();
        assertThat(resposta.getMercadoMaisBarato().getMercadoId()).isEqualTo(11L);
    }

    @Test
    @DisplayName("Com varias promocoes vigentes do mesmo produto no mesmo mercado, usa a menor")
    void variasPromocoesNoMesmoMercadoUsaAMenor() {
        item(arroz, 1);
        cenario(
            List.of(mercadoA),
            List.of(preco(arroz, mercadoA, "10")),
            List.of(promocao(arroz, mercadoA, "7"), promocao(arroz, mercadoA, "3")));

        ComparacaoResponse resposta = comparadorService.comparar(EMAIL, 3L);

        assertThat(resposta.getComparacoes().get(0).getValorTotal()).isEqualByComparingTo("3");
    }

    @Test
    @DisplayName("Empate de totais: desempata por id de mercado, ordem crescente")
    void empateDeTotais_DesempataPorMercadoId_OrdemCrescente() {
        item(arroz, 1);
        cenario(
            List.of(mercadoA, mercadoB),
            List.of(preco(arroz, mercadoA, "10"), preco(arroz, mercadoB, "10")),
            List.of());

        ComparacaoResponse resposta = comparadorService.comparar(EMAIL, 3L);

        assertThat(idsDosMercados(resposta)).containsExactly(11L, 12L);
    }

    @Test
    @DisplayName("Empate de totais: o resultado nao depende da ordem devolvida pelo repositorio")
    void empateDeTotais_DesempataPorMercadoId_OrdemInvertida() {
        item(arroz, 1);
        // Mesmo cenario do teste anterior, mas o repositorio devolve B antes de A.
        cenario(
            List.of(mercadoB, mercadoA),
            List.of(preco(arroz, mercadoA, "10"), preco(arroz, mercadoB, "10")),
            List.of());

        ComparacaoResponse resposta = comparadorService.comparar(EMAIL, 3L);

        assertThat(idsDosMercados(resposta)).containsExactly(11L, 12L);
    }

    @Test
    @DisplayName("A confirmar: promocao de valor zero zera o item na comparacao (comportamento atual)")
    void promocaoComValorZero_ComportamentoAtual_AConfirmar() {
        // Caracterizacao, nao especificacao: herdado do teste antigo, onde o
        // autor marcou "a confirmar". Documenta o que o codigo faz hoje; se a
        // regra for rejeitar promocao zerada, este teste muda junto.
        item(arroz, 1);
        cenario(
            List.of(mercadoA),
            List.of(preco(arroz, mercadoA, "10")),
            List.of(promocao(arroz, mercadoA, "0")));

        ComparacaoResponse resposta = comparadorService.comparar(EMAIL, 3L);

        assertThat(resposta.getComparacoes().get(0).getValorTotal()).isEqualByComparingTo("0");
    }
}
