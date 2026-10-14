package com.smartmarket.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "preco")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Preco {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "produto_id", nullable = false)
    private Produto produto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mercado_id", nullable = false)
    private Mercado mercado;

    @Column(nullable = false)
    private BigDecimal valor;

    @Column(name = "coletado_em", nullable = false)
    private LocalDateTime coletadoEm;

    private String origem;

    @Column(name = "nome_bruto")
    private String nomeBruto;

    @Column(nullable = false)
    private Boolean disponivel = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (coletadoEm == null) {
            coletadoEm = LocalDateTime.now();
        }
    }
}
