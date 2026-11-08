package com.smartmarket;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Em producao o Hibernate sobe com ddl-auto=validate sobre o que backend/deploy/01_schema.sql
 * sozinho (o 04 e idempotente) criou. Os demais testes usam create-drop, entao uma coluna que a entidade exige
 * e o DDL nao tem so apareceria no deploy ("missing column [ativa] in table [promocao]").
 * Aqui o contexto sobe em H2 (modo PostgreSQL) com o schema de deploy e validate: se entidade e DDL
 * divergirem, o contexto nao inicializa e este teste falha.
 */
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:schema_deploy;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=validate",
    "spring.sql.init.mode=always",
    "spring.sql.init.schema-locations=file:deploy/01_schema.sql",
    "spring.sql.init.data-locations="
})
@ActiveProfiles("test")
class SchemaDeployValidacaoTest {

    @Autowired JdbcTemplate jdbc;

    @Test
    void entidadesValidamContraOSchemaDeDeploy() {
        Integer colunas = jdbc.queryForObject(
            "select count(*) from information_schema.columns "
            + "where lower(table_name) = 'promocao' and lower(column_name) = 'ativa'", Integer.class);
        assertThat(colunas).isEqualTo(1);
    }
}
