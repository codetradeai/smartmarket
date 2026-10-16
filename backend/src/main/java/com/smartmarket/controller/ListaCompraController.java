package com.smartmarket.controller;

import com.smartmarket.dto.lista.ComparacaoResponse;
import com.smartmarket.dto.lista.ItemListaRequest;
import com.smartmarket.dto.lista.ItemListaResponse;
import com.smartmarket.dto.lista.ListaRequest;
import com.smartmarket.dto.lista.ListaResponse;
import com.smartmarket.service.ComparadorService;
import com.smartmarket.service.ListaCompraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/listas")
@RequiredArgsConstructor
public class ListaCompraController {

    private final ListaCompraService listaCompraService;
    private final ComparadorService comparadorService;

    @PostMapping
    public ResponseEntity<ListaResponse> criar(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ListaRequest request) {
        ListaResponse response = listaCompraService.criar(jwt.getSubject(), request);
        return ResponseEntity.created(URI.create("/api/listas/" + response.getId())).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ListaResponse>> listar(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(listaCompraService.listarPorUsuario(jwt.getSubject()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ListaResponse> buscarPorId(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id) {
        return ResponseEntity.ok(listaCompraService.buscarPorId(jwt.getSubject(), id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ListaResponse> renomear(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @Valid @RequestBody ListaRequest request) {
        return ResponseEntity.ok(listaCompraService.renomear(jwt.getSubject(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id) {
        listaCompraService.remover(jwt.getSubject(), id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/itens")
    public ResponseEntity<ItemListaResponse> adicionarItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @Valid @RequestBody ItemListaRequest request) {
        ItemListaResponse response = listaCompraService.adicionarItem(jwt.getSubject(), id, request);
        return ResponseEntity.created(
            URI.create("/api/listas/" + id + "/itens/" + response.getId())).body(response);
    }

    @PutMapping("/{id}/itens/{itemId}")
    public ResponseEntity<ItemListaResponse> atualizarItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @PathVariable Long itemId,
            @Valid @RequestBody ItemListaRequest request) {
        return ResponseEntity.ok(
            listaCompraService.atualizarItem(jwt.getSubject(), id, itemId, request));
    }

    @DeleteMapping("/{id}/itens/{itemId}")
    public ResponseEntity<Void> removerItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @PathVariable Long itemId) {
        listaCompraService.removerItem(jwt.getSubject(), id, itemId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/comparacao")
    public ResponseEntity<ComparacaoResponse> comparar(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id) {
        return ResponseEntity.ok(comparadorService.comparar(jwt.getSubject(), id));
    }
}
