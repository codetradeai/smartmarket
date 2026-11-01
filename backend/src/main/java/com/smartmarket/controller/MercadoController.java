package com.smartmarket.controller;

import com.smartmarket.dto.mercado.MercadoRequest;
import com.smartmarket.dto.mercado.MercadoResponse;
import com.smartmarket.service.MercadoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mercados")
@RequiredArgsConstructor
public class MercadoController {

    private final MercadoService mercadoService;

    /**
     * Lista todos os mercados ativos.
     * Endpoint público — sem autenticação.
     */
    @GetMapping
    public ResponseEntity<List<MercadoResponse>> listar() {
        return ResponseEntity.ok(mercadoService.listarAtivos());
    }

    /**
     * Lista todos os mercados incluindo inativos (admin).
     */
    @GetMapping("/todos")
    public ResponseEntity<List<MercadoResponse>> listarTodos() {
        return ResponseEntity.ok(mercadoService.listarTodos());
    }

    /**
     * Busca mercado por ID.
     * Endpoint público.
     */
    @GetMapping("/{id}")
    public ResponseEntity<MercadoResponse> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(mercadoService.buscarPorId(id));
    }

    /**
     * Cria um novo mercado.
     * Restrito a ADMIN (via SecurityConfig).
     */
    @PostMapping
    public ResponseEntity<MercadoResponse> criar(@Valid @RequestBody MercadoRequest request) {
        return ResponseEntity.status(201).body(mercadoService.criar(request));
    }

    /**
     * Atualiza um mercado existente.
     * Restrito a ADMIN.
     */
    @PutMapping("/{id}")
    public ResponseEntity<MercadoResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody MercadoRequest request) {
        return ResponseEntity.ok(mercadoService.atualizar(id, request));
    }

    /**
     * Remove um mercado.
     * Restrito a ADMIN.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        mercadoService.remover(id);
        return ResponseEntity.ok().build();
    }
}
