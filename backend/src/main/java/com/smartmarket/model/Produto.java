package com.smartmarket.model;

import com.smartmarket.util.NormalizadorTexto;
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

    @Column(name = "imagem_url")
    private String imagemUrl;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        atualizarNomeNormalizado();
    }

    /** Mantém nome_normalizado (base da busca por nome) sempre em sincronia com o nome. */
    @PreUpdate
    protected void atualizarNomeNormalizado() {
        if (this.nome != null) {
            this.nomeNormalizado = NormalizadorTexto.normalizar(this.nome);
        }
    }
}
