package com.smartmarket.repository;

import com.smartmarket.model.Loja;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Preco;
import com.smartmarket.model.PrecoLoja;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Promocao;
import com.smartmarket.model.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Mapeamento JPA de Loja, PrecoLoja e dos campos novos de Usuario e Promocao (H2, create-drop). */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LojasPorCepEntidadesTest {

    private static final LocalDateTime T1 = LocalDateTime.of(2026, 1, 1, 10, 0);

    @Autowired LojaRepository lojaRepository;
    @Autowired PrecoLojaRepository precoLojaRepository;
    @Autowired MercadoRepository mercadoRepository;
    @Autowired ProdutoRepository produtoRepository;
    @Autowired PrecoRepository precoRepository;
    @Autowired PromocaoRepository promocaoRepository;
    @Autowired UsuarioRepository usuarioRepository;

    private Mercado mercado() {
        return mercadoRepository.save(Mercado.builder().nome("Rede Teste").ativo(true).build());
    }

    private Loja loja(Mercado mercado, String codigo) {
        return lojaRepository.save(Loja.builder().mercado(mercado).nome("Rede Teste " + codigo)
            .codigoExterno(codigo).build());
    }

    private Preco preco(Mercado mercado, String valor, LocalDateTime coletadoEm) {
        Produto produto = produtoRepository.save(Produto.builder().nome("Produto " + valor).categoria("mercearia").build());
        return precoRepository.save(Preco.builder().produto(produto).mercado(mercado)
            .valor(new BigDecimal(valor)).coletadoEm(coletadoEm).disponivel(true).build());
    }

    @Test
    void lojaNasceAtivaEReconhecidaComoPadraoPeloCodigo() {
        Mercado mercado = mercado();

        Loja padrao = loja(mercado, Loja.CODIGO_PADRAO);
        Loja filial = loja(mercado, "1560");

        assertThat(padrao.getAtiva()).isTrue();
        assertThat(padrao.getCreatedAt()).isNotNull();
        assertThat(padrao.ehPadrao()).isTrue();
        assertThat(filial.ehPadrao()).isFalse();
        assertThat(lojaRepository.findByMercadoIdAndCodigoExterno(mercado.getId(), "1560")).contains(filial);
        assertThat(lojaRepository.findByMercadoIdAndCodigoExterno(mercado.getId(), "inexistente")).isEmpty();
        assertThat(lojaRepository.findByMercadoIdOrderByIdAsc(mercado.getId())).containsExactly(padrao, filial);
    }

    @Test
    void mesmoCodigoExternoNoMesmoMercadoEhRejeitado() {
        Mercado mercado = mercado();
        loja(mercado, "1560");

        assertThatThrownBy(() -> lojaRepository.saveAndFlush(Loja.builder().mercado(mercado).nome("Outra")
            .codigoExterno("1560").build())).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void vinculoNasceVigenteDisponivelEComDatasPadrao() {
        Mercado mercado = mercado();
        Loja loja = loja(mercado, "1");
        Preco preco = preco(mercado, "10.00", T1);

        PrecoLoja vinculo = precoLojaRepository.save(PrecoLoja.builder().preco(preco).loja(loja).build());

        assertThat(vinculo.getDisponivel()).isTrue();
        assertThat(vinculo.estaVigente()).isTrue();
        assertThat(vinculo.getVigenteDesde()).isEqualTo(vinculo.getCreatedAt());
        assertThat(vinculo.getConfirmadoEm()).isEqualTo(vinculo.getVigenteDesde());
    }

    @Test
    void datasInformadasSaoRespeitadas() {
        Mercado mercado = mercado();
        Loja loja = loja(mercado, "1");
        Preco preco = preco(mercado, "10.00", T1);

        PrecoLoja vinculo = precoLojaRepository.save(PrecoLoja.builder().preco(preco).loja(loja)
            .vigenteDesde(T1).confirmadoEm(T1.plusHours(5)).build());

        assertThat(vinculo.getVigenteDesde()).isEqualTo(T1);
        assertThat(vinculo.getConfirmadoEm()).isEqualTo(T1.plusHours(5));
    }

    @Test
    void consultaDeVinculosCorrentesIgnoraOsFechadosEListaOHistoricoEmOrdem() {
        Mercado mercado = mercado();
        Loja loja = loja(mercado, "1");
        Preco preco = preco(mercado, "10.00", T1);
        PrecoLoja antigo = precoLojaRepository.save(PrecoLoja.builder().preco(preco).loja(loja)
            .vigenteDesde(T1).vigenteAte(T1.plusDays(1)).confirmadoEm(T1).build());
        PrecoLoja corrente = precoLojaRepository.save(PrecoLoja.builder().preco(preco).loja(loja)
            .vigenteDesde(T1.plusDays(1)).confirmadoEm(T1.plusDays(1)).build());

        assertThat(antigo.estaVigente()).isFalse();
        assertThat(precoLojaRepository.findByLojaIdAndVigenteAteIsNull(loja.getId())).containsExactly(corrente);
        assertThat(precoLojaRepository.findByPrecoIdOrderByVigenteDesdeAscIdAsc(preco.getId()))
            .containsExactly(antigo, corrente);
    }

    @Test
    void mesmoPrecoPodeValerEmVariasLojasSemDuplicarOValor() {
        Mercado mercado = mercado();
        Loja a = loja(mercado, "1");
        Loja b = loja(mercado, "2");
        Preco preco = preco(mercado, "10.00", T1);

        precoLojaRepository.save(PrecoLoja.builder().preco(preco).loja(a).build());
        precoLojaRepository.save(PrecoLoja.builder().preco(preco).loja(b).build());

        assertThat(precoRepository.findByProdutoIdAndMercadoId(preco.getProduto().getId(), mercado.getId())).hasSize(1);
        assertThat(precoLojaRepository.findByPrecoIdOrderByVigenteDesdeAscIdAsc(preco.getId())).hasSize(2);
    }

    @Test
    void usuarioAntigoFicaSemLocalizacaoEUsuarioNovoGuardaCepECoordenadas() {
        Usuario semCep = usuarioRepository.save(Usuario.builder().nome("Sem CEP").email("sem@teste.com")
            .senha("x").papel(Papel.USER).build());
        Loja loja = loja(mercado(), "1");
        Usuario comCep = usuarioRepository.save(Usuario.builder().nome("Com CEP").email("com@teste.com")
            .senha("x").papel(Papel.USER).cep("90010000").cidade("Porto Alegre").uf("RS")
            .latitude(-30.0277).longitude(-51.2287).lojaPreferida(loja).build());

        assertThat(semCep.getCep()).isNull();
        assertThat(semCep.getLojaPreferida()).isNull();
        assertThat(comCep.getCep()).isEqualTo("90010000");
        assertThat(comCep.getLojaPreferida()).isEqualTo(loja);
        assertThat(comCep.getLatitude()).isEqualTo(-30.0277);
    }

    @Test
    void excluirLocalizacaoLimpaOsCamposESegueComAContaIntacta() {
        Usuario usuario = usuarioRepository.save(Usuario.builder().nome("Com CEP").email("com@teste.com")
            .senha("x").papel(Papel.USER).cep("90010000").cidade("Porto Alegre").uf("RS")
            .latitude(-30.0277).longitude(-51.2287).lojaPreferida(loja(mercado(), "1")).build());

        usuario.setCep(null);
        usuario.setCidade(null);
        usuario.setUf(null);
        usuario.setLatitude(null);
        usuario.setLongitude(null);
        usuario.setLojaPreferida(null);
        usuarioRepository.saveAndFlush(usuario);

        Usuario lido = usuarioRepository.findByEmail("com@teste.com").orElseThrow();
        assertThat(lido.getCep()).isNull();
        assertThat(lido.getLojaPreferida()).isNull();
        assertThat(lido.getNome()).isEqualTo("Com CEP");
    }

    @Test
    void promocaoSemLojaValeParaARedeTodaEPromocaoComLojaFicaNaFilial() {
        Mercado mercado = mercado();
        Loja loja = loja(mercado, "1");
        Produto produto = produtoRepository.save(Produto.builder().nome("Arroz LP").categoria("mercearia").build());

        Promocao daRede = promocaoRepository.save(Promocao.builder().produto(produto).mercado(mercado)
            .valorOriginal(new BigDecimal("12.00")).valorPromocional(new BigDecimal("9.90"))
            .dataInicio(LocalDate.of(2026, 1, 1)).build());
        Promocao daLoja = promocaoRepository.save(Promocao.builder().produto(produto).mercado(mercado).loja(loja)
            .valorOriginal(new BigDecimal("12.00")).valorPromocional(new BigDecimal("8.90"))
            .dataInicio(LocalDate.of(2026, 1, 1)).build());

        assertThat(daRede.getLoja()).isNull();
        assertThat(daLoja.getLoja()).isEqualTo(loja);
    }
}
