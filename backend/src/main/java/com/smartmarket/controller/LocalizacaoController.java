package com.smartmarket.controller;

import com.smartmarket.dto.localizacao.CepRequest;
import com.smartmarket.dto.localizacao.LocalizacaoResponse;
import com.smartmarket.dto.localizacao.LojaPreferidaRequest;
import com.smartmarket.dto.localizacao.LojaProximaResponse;
import com.smartmarket.service.LocalizacaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Localização do usuário logado e lojas próximas. Todas as rotas exigem login
 * (SecurityConfig: qualquer rota não listada é autenticada).
 */
@RestController
@RequiredArgsConstructor
public class LocalizacaoController {

    private final LocalizacaoService localizacaoService;

    @GetMapping("/api/lojas/proximas")
    public ResponseEntity<List<LojaProximaResponse>> lojasProximas(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(localizacaoService.lojasProximas(jwt.getSubject()));
    }

    @GetMapping("/api/usuarios/me/localizacao")
    public ResponseEntity<LocalizacaoResponse> obter(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(localizacaoService.obter(jwt.getSubject()));
    }

    @PutMapping("/api/usuarios/me/localizacao")
    public ResponseEntity<LocalizacaoResponse> trocarCep(@AuthenticationPrincipal Jwt jwt,
                                                         @Valid @RequestBody CepRequest request) {
        return ResponseEntity.ok(localizacaoService.trocarCep(jwt.getSubject(), request.getCep()));
    }

    @DeleteMapping("/api/usuarios/me/localizacao")
    public ResponseEntity<Void> excluir(@AuthenticationPrincipal Jwt jwt) {
        localizacaoService.excluir(jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/api/usuarios/me/loja-preferida")
    public ResponseEntity<LocalizacaoResponse> definirLojaPreferida(@AuthenticationPrincipal Jwt jwt,
                                                                    @RequestBody LojaPreferidaRequest request) {
        return ResponseEntity.ok(localizacaoService.definirLojaPreferida(jwt.getSubject(), request.getLojaId()));
    }
}
