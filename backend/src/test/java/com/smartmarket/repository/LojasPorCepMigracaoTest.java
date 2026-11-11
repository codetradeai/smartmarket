package com.smartmarket.repository;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Roda o backend/deploy/06_lojas_por_cep.sql de verdade (H2 em modo PostgreSQL) sobre o schema do
 * 01_schema.sql com dados no formato legado (preço histórico por mercado, sem loja) e confere:
 * nada se perde nem se duplica, a segunda execução não altera nada, cada preço antigo ganha um
 * vínculo com a loja padrão do mercado e o histórico de vigência fica encadeado.
 * Sem contexto Spring: o schema é montado só com os scripts de deploy.
 */
class LojasPorCepMigracaoTest {

    private static final Path SCHEMA = Path.of("deploy", "01_schema.sql");
    private static final Path MIGRATION = Path.of("deploy", "06_lojas_por_cep.sql");
    private static final Path COPIA_EM_DATABASE = Path.of("database", "migration_lojas_por_cep.sql");

    private static final LocalDateTime T1 = LocalDateTime.of(2026, 1, 1, 10, 0);
    private static final LocalDateTime T2 = T1.plusDays(1);
    private static final LocalDateTime T3 = T1.plusDays(2);
    private static final LocalDateTime T4 = T1.plusDays(3);

    private SingleConnectionDataSource dataSource;
    private JdbcTemplate jdbc;

    private record Elo(LocalDateTime desde, LocalDateTime ate, boolean disponivel, BigDecimal valor) {}

    @BeforeEach
    void criarBancoLegado() throws Exception {
        // Uma única conexão: o H2 amarra os CHECK à sessão que criou a tabela, e fechá-la
        // depois do script faz todo INSERT em tabela com CHECK falhar ("database has been closed").
        dataSource = new SingleConnectionDataSource(
            "jdbc:h2:mem:lojas_" + UUID.randomUUID().toString().replace("-", "")
                + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "", true);
        jdbc = new JdbcTemplate(dataSource);
        executar(Files.readString(SCHEMA));
    }

    @AfterEach
    void fecharBanco() {
        dataSource.destroy();
    }

