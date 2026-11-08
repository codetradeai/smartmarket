package com.smartmarket.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartmarket.dto.auth.LoginRequest;
import com.smartmarket.dto.auth.RegisterRequest;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
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

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

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

    @Test
    void register_DeveGravarEmailEmMinusculasERecusarDuplicataPorCaixa() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Maria\",\"email\":\"Maria.Caixa@Email.com\",\"senha\":\"senha123\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("maria.caixa@email.com"));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Outra Maria\",\"email\":\"MARIA.CAIXA@email.com\",\"senha\":\"senha123\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("Email ja cadastrado"));
    }

    @Test
    void register_DeveAceitarEmailComEspacosNasPontas() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Com Espaco\",\"email\":\"  Espaco.Ponta@Email.com \",\"senha\":\"senha123\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("espaco.ponta@email.com"));
    }

    @Test
    void login_DeveIgnorarCaixaEEspacosDoEmail() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Login Caixa\",\"email\":\"login.caixa@email.com\",\"senha\":\"senha123\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\" LOGIN.Caixa@Email.com \",\"senha\":\"senha123\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("login.caixa@email.com"));
    }

    @Test
    void login_DeveFuncionarParaContaAntigaGravadaComMaiusculas() throws Exception {
        usuarioRepository.save(Usuario.builder()
            .nome("Conta Antiga")
            .email("Conta.Antiga@Email.com")
            .senha(passwordEncoder.encode("senha123"))
            .papel(Papel.USER)
            .build());

        for (String digitado : new String[] {"conta.antiga@email.com", "Conta.Antiga@Email.com", "CONTA.ANTIGA@EMAIL.COM"}) {
            String resposta = mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + digitado + "\",\"senha\":\"senha123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("Conta.Antiga@Email.com"))
                .andReturn().getResponse().getContentAsString();

            String token = objectMapper.readTree(resposta).get("token").asText();
            mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("Conta.Antiga@Email.com"));
        }
    }

    @Test
    void login_ComSenhaErradaContinuaRetornando401() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Senha Errada\",\"email\":\"senha.errada@email.com\",\"senha\":\"senha123\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"SENHA.ERRADA@email.com\",\"senha\":\"outra-senha\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.erro").value("Email ou senha incorretos"));
    }
}
