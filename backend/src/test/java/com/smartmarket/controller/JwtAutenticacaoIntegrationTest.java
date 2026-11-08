package com.smartmarket.controller;

import com.fasterxml.jackson.databind.json.JsonMapper;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Autenticacao por JWT de ponta a ponta: o papel vale o do banco no momento da requisicao (nao o
 * da claim gravada no login) e tokens invalidos (expirado, adulterado, chave errada, alg none)
 * recebem 401.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JwtAutenticacaoIntegrationTest {

    private static final String ROTA_AUTENTICADA = "/api/auth/me";
    private static final String ROTA_ADMIN = "/api/admin/painel";
    private static final String SENHA = "senha123";
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();

    @Autowired private MockMvc mockMvc;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Value("${jwt.secret}")
    private String segredoDaAplicacao;

    private int contador;

    @BeforeEach
    void zerar() {
        contador = 0;
    }

    // ------------------------------------------------------------------
    // Papel resolvido no banco a cada requisicao
    // ------------------------------------------------------------------

    @Test
    void adminRebaixadoRecebe403ComOMesmoToken() throws Exception {
        Usuario admin = criarUsuario("jwt-rebaixado@email.com", Papel.ADMIN);
        String token = login(admin.getEmail());

        mockMvc.perform(get(ROTA_ADMIN).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        admin.setPapel(Papel.USER);
        usuarioRepository.save(admin);

        mockMvc.perform(get(ROTA_ADMIN).header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
        // continua autenticado como usuario comum
        mockMvc.perform(get(ROTA_AUTENTICADA).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.papel").value("USER"));
    }

    @Test
    void usuarioPromovidoPassaAValerComOMesmoToken() throws Exception {
        Usuario usuario = criarUsuario("jwt-promovido@email.com", Papel.USER);
        String token = login(usuario.getEmail());

        mockMvc.perform(get(ROTA_ADMIN).header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());

        usuario.setPapel(Papel.ADMIN);
        usuarioRepository.save(usuario);

        mockMvc.perform(get(ROTA_ADMIN).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void claimPapelAdminNaoValeSeOBancoDizUser() throws Exception {
        Usuario usuario = criarUsuario("jwt-claim-divergente@email.com", Papel.USER);
        // Token com assinatura valida, mas com papel=ADMIN que o banco nao confirma.
        String token = tokenAssinado(segredoDaAplicacao, usuario.getEmail(), "ADMIN",
            Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600));

        mockMvc.perform(get(ROTA_ADMIN).header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test
    void usuarioApagadoComTokenValidoRecebe401() throws Exception {
        Usuario usuario = criarUsuario("jwt-apagado@email.com", Papel.USER);
        String token = login(usuario.getEmail());

        mockMvc.perform(get(ROTA_AUTENTICADA).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        usuarioRepository.delete(usuario);

        mockMvc.perform(get(ROTA_AUTENTICADA).header("Authorization", "Bearer " + token))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenDeUsuarioInexistenteRecebe401() throws Exception {
        String token = tokenAssinado(segredoDaAplicacao, "nunca-existiu@email.com", "ADMIN",
            Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600));

        mockMvc.perform(get(ROTA_ADMIN).header("Authorization", "Bearer " + token))
            .andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------
    // Tokens invalidos
    // ------------------------------------------------------------------

    @Test
    void tokenValidoRecebe200() throws Exception {
        Usuario usuario = criarUsuario("jwt-valido@email.com", Papel.USER);
        String token = tokenAssinado(segredoDaAplicacao, usuario.getEmail(), "USER",
            Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600));

        mockMvc.perform(get(ROTA_AUTENTICADA).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(usuario.getEmail()));
    }

    @Test
    void tokenExpiradoRecebe401() throws Exception {
        Usuario usuario = criarUsuario("jwt-expirado@email.com", Papel.ADMIN);
        String token = tokenAssinado(segredoDaAplicacao, usuario.getEmail(), "ADMIN",
            Instant.now().minusSeconds(7200), Instant.now().minusSeconds(3600));

        mockMvc.perform(get(ROTA_AUTENTICADA).header("Authorization", "Bearer " + token))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(get(ROTA_ADMIN).header("Authorization", "Bearer " + token))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void assinaturaAdulteradaRecebe401() throws Exception {
        Usuario usuario = criarUsuario("jwt-adulterado@email.com", Papel.USER);
        String valido = login(usuario.getEmail());
        String[] partes = valido.split("\\.");
        String assinaturaTrocada = "A".repeat(partes[2].length());

        mockMvc.perform(get(ROTA_AUTENTICADA)
                .header("Authorization", "Bearer " + partes[0] + "." + partes[1] + "." + assinaturaTrocada))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void payloadAdulteradoParaAdminMantendoAssinaturaOriginalRecebe401() throws Exception {
        Usuario usuario = criarUsuario("jwt-payload-forjado@email.com", Papel.USER);
        String valido = login(usuario.getEmail());
        String[] partes = valido.split("\\.");
        String payload = new String(Base64.getUrlDecoder().decode(partes[1]), StandardCharsets.UTF_8)
            .replace("\"papel\":\"USER\"", "\"papel\":\"ADMIN\"");
        String payloadForjado = B64.encodeToString(payload.getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(get(ROTA_ADMIN)
                .header("Authorization", "Bearer " + partes[0] + "." + payloadForjado + "." + partes[2]))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenAssinadoComChaveErradaRecebe401() throws Exception {
        Usuario admin = criarUsuario("jwt-chave-errada@email.com", Papel.ADMIN);
        String outraChave = "outra-chave-qualquer-com-mais-de-32-bytes-0123456789";
        String token = tokenAssinado(outraChave, admin.getEmail(), "ADMIN",
            Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600));

        mockMvc.perform(get(ROTA_ADMIN).header("Authorization", "Bearer " + token))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenComAlgNoneRecebe401() throws Exception {
        Usuario admin = criarUsuario("jwt-alg-none@email.com", Papel.ADMIN);
        long agora = Instant.now().getEpochSecond();
        String cabecalho = B64.encodeToString("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = B64.encodeToString(("{\"iss\":\"smartmarket\",\"sub\":\"" + admin.getEmail()
            + "\",\"papel\":\"ADMIN\",\"iat\":" + (agora - 60) + ",\"exp\":" + (agora + 3600) + "}")
            .getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(get(ROTA_ADMIN).header("Authorization", "Bearer " + cabecalho + "." + payload + "."))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void semTokenOuComLixoRecebe401() throws Exception {
        mockMvc.perform(get(ROTA_AUTENTICADA)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(ROTA_AUTENTICADA).header("Authorization", "Bearer isto-nao-e-um-jwt"))
            .andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------
    // Apoio
    // ------------------------------------------------------------------

    private Usuario criarUsuario(String email, Papel papel) {
        contador++;
        usuarioRepository.findByEmail(email).ifPresent(usuarioRepository::delete);
        return usuarioRepository.save(Usuario.builder()
            .nome("Usuario JWT " + contador)
            .email(email)
            .senha(passwordEncoder.encode(SENHA))
            .papel(papel)
            .build());
    }

    private String login(String email) throws Exception {
        MvcResult resultado = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"senha\":\"" + SENHA + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
        return JSON.readTree(resultado.getResponse().getContentAsString()).get("token").asText();
    }

    /** Emite um JWT HS256 igual ao do login, mas com o segredo, o papel e as datas escolhidos. */
    private static String tokenAssinado(String segredo, String email, String papel,
                                        Instant emitidoEm, Instant expiraEm) {
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(new ImmutableSecret<>(
            new SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), "HmacSHA256")));
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("smartmarket")
            .issuedAt(emitidoEm)
            .expiresAt(expiraEm)
            .subject(email)
            .claim("papel", papel)
            .build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
            .getTokenValue();
    }
}
