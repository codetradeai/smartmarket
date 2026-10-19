package com.smartmarket.controller;

import com.smartmarket.dto.promocao.PromocaoRequest;
import com.smartmarket.dto.promocao.PromocaoResponse;
import com.smartmarket.service.PromocaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/promocoes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class PromocaoController {

    private final PromocaoService promocaoService;

    @GetMapping
    public ResponseEntity<List<PromocaoResponse>> listar() {
        return ResponseEntity.ok(promocaoService.listar());
    }

    @PostMapping
    public ResponseEntity<PromocaoResponse> criar(@Valid @RequestBody PromocaoRequest request) {
        return ResponseEntity.status(201).body(promocaoService.criar(request));
    }
}
