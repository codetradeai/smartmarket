package com.smartmarket.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Campo acima do tamanho da coluna deve dar 400 apontando o campo, nao 409 enganoso. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CampoGrandeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void cadastroComNomeDe300CaracteresRetorna400ApontandoOCampo() throws Exception {
        String corpo = "{\"nome\":\"" + "n".repeat(300)
            + "\",\"email\":\"campo.grande@email.com\",\"senha\":\"senha123\"}";

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(corpo))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("Dados invalidos"))
            .andExpect(jsonPath("$.campos.nome").isNotEmpty());
    }

    @Test
    void cadastroComSenhaAcimaDoLimiteDoBcryptRetorna400() throws Exception {
        String corpo = "{\"nome\":\"Senha Longa\",\"email\":\"senha.longa@email.com\",\"senha\":\""
            + "s".repeat(73) + "\"}";

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(corpo))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.campos.senha").isNotEmpty());
    }
}
