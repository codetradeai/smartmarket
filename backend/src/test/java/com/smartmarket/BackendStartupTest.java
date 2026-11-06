package com.smartmarket;

import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

/**
 * Verifica que a aplicação sobe com o segredo configurado e recusa inicialização
 * sem ele (mutação: remover o guard em JwtTokenProvider e este teste falha).
 */
class BackendStartupTest {

    @Test
    void startupFalhaSemJwtSecret() {
        Throwable ex = catchThrowable(() -> {
            ConfigurableApplicationContext ctx = new SpringApplicationBuilder(SmartMarketApplication.class)
                    .run(
                            "--spring.profiles.active=test",
                            "--jwt.secret=   ",
                            "--spring.main.web-application-type=none",
                            "--security.rate-limit.enabled=false"
                    );
            ctx.close();
        });

        assertThat(ex).as("Deve falhar ao iniciar sem jwt.secret").isNotNull();

        StringBuilder msgs = new StringBuilder();
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t.getMessage() != null) msgs.append(t.getMessage());
        }
        assertThat(msgs.toString())
                .as("Cadeia de excecoes deve mencionar SMARTMARKET_JWT_SECRET")
                .contains("SMARTMARKET_JWT_SECRET");
    }
}
