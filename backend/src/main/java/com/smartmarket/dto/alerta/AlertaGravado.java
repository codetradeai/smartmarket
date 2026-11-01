package com.smartmarket.dto.alerta;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class AlertaGravado {

    private final AlertaResponse alerta;
    private final boolean criado;
}
