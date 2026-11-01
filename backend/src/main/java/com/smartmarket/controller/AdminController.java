package com.smartmarket.controller;

import com.smartmarket.dto.admin.PainelAdminResponse;
import com.smartmarket.dto.admin.PapelRequest;
import com.smartmarket.dto.admin.UsuarioResponse;
import com.smartmarket.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private static final int TAMANHO_MAXIMO = 100;

    private final AdminService adminService;

    @GetMapping("/painel")
    public ResponseEntity<PainelAdminResponse> painel() {
        return ResponseEntity.ok(adminService.painel());
    }

    @GetMapping("/usuarios")
    public ResponseEntity<Page<UsuarioResponse>> listarUsuarios(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int pagina = Math.max(page, 0);
        int tamanho = Math.min(Math.max(size, 1), TAMANHO_MAXIMO);
        Pageable pageable = PageRequest.of(pagina, tamanho, Sort.by("nome"));
        return ResponseEntity.ok(adminService.listarUsuarios(pageable));
    }

    @PatchMapping("/usuarios/{id}/papel")
    public ResponseEntity<UsuarioResponse> alterarPapel(
            @PathVariable Long id,
            @Valid @RequestBody PapelRequest request) {
        return ResponseEntity.ok(adminService.alterarPapel(id, request.getPapel()));
    }
}