    /** Executa um script sem os comentários e sem BEGIN/COMMIT (o H2 não entende a transação). */
    private void executar(String script) throws SQLException {
        String sql = script.lines()
            .filter(l -> !l.trim().startsWith("--"))
            .filter(l -> !l.trim().equals("BEGIN;") && !l.trim().equals("COMMIT;"))
            .collect(Collectors.joining("\n"));
        try (Connection conexao = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(conexao,
                new EncodedResource(new ByteArrayResource(sql.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8));
        }
    }

    private void aplicarMigration() throws Exception {
        executar(Files.readString(MIGRATION));
    }

    private long inserirMercado(String nome) {
        jdbc.update("insert into mercado(nome, endereco) values (?, ?)", nome, "Rua " + nome);
        return jdbc.queryForObject("select id from mercado where nome = ?", Long.class, nome);
    }

    /** Conta no formato antigo (sem os campos de localização). */
    private void inserirUsuarioLegado() {
        jdbc.update("insert into usuario(nome, email, senha, papel) values ('Maria', 'maria@teste.com', 'x', 'USER')");
    }

    private long inserirProduto(String nome) {
        jdbc.update("insert into produto(nome) values (?)", nome);
        return jdbc.queryForObject("select id from produto where nome = ?", Long.class, nome);
    }

    private long inserirPreco(long produto, long mercado, String valor, LocalDateTime coletadoEm, boolean disponivel) {
        jdbc.update("insert into preco(produto_id, mercado_id, valor, coletado_em, disponivel) values (?, ?, ?, ?, ?)",
            produto, mercado, new BigDecimal(valor), coletadoEm, disponivel);
        return jdbc.queryForObject(
            "select id from preco where produto_id = ? and mercado_id = ? and coletado_em = ?",
            Long.class, produto, mercado, coletadoEm);
    }

    private int contar(String tabela) {
        return jdbc.queryForObject("select count(*) from " + tabela, Integer.class);
    }

    private List<Elo> cadeia(long produto, long mercado) {
        return jdbc.query(
            "select pl.vigente_desde, pl.vigente_ate, pl.disponivel, p.valor from preco_loja pl "
                + "join preco p on p.id = pl.preco_id where p.produto_id = ? and p.mercado_id = ? "
                + "order by p.coletado_em, p.id",
            (rs, n) -> new Elo(
                rs.getObject("vigente_desde", LocalDateTime.class),
                rs.getObject("vigente_ate", LocalDateTime.class),
                rs.getBoolean("disponivel"),
                rs.getBigDecimal("valor")),
            produto, mercado);
    }

    private int vinculosAbertos(long produto, long mercado) {
        return jdbc.queryForObject(
            "select count(*) from preco_loja pl join preco p on p.id = pl.preco_id "
                + "where pl.vigente_ate is null and p.produto_id = ? and p.mercado_id = ?",
            Integer.class, produto, mercado);
    }

    @Test
    void migrationDuasVezesNaoDuplicaNemApagaDados() throws Exception {
        long redeA = inserirMercado("Rede A");
        long redeB = inserirMercado("Rede B");
        long produto = inserirProduto("Produto Teste");
        inserirPreco(produto, redeA, "10.00", T1, true);
        inserirPreco(produto, redeA, "12.00", T2, true);
        inserirPreco(produto, redeA, "12.50", T3, false);
        inserirPreco(produto, redeB, "11.00", T1, true);
        inserirUsuarioLegado();
        jdbc.update("insert into promocao(produto_id, mercado_id, valor_original, valor_promocional, data_inicio) "
            + "values (?, ?, 12.00, 9.90, '2026-01-02')", produto, redeA);

        aplicarMigration();
        int lojas = contar("loja");
        int vinculos = contar("preco_loja");
        aplicarMigration();

        assertThat(contar("loja")).isEqualTo(lojas).isEqualTo(2);
        assertThat(contar("preco_loja")).isEqualTo(vinculos).isEqualTo(4);
        assertThat(contar("preco")).isEqualTo(4);
        assertThat(jdbc.queryForList("select valor from preco order by id", BigDecimal.class))
            .usingElementComparator(BigDecimal::compareTo)
            .containsExactly(new BigDecimal("10.00"), new BigDecimal("12.00"),
                new BigDecimal("12.50"), new BigDecimal("11.00"));
    }

    @Test
    void cadaMercadoGanhaUmaLojaPadraoEOsPrecosAntigosEntramEncadeados() throws Exception {
        long redeA = inserirMercado("Rede A");
        long redeB = inserirMercado("Rede B");
        long produto = inserirProduto("Produto Teste");
        inserirPreco(produto, redeA, "10.00", T1, true);
        inserirPreco(produto, redeA, "12.00", T2, true);
        inserirPreco(produto, redeA, "12.50", T3, false);
        inserirPreco(produto, redeB, "11.00", T1, true);

        aplicarMigration();

        assertThat(jdbc.queryForList("select codigo_externo from loja", String.class)).containsOnly("padrao");
        assertThat(jdbc.queryForObject("select nome from loja where mercado_id = ?", String.class, redeA))
            .isEqualTo("Rede A");
        assertThat(cadeia(produto, redeA)).extracting(Elo::desde).containsExactly(T1, T2, T3);
        assertThat(cadeia(produto, redeA)).extracting(Elo::ate).containsExactly(T2, T3, null);
        assertThat(cadeia(produto, redeA)).extracting(Elo::disponivel).containsExactly(true, true, false);
        assertThat(cadeia(produto, redeB)).extracting(Elo::ate).containsExactly((LocalDateTime) null);
        assertThat(jdbc.queryForObject(
            "select count(*) from preco_loja where confirmado_em <> vigente_desde", Integer.class)).isZero();
    }

    @Test
    void contasEPromocoesAntigasNaoMudam() throws Exception {
        long rede = inserirMercado("Rede A");
        long produto = inserirProduto("Produto Teste");
        inserirUsuarioLegado();
        jdbc.update("insert into promocao(produto_id, mercado_id, valor_original, valor_promocional, data_inicio) "
            + "values (?, ?, 12.00, 9.90, '2026-01-02')", produto, rede);

        aplicarMigration();

        assertThat(jdbc.queryForObject(
            "select count(*) from usuario where cep is null and cidade is null and uf is null "
                + "and latitude is null and longitude is null and loja_preferida_id is null", Integer.class))
            .isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from promocao where loja_id is null", Integer.class))
            .isEqualTo(1);
    }

    @Test
    void reexecucaoVinculaPrecoLegadoNovoEFechaOVinculoAnterior() throws Exception {
        long rede = inserirMercado("Rede A");
        long produto = inserirProduto("Produto Teste");
        inserirPreco(produto, rede, "10.00", T1, true);
        inserirPreco(produto, rede, "12.00", T2, true);
        aplicarMigration();

        inserirPreco(produto, rede, "13.00", T4, true);
        aplicarMigration();

        assertThat(contar("preco_loja")).isEqualTo(3);
        assertThat(vinculosAbertos(produto, rede)).isEqualTo(1);
        assertThat(cadeia(produto, rede)).extracting(Elo::ate).containsExactly(T2, T4, null);
    }

    @Test
    void reexecucaoNaoFechaVinculoCujoSucessorEDeOutraLoja() throws Exception {
        long rede = inserirMercado("Rede A");
        long produto = inserirProduto("Produto Teste");
        inserirPreco(produto, rede, "10.00", T1, true);
        aplicarMigration();

        // Preço novo, já vinculado só a uma filial real (como fará o coletor novo).
        jdbc.update("insert into loja(mercado_id, nome, codigo_externo) values (?, 'Rede A Filial 2', 'filial_2')", rede);
        long filial2 = jdbc.queryForObject("select id from loja where codigo_externo = 'filial_2'", Long.class);
        long precoNovo = inserirPreco(produto, rede, "13.00", T4, true);
        jdbc.update("insert into preco_loja(preco_id, loja_id, vigente_desde, confirmado_em) values (?, ?, ?, ?)",
            precoNovo, filial2, T4, T4);

        aplicarMigration();

        assertThat(contar("preco_loja")).isEqualTo(2);
        assertThat(jdbc.queryForObject(
            "select vigente_ate from preco_loja pl join loja l on l.id = pl.loja_id where l.codigo_externo = 'padrao'",
            LocalDateTime.class)).isNull();
    }

    @Test
    void mercadoCadastradoDepoisGanhaLojaPadraoNaReexecucao() throws Exception {
        inserirMercado("Rede A");
        aplicarMigration();
        inserirMercado("Rede C");

        aplicarMigration();

        assertThat(contar("loja")).isEqualTo(2);
        assertThat(jdbc.queryForObject(
            "select count(*) from loja l join mercado m on m.id = l.mercado_id where m.nome = 'Rede C'",
            Integer.class)).isEqualTo(1);
    }

    @Test
    void criaIndicesEColunasEsperados() throws Exception {
        aplicarMigration();

        for (String indice : List.of("idx_loja_lat_long", "idx_preco_loja_loja_vigente",
                "idx_produto_codigo_barras", "idx_loja_mercado", "idx_preco_loja_preco",
                "idx_promocao_loja", "idx_usuario_loja_preferida")) {
            assertThat(jdbc.queryForObject(
                "select count(*) from information_schema.indexes where lower(index_name) = ?",
                Integer.class, indice)).as(indice).isPositive();
        }
        for (String coluna : List.of("cep", "cidade", "uf", "latitude", "longitude", "loja_preferida_id")) {
            assertThat(jdbc.queryForObject(
                "select count(*) from information_schema.columns "
                    + "where lower(table_name) = 'usuario' and lower(column_name) = ?",
                Integer.class, coluna)).as(coluna).isEqualTo(1);
        }
    }

    @Test
    void restricoesRejeitamDadosInvalidos() throws Exception {
        long rede = inserirMercado("Rede A");
        aplicarMigration();

        assertThatThrownBy(() -> jdbc.update(
            "insert into loja(mercado_id, nome, codigo_externo) values (?, 'Duplicada', 'padrao')", rede))
            .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update(
            "insert into loja(mercado_id, nome, codigo_externo, latitude) values (?, 'Polo', 'x', 91)", rede))
            .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update(
            "insert into usuario(nome, email, senha, papel, cep) values ('Ana', 'ana@teste.com', 'x', 'USER', '9001')"))
            .isInstanceOf(DataIntegrityViolationException.class);
        // O mesmo insert com CEP de 8 dígitos passa: a rejeição acima vem mesmo do CEP.
        jdbc.update("insert into usuario(nome, email, senha, papel, cep) values ('Ana', 'ana@teste.com', 'x', 'USER', '90010000')");
    }

    @Test
    void vigenciaInvertidaEhRejeitadaEApagarPrecoApagaOVinculo() throws Exception {
        long rede = inserirMercado("Rede A");
        long produto = inserirProduto("Produto Teste");
        long preco = inserirPreco(produto, rede, "10.00", T2, true);
        aplicarMigration();
        long loja = jdbc.queryForObject("select id from loja where mercado_id = ?", Long.class, rede);

        assertThatThrownBy(() -> jdbc.update(
            "insert into preco_loja(preco_id, loja_id, vigente_desde, vigente_ate, confirmado_em) values (?, ?, ?, ?, ?)",
            preco, loja, T2, T1, T2)).isInstanceOf(DataIntegrityViolationException.class);

        // PrecoService.remover apaga o preço direto: o vínculo precisa ir junto, sem erro de FK.
        jdbc.update("delete from preco where id = ?", preco);
        assertThat(contar("preco_loja")).isZero();
    }

    @Test
    void copiaEmDatabaseEhIdenticaAoScriptDeDeploy() throws IOException {
        assertThat(Files.readString(COPIA_EM_DATABASE)).isEqualTo(Files.readString(MIGRATION));
    }
}
