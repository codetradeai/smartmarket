package com.smartmarket.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {

    @RestController
    static class ControllerQuebrado {
        @GetMapping("/boom")
        String boom() {
            throw new IllegalStateException("detalhe interno: senha do banco xyz");
        }
    }

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new ControllerQuebrado())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void erroInesperadoDeveRetornar500GenericoComIdDeCorrelacao() throws Exception {
        mvc.perform(get("/boom"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.erro").value("Erro interno do servidor"))
            .andExpect(jsonPath("$.id").isNotEmpty())
            .andExpect(content().string(not(containsString("senha do banco"))));
    }

    @Test
    void excecaoDoSpringMvcDevePreservarStatus4xx() throws Exception {
        mvc.perform(post("/boom"))
            .andExpect(status().isMethodNotAllowed())
            .andExpect(jsonPath("$.erro").value("Requisicao invalida"));
    }
}
