package com.smartmarket.controller;

import com.smartmarket.dto.produto.ProdutoRequest;
import com.smartmarket.dto.produto.ProdutoResponse;
import com.smartmarket.exception.FiltroInvalidoException;
import com.smartmarket.service.ProdutoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/produtos")
@RequiredArgsConstructor
public class ProdutoController {

    private static final Set<String> CAMPOS_ORDENACAO = Set.of("id", "nome", "marca", "categoria", "createdAt");
    private static final int TAMANHO_MAXIMO = 100;

    private final ProdutoService produtoService;

    @GetMapping
    public ResponseEntity<Page<ProdutoResponse>> listar(
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false, defaultValue = "nome,asc") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(size, TAMANHO_MAXIMO), parseSort(sort));
        return ResponseEntity.ok(produtoService.buscar(nome, categoria, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProdutoResponse> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(produtoService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<ProdutoResponse> criar(@Valid @RequestBody ProdutoRequest request) {
        return ResponseEntity.status(201).body(produtoService.criar(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProdutoResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody ProdutoRequest request) {
        return ResponseEntity.ok(produtoService.atualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        produtoService.remover(id);
        return ResponseEntity.ok().build();
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.ASC, "nome");
        }

        String[] partes = sort.split(",");
        List<Sort.Order> ordenacoes = new ArrayList<>();

        for (int i = 0; i < partes.length; i += 2) {
            String campo = partes[i].trim();

            if (!CAMPOS_ORDENACAO.contains(campo)) {
                throw new FiltroInvalidoException("Campo de ordenacao invalido: " + campo);
            }

            Sort.Direction direcao = Sort.Direction.ASC;
            if (i + 1 < partes.length) {
                direcao = parseDirecao(partes[i + 1].trim());
            }

            ordenacoes.add(new Sort.Order(direcao, campo));
        }

        if (ordenacoes.isEmpty()) {
            return Sort.by(Sort.Direction.ASC, "nome");
        }

        return Sort.by(ordenacoes);
    }

    private Sort.Direction parseDirecao(String direcao) {
        if ("asc".equalsIgnoreCase(direcao)) {
            return Sort.Direction.ASC;
        }
        if ("desc".equalsIgnoreCase(direcao)) {
            return Sort.Direction.DESC;
        }
        throw new FiltroInvalidoException("Direcao de ordenacao invalida: " + direcao);
    }
}
