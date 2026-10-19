package com.smartmarket.controller;

import com.smartmarket.dto.lista.ComparacaoCestaResponse;
import com.smartmarket.dto.lista.ItemListaRequest;
import com.smartmarket.dto.lista.ListaCompraRequest;
import com.smartmarket.dto.lista.ListaCompraResponse;
import com.smartmarket.service.ListaCompraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/listas")
@RequiredArgsConstructor
public class ListaCompraController {

    private final ListaCompraService listaCompraService;

    @GetMapping
    public ResponseEntity<List<ListaCompraResponse>> listarMinhas() {
        return ResponseEntity.ok(listaCompraService.listarMinhas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ListaCompraResponse> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(listaCompraService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<ListaCompraResponse> criar(@Valid @RequestBody ListaCompraRequest request) {
        return ResponseEntity.status(201).body(listaCompraService.criar(request));
    }

    @PostMapping("/{id}/itens")
    public ResponseEntity<ListaCompraResponse> adicionarItem(
            @PathVariable Long id,
            @Valid @RequestBody ItemListaRequest request) {
        return ResponseEntity.ok(listaCompraService.adicionarItem(id, request));
    }

    @DeleteMapping("/{id}/itens/{produtoId}")
    public ResponseEntity<ListaCompraResponse> removerItem(
            @PathVariable Long id,
            @PathVariable Long produtoId) {
        return ResponseEntity.ok(listaCompraService.removerItem(id, produtoId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removerLista(@PathVariable Long id) {
        listaCompraService.removerLista(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/comparar")
    public ResponseEntity<ComparacaoCestaResponse> compararCesta(@PathVariable Long id) {
        return ResponseEntity.ok(listaCompraService.compararCesta(id));
    }
}
