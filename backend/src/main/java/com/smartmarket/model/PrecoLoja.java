package com.smartmarket.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Vínculo de um {@link Preco} (histórico, por mercado) com uma {@link Loja}. O mesmo preço pode
 * valer em várias lojas, então o valor não se duplica por filial. {@code vigenteAte == null}
 * marca o vínculo corrente; quando o valor muda na loja o vínculo antigo é fechado e nasce outro.
 * A disponibilidade é por loja: o preço é compartilhado, a disponibilidade não.
 */
@Entity
@Table(name = "preco_loja")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrecoLoja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "preco_id", nullable = false)
    private Preco preco;

    /**
     * Repete preco.produto_id de propósito: permite achar o preço atual de um produto numa loja
     * sem juntar com preco e sustenta o índice único parcial (loja, produto) dos vínculos
     * vigentes. Preenchido de {@link #preco} no persist; a FK composta impede que divirja.
     */
    @Column(name = "produto_id", nullable = false)
    private Long produtoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loja_id", nullable = false)
    private Loja loja;

    @Column(nullable = false)
    @Builder.Default
    private Boolean disponivel = true;

    @Column(name = "vigente_desde", nullable = false)
    private LocalDateTime vigenteDesde;

    /** null = vínculo corrente. */
    @Column(name = "vigente_ate")
    private LocalDateTime vigenteAte;

    /** Última coleta que reviu este preço nesta loja (com valor igual, só isto avança). */
    @Column(name = "confirmado_em", nullable = false)
    private LocalDateTime confirmadoEm;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public boolean estaVigente() {
        return vigenteAte == null;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (produtoId == null && preco != null && preco.getProduto() != null) {
            produtoId = preco.getProduto().getId();
        }
        if (vigenteDesde == null) {
            vigenteDesde = createdAt;
        }
        if (confirmadoEm == null) {
            confirmadoEm = vigenteDesde;
        }
    }
}
