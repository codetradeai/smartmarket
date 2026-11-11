package com.smartmarket.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String senha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Papel papel = Papel.USER;

    // Localização (todos opcionais; contas antigas ficam nulas e são convidadas a informar o CEP).
    // Dado pessoal (LGPD): o usuário pode editar e excluir. As coordenadas têm só a precisão do CEP.

    /** Só dígitos (8). */
    @Column(length = 8)
    private String cep;

    private String cidade;

    @Column(length = 2)
    private String uf;

    private Double latitude;

    private Double longitude;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loja_preferida_id")
    private Loja lojaPreferida;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
