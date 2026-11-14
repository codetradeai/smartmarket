package com.smartmarket.controller;

import com.smartmarket.dto.localizacao.FilialPublicaResponse;
import com.smartmarket.service.FiliaisPublicasService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

/**
 * Filiais por rede, com coordenadas. Público de propósito (SecurityConfig): são dados públicos das filiais,
 * e é isso que deixa o navegador calcular a distância sem enviar a posição do usuário a lugar nenhum.
 * Não altera nem substitui {@code /api/lojas/proximas}, que continua exigindo login.
 */
@RestController
@RequiredArgsConstructor
public class FiliaisPublicasController {

    private final FiliaisPublicasService filiaisPublicasService;

    @GetMapping("/api/lojas/filiais")
    public ResponseEntity<List<FilialPublicaResponse>> filiais() {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
            .body(filiaisPublicasService.listar());
    }
}
