package com.smartmarket.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Filial de um mercado (rede). O preço continua por mercado; a loja diz onde ele vale
 * (ver {@link PrecoLoja}). Todo mercado tem uma loja "padrão" ({@link #CODIGO_PADRAO}), que
 * recebe o que foi coletado antes de existir loja e atende quem ainda não informou CEP.
 */
@Entity
@Table(name = "loja", uniqueConstraints = @UniqueConstraint(
    name = "uk_loja_mercado_codigo", columnNames = {"mercado_id", "codigo_externo"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Loja {

    /** codigo_externo da loja padrão de cada mercado. */
    public static final String CODIGO_PADRAO = "padrao";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mercado_id", nullable = false)
    private Mercado mercado;

    @Column(nullable = false)
    private String nome;

    private String endereco;

    private String cidade;

    private String uf;

    /** Só dígitos (8). */
    private String cep;

    private Double latitude;

    private Double longitude;

    /** Identificador da filial na rede (ex.: filial do VipCommerce); único dentro do mercado. */
    @Column(name = "codigo_externo", nullable = false)
    private String codigoExterno;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativa = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public boolean ehPadrao() {
        return CODIGO_PADRAO.equals(codigoExterno);
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
