package com.smartmarket.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "promocao")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Promocao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "produto_id", nullable = false)
    private Produto produto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mercado_id", nullable = false)
    private Mercado mercado;

    @Column(name = "valor_original", nullable = false)
    private BigDecimal valorOriginal;

    @Column(name = "valor_promocional", nullable = false)
    private BigDecimal valorPromocional;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim", nullable = false)
    private LocalDate dataFim;

    @Column(name = "coletado_em", nullable = false)
    private LocalDateTime coletadoEm;

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
