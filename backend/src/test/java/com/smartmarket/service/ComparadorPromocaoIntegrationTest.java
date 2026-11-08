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
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.PromocaoRepository;
import com.smartmarket.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Comparação da lista contra o repositório real (H2): a regra de vigência da promoção
 * (flag ativa) e o valor que entra na cesta quando a promoção e o preço coletado divergem.
 */
@SpringBootTest
@ActiveProfiles("test")
class ComparadorPromocaoIntegrationTest {

    private static final String EMAIL = "comparador-promocao@teste.com";

    @Autowired ComparadorService comparadorService;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired ListaCompraRepository listaCompraRepository;
    @Autowired ItemListaRepository itemListaRepository;
    @Autowired ProdutoRepository produtoRepository;
    @Autowired MercadoRepository mercadoRepository;
    @Autowired PrecoRepository precoRepository;
    @Autowired PromocaoRepository promocaoRepository;

    private final LocalDate hoje = LocalDate.now();
    private Usuario usuario;
    private ListaCompra lista;
    private Produto arroz;
    private Mercado master;

    @BeforeEach
    void setUp() {
        usuario = usuarioRepository.save(Usuario.builder().nome("Comparador").email(EMAIL)
            .senha("x").papel(Papel.USER).build());
        master = mercadoRepository.save(Mercado.builder().nome("Master CP").ativo(true).build());
        arroz = produtoRepository.save(Produto.builder().nome("Arroz CP 5kg").categoria("mercearia").build());
        lista = listaCompraRepository.save(ListaCompra.builder().nome("Compras").usuario(usuario).build());
        itemListaRepository.save(ItemLista.builder().listaCompra(lista).produto(arroz).quantidade(2).build());
        precoRepository.save(Preco.builder().produto(arroz).mercado(master).valor(new BigDecimal("26.90"))
            .coletadoEm(LocalDateTime.now().minusHours(1)).disponivel(true).build());
    }

    @AfterEach
    void limpar() {
        promocaoRepository.deleteAll(promocaoRepository.findAll().stream()
            .filter(p -> p.getProduto().getId().equals(arroz.getId())).toList());
        itemListaRepository.deleteAll(itemListaRepository.findByListaCompraId(lista.getId()));
        listaCompraRepository.deleteById(lista.getId());
        precoRepository.deleteAll(precoRepository.findByProdutoId(arroz.getId()));
        produtoRepository.deleteById(arroz.getId());
        mercadoRepository.deleteById(master.getId());
        usuarioRepository.deleteById(usuario.getId());
    }

    private void promocao(String valorPromocional, boolean ativa, LocalDate dataFim) {
        promocaoRepository.save(Promocao.builder().produto(arroz).mercado(master)
            .valorOriginal(new BigDecimal("29.90")).valorPromocional(new BigDecimal(valorPromocional))
            .dataInicio(hoje.minusDays(5)).dataFim(dataFim).ativa(ativa).build());
    }

    private BigDecimal totalDoMaster() {
        ComparacaoResponse resposta = comparadorService.comparar(EMAIL, lista.getId());
        MercadoComparacaoResponse doMaster = resposta.getComparacoes().stream()
            .filter(c -> c.getMercadoId().equals(master.getId())).findFirst().orElseThrow();
        assertThat(doMaster.getItensEncontrados()).isEqualTo(1);
        return doMaster.getValorTotal();
    }

    @Test
    void promocaoAtivaMaisBarataEntraNaCesta() {
        promocao("24.90", true, null);

        assertThat(totalDoMaster()).isEqualByComparingTo("49.80");   // 2 x 24,90
    }

    @Test
    void promocaoSemDataFimMarcadaInativaNaoEntraNaCesta() {
        promocao("24.90", false, null);   // a rede encerrou a oferta; o preço coletado voltou a 26,90

        assertThat(totalDoMaster()).isEqualByComparingTo("53.80");   // 2 x 26,90
    }

    @Test
    void promocaoMaisCaraQueOPrecoAtualNaoEncareceACesta() {
        promocao("30.00", true, null);   // promoção velha, acima do preço coletado hoje

        assertThat(totalDoMaster()).isEqualByComparingTo("53.80");   // vale o menor: 2 x 26,90
    }
}
