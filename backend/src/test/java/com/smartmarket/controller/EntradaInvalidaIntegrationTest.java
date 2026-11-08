package com.smartmarket.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Entrada malformada nas rotas reais deve dar 400 generico, nunca 500 com stack no log. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EntradaInvalidaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void loginComJsonMalformadoRetorna400() throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{bad"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("Corpo da requisicao invalido"))
            .andExpect(jsonPath("$.id").doesNotExist());
    }

    @Test
    void idNaoNumericoRetorna400() throws Exception {
        mockMvc.perform(get("/api/produtos/abc"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("Parametro invalido: id"))
            .andExpect(content().string(not(containsString("Exception"))));
    }

    @Test
    void paginaNaoNumericaRetorna400() throws Exception {
        mockMvc.perform(get("/api/produtos").param("page", "abc"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("Parametro invalido: page"));
    }
}
