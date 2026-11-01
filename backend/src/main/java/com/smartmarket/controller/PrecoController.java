package com.smartmarket.controller;

import com.smartmarket.dto.preco.PrecoRequest;
import com.smartmarket.dto.preco.PrecoResponse;
import com.smartmarket.dto.produto.ProdutoComPrecosResponse;
import com.smartmarket.service.PrecoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/precos")
@RequiredArgsConstructor
public class PrecoController {

    private final PrecoService precoService;

    /**
     * Retorna todos os produtos com seus preços por mercado.
     * Endpoint público — usado pelo catálogo para comparação.
     */
    @GetMapping("/catalogo")
    public ResponseEntity<List<ProdutoComPrecosResponse>> catalogoComPrecos() {
        return ResponseEntity.ok(precoService.buscarTodosComPrecos());
    }

    /**
     * Retorna os preços de um produto específico em todos os mercados.
     * Endpoint público.
     */
    @GetMapping("/produto/{produtoId}")
    public ResponseEntity<ProdutoComPrecosResponse> precosDeUmProduto(
            @PathVariable Long produtoId) {
        return ResponseEntity.ok(precoService.buscarPrecosPorProduto(produtoId));
    }

    /**
     * Retorna preços de um produto em um mercado específico.
     * Endpoint público.
     */
    @GetMapping("/produto/{produtoId}/mercado/{mercadoId}")
    public ResponseEntity<List<PrecoResponse>> precosPorProdutoEMercado(
            @PathVariable Long produtoId,
            @PathVariable Long mercadoId) {
        return ResponseEntity.ok(precoService.buscarPorProdutoEMercado(produtoId, mercadoId));
    }

    /**
     * Registra um novo preço.
     * Restrito a ADMIN (via SecurityConfig).
     */
    @PostMapping
    public ResponseEntity<PrecoResponse> criar(@Valid @RequestBody PrecoRequest request) {
        return ResponseEntity.status(201).body(precoService.criar(request));
    }

    /**
     * Remove um registro de preço.
     * Restrito a ADMIN.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        precoService.remover(id);
        return ResponseEntity.ok().build();
    }
}
