package com.smartmarket.dto.admin;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PainelAdminResponse {

    private final long produtos;
    private final long mercados;
    private final long mercadosAtivos;
    private final long usuarios;
    private final long alertasAtivos;
    private final long promocoesVigentes;
}
