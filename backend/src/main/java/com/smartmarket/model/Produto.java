package com.smartmarket.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "produto")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(name = "nome_normalizado")
    private String nomeNormalizado;

    private String marca;

    private Double quantidade;

    private String unidade;

    @Column(name = "codigo_barras")
    private String codigoBarras;

    private String categoria;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (this.nome != null) {
            this.nomeNormalizado = normalizar(this.nome);
        }
    }

    private String normalizar(String texto) {
        return texto.toLowerCase()
            .replaceAll("[àáâãäå]", "a")
            .replaceAll("[èéêë]", "e")
            .replaceAll("[ìíîï]", "i")
            .replaceAll("[òóôõö]", "o")
            .replaceAll("[ùúûü]", "u")
            .replaceAll("[ç]", "c")
            .replaceAll("\\s+", " ")
            .trim();
    }
}
