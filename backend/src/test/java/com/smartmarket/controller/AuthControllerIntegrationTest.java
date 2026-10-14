package com.smartmarket.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartmarket.dto.auth.LoginRequest;
import com.smartmarket.dto.auth.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void register_DeveCriarUsuarioERetornarToken() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setNome("Usuario Teste");
        request.setEmail("teste-auth@email.com");
        request.setSenha("senha123");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.tipo").value("Bearer"))
            .andExpect(jsonPath("$.email").value("teste-auth@email.com"))
            .andExpect(jsonPath("$.papel").value("USER"));
    }

    @Test
    void login_DeveRetornarToken() throws Exception {
        RegisterRequest register = new RegisterRequest();
        register.setNome("Usuario Login");
        register.setEmail("login-test@email.com");
        register.setSenha("senha123");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(register)))
            .andExpect(status().isOk());

        LoginRequest login = new LoginRequest();
        login.setEmail("login-test@email.com");
        login.setSenha("senha123");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.tipo").value("Bearer"));
    }

    @Test
    void register_DeveFalharComEmailInvalido() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setNome("Teste");
        request.setEmail("email-invalido");
        request.setSenha("senha123");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void rotaProtegida_DeveRetornar401SemToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void rotaProtegida_DeveRetornar200ComTokenValido() throws Exception {
        RegisterRequest register = new RegisterRequest();
        register.setNome("Usuario Me");
        register.setEmail("me-test@email.com");
        register.setSenha("senha123");

        String response = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(register)))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(response).get("token").asText();

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("me-test@email.com"))
            .andExpect(jsonPath("$.papel").value("USER"));
    }
}
