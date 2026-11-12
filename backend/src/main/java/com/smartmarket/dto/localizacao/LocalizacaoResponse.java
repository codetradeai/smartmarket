package com.smartmarket.dto.localizacao;

import com.smartmarket.model.Usuario;

/**
 * Localização guardada do usuário. {@code resolvida} é verdadeiro só quando há coordenadas, que são
 * o que permite achar a loja mais próxima; sem elas a leitura cai na loja padrão do mercado.
 */
public record LocalizacaoResponse(
    String cep,
    String cidade,
    String uf,
    Double latitude,
    Double longitude,
    boolean resolvida,
    Long lojaPreferidaId
) {

    public static LocalizacaoResponse from(Usuario usuario) {
        return new LocalizacaoResponse(
            usuario.getCep(),
            usuario.getCidade(),
            usuario.getUf(),
            usuario.getLatitude(),
            usuario.getLongitude(),
            usuario.getLatitude() != null && usuario.getLongitude() != null,
            // getId() de um proxy lazy não carrega a loja (open-in-view está desligado).
            usuario.getLojaPreferida() == null ? null : usuario.getLojaPreferida().getId()
        );
    }
}
