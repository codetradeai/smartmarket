package com.smartmarket.repository;

import com.smartmarket.model.Produto;
import com.smartmarket.service.ProdutoSpecification;
import com.smartmarket.util.NormalizadorTexto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Roda o backend/deploy/05_corrige_nome_normalizado.sql de verdade (H2) sobre linhas no
 * formato da carga original (nome_normalizado só em minúsculas, com acento) e confere que o
 * resultado é o mesmo que o Java grava. O script também foi validado em PostgreSQL 16 com as
 * 530 linhas do 03_carga.sql (350 corrigidas, 2ª execução sem alterações).
 */
@SpringBootTest
@ActiveProfiles("test")
class CorrigeNomeNormalizadoScriptTest {

    private static final Path SCRIPT = Path.of("deploy", "05_corrige_nome_normalizado.sql");

    @Autowired ProdutoRepository produtoRepository;
    @Autowired JdbcTemplate jdbc;

    private final List<Long> criados = new ArrayList<>();

    @AfterEach
    void limpar() {
        criados.forEach(produtoRepository::deleteById);
    }

    private Long inserirNoFormatoDaCarga(String nome) {
        Produto salvo = produtoRepository.save(Produto.builder().nome("tmp").categoria("mercearia").build());
        criados.add(salvo.getId());
        // a carga original gravava nome.lower(): minúsculo, mas com acento
        jdbc.update("update produto set nome = ?, nome_normalizado = ? where id = ?",
            nome, nome.toLowerCase(), salvo.getId());
        return salvo.getId();
    }

    /** Só o UPDATE: tira comentários e a transação, que não fazem parte do que se quer provar. */
    private String comandoDoScript() throws IOException {
        String sql = Files.readAllLines(SCRIPT).stream()
            .filter(l -> !l.trim().startsWith("--"))
            .collect(Collectors.joining("\n"))
            .replace("BEGIN;", "").replace("COMMIT;", "").trim();
        assertThat(sql).startsWith("UPDATE produto");
        // Única diferença de dialeto: o regexp_replace do PostgreSQL só troca a 1ª ocorrência sem a
        // flag 'g'; o do H2 troca todas e não aceita a flag.
        sql = sql.replace(", 'g')", ")");
        return sql.endsWith(";") ? sql.substring(0, sql.length() - 1) : sql;
    }

    private String normalizadoDe(Long id) {
        return jdbc.queryForObject("select nome_normalizado from produto where id = ?", String.class, id);
    }

    @Test
    void corrigeLinhasNoFormatoDaCargaIgualAoJava() throws IOException {
        List<String> nomes = List.of(
            "Pão Cacetinho Integral Pão Francês Zaffari",
            "Café em pó Melitta Tradicional 500g",
            "ÓLEO de SOJA Liza 900ml",
            "Feijão  Preto   Caldão 1kg",
            "Açúcar Refinado União 1kg",
            "Arroz Tio João 5kg");
        List<Long> ids = nomes.stream().map(this::inserirNoFormatoDaCarga).toList();

        int alteradas = jdbc.update(comandoDoScript());

        assertThat(alteradas).isGreaterThanOrEqualTo(nomes.size());
        for (int i = 0; i < nomes.size(); i++) {
            assertThat(normalizadoDe(ids.get(i))).isEqualTo(NormalizadorTexto.normalizar(nomes.get(i)));
        }
        assertThat(normalizadoDe(ids.get(0))).isEqualTo("pao cacetinho integral pao frances zaffari");
        assertThat(normalizadoDe(ids.get(3))).isEqualTo("feijao preto caldao 1kg");
    }

    @Test
    void ehIdempotenteESegundaExecucaoNaoAlteraNada() throws IOException {
        inserirNoFormatoDaCarga("Feijão Preto Caldão 1kg");

        jdbc.update(comandoDoScript());

        assertThat(jdbc.update(comandoDoScript())).isZero();
    }

    @Test
    void depoisDoScriptABuscaPorNomeAchaOsProdutosDaCarga() throws IOException {
        Long id = inserirNoFormatoDaCarga("Feijão Vermelho QZ Arbaza");
        String termo = ProdutoSpecification.normalizar("FEIJAO vermelho qz");
        List<Long> antes = jdbc.queryForList(
            "select id from produto where nome_normalizado like ?", Long.class, "%" + termo + "%");
        assertThat(antes).doesNotContain(id);

        jdbc.update(comandoDoScript());

        List<Long> depois = jdbc.queryForList(
            "select id from produto where nome_normalizado like ?", Long.class, "%" + termo + "%");
        assertThat(depois).contains(id);
    }
}
