package com.smartmarket.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Liga dois registros de produto (um por rede) que representam o mesmo item.
 * produtoA.id < produtoB.id garante um único registro por par.
 * Só vínculos CONFIRMADO entram no comparador; REVISAR (ex.: 45g vs 6 unidades) ficam de fora.
 */
@Entity
@Table(name = "vinculo_produto")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VinculoProduto {

    public static final String ORIGEM_EAN = "ean";
    public static final String ORIGEM_NOME = "nome";
    public static final String STATUS_CONFIRMADO = "confirmado";
    public static final String STATUS_REVISAR = "revisar";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "produto_a_id", nullable = false)
    private Produto produtoA;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "produto_b_id", nullable = false)
    private Produto produtoB;

    @Column(nullable = false, length = 10)
    private String origem;

    @Column(nullable = false, length = 10)
    private String status;

    @Column(length = 100)
    private String motivo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
