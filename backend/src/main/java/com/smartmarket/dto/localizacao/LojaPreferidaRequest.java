package com.smartmarket.dto.localizacao;

import lombok.Getter;
import lombok.Setter;

/** Corpo de PUT /api/usuarios/me/loja-preferida. {@code lojaId} nulo remove a preferência. */
@Getter
@Setter
public class LojaPreferidaRequest {

    private Long lojaId;
}
