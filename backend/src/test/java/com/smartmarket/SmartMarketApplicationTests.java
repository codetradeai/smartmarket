package com.smartmarket;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class SmartMarketApplicationTests {

    @Test
    void contextLoads() {
        // Garante que o contexto Spring sobe com o perfil de teste (H2).
    }
}
