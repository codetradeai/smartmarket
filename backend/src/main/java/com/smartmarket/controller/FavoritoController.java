package com.smartmarket.controller;

import com.smartmarket.dto.favorito.FavoritoGravado;
import com.smartmarket.dto.favorito.FavoritoRequest;
import com.smartmarket.dto.favorito.FavoritoResponse;
import com.smartmarket.dto.produto.ProdutoComPrecosResponse;
import com.smartmarket.service.FavoritoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/favoritos")
@RequiredArgsConstructor
public class FavoritoController {

    private final FavoritoService favoritoService;

    @GetMapping
    public ResponseEntity<List<FavoritoResponse>> listar() {
        return ResponseEntity.ok(favoritoService.listarMeus());
    }

    @PostMapping
    public ResponseEntity<FavoritoResponse> favoritar(@Valid @RequestBody FavoritoRequest request) {
        FavoritoGravado gravado = favoritoService.favoritar(request);
        if (gravado.isCriado()) {
            return ResponseEntity.status(201).body(gravado.getFavorito());
        }
        return ResponseEntity.ok(gravado.getFavorito());
    }

    @DeleteMapping("/mercados/{mercadoId}")
    public ResponseEntity<Void> desfavoritar(@PathVariable Long mercadoId) {
        favoritoService.desfavoritar(mercadoId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/produtos")
    public ResponseEntity<List<ProdutoComPrecosResponse>> listarProdutosFavoritos() {
        return ResponseEntity.ok(favoritoService.listarProdutosFavoritos());
    }

    @PostMapping("/produtos/{produtoId}")
    public ResponseEntity<Void> favoritarProduto(@PathVariable Long produtoId) {
        favoritoService.favoritarProduto(produtoId);
        return ResponseEntity.status(201).build();
    }

    @DeleteMapping("/produtos/{produtoId}")
    public ResponseEntity<Void> desfavoritarProduto(@PathVariable Long produtoId) {
        favoritoService.desfavoritarProduto(produtoId);
        return ResponseEntity.noContent().build();
    }
}
