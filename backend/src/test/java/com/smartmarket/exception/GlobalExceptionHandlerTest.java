package com.smartmarket.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    record Corpo(String nome) { }

    @RestController
    static class ControllerDeEntrada {
        @PostMapping("/corpo")
        String corpo(@RequestBody Corpo corpo) {
            return corpo.nome();
        }

        @GetMapping("/numero/{n}")
        String numero(@PathVariable Long n) {
            return String.valueOf(n);
        }

        @GetMapping("/validado")
        String validado() {
            throw new ConstraintViolationException("detalhe interno: campo x", java.util.Set.of());
        }
    }

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new ControllerQuebrado(), new ControllerDeEntrada())
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

    @Test
    void jsonMalformadoDeveVirar400GenericoSemStackNemId() throws Exception {
        mvc.perform(post("/corpo").contentType(MediaType.APPLICATION_JSON).content("{bad"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("Corpo da requisicao invalido"))
            .andExpect(jsonPath("$.id").doesNotExist())
            .andExpect(content().string(not(containsString("JsonParse"))));
    }

    @Test
    void corpoAusenteDeveVirar400() throws Exception {
        mvc.perform(post("/corpo").contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("Corpo da requisicao invalido"));
    }

    @Test
    void parametroDeTipoErradoDeveVirar400NomeandoSoOParametro() throws Exception {
        mvc.perform(get("/numero/abc"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("Parametro invalido: n"))
            .andExpect(jsonPath("$.id").doesNotExist())
            .andExpect(content().string(not(containsString("NumberFormatException"))));
    }

    @Test
    void violacaoDeRestricaoDeveVirar400Generico() throws Exception {
        mvc.perform(get("/validado"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("Requisicao invalida"))
            .andExpect(content().string(not(containsString("campo x"))));
    }
}
