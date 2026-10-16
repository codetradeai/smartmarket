package com.smartmarket.dto.lista;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComparacaoResponse {

    private Long listaId;
    private String nome;
    private Integer totalItens;
    private List<MercadoComparacaoResponse> comparacoes;
    private MercadoComparacaoResponse mercadoMaisBarato;
}
