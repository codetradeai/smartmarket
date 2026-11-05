package com.smartmarket;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifica que DataSeeder (perfil dev) nao existe no perfil test.
 * Mutacao: remova @Profile("dev") de DataSeeder e este teste deve falhar.
 */
@SpringBootTest
@ActiveProfiles("test")
class DataSeederPerfilTest {

    @Autowired
    ApplicationContext ctx;

    @Test
    void dataSeederNaoExisteNoPerfilTest() {
        assertThat(ctx.containsBean("dataSeeder"))
            .as("DataSeeder nao deve existir fora do perfil dev")
            .isFalse();
    }
}
