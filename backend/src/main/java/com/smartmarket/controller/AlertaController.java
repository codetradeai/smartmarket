package com.smartmarket.controller;

import com.smartmarket.dto.alerta.AlertaGravado;
import com.smartmarket.dto.alerta.AlertaRequest;
import com.smartmarket.dto.alerta.AlertaResponse;
import com.smartmarket.dto.alerta.AtualizarAlertaRequest;
import com.smartmarket.service.AlertaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/alertas")
@RequiredArgsConstructor
public class AlertaController {

    private final AlertaService alertaService;

    @GetMapping
    public ResponseEntity<List<AlertaResponse>> listar() {
        return ResponseEntity.ok(alertaService.listarMeus());
    }

    @PostMapping
    public ResponseEntity<AlertaResponse> salvar(@Valid @RequestBody AlertaRequest request) {
        AlertaGravado gravado = alertaService.salvar(request);
        if (gravado.isCriado()) {
            return ResponseEntity.status(201).body(gravado.getAlerta());
        }
        return ResponseEntity.ok(gravado.getAlerta());
    }

    @PutMapping("/{id}")
    public ResponseEntity<AlertaResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody AtualizarAlertaRequest request) {
        return ResponseEntity.ok(alertaService.atualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desativar(@PathVariable Long id) {
        alertaService.desativar(id);
        return ResponseEntity.noContent().build();
    }
}
