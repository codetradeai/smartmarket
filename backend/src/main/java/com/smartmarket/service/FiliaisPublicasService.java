package com.smartmarket.service;

import com.smartmarket.dto.localizacao.FilialPublicaResponse;
import com.smartmarket.model.Loja;
import com.smartmarket.repository.LojaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.Comparator;
import java.util.List;

/**
 * Filiais públicas por rede, com coordenadas, para o cliente calcular a distância a partir da posição do
 * navegador sem enviá-la a lugar nenhum. Só filial real (nunca a loja padrão), ativa, de mercado ativo e
 * com latitude e longitude as duas.
 */
@Service
public class FiliaisPublicasService {

    private final LojaRepository lojaRepository;
    private final Clock clock;

    @Autowired
    public FiliaisPublicasService(LojaRepository lojaRepository) {
        this(lojaRepository, Clock.systemUTC());
    }

    FiliaisPublicasService(LojaRepository lojaRepository, Clock clock) {
        this.lojaRepository = lojaRepository;
        this.clock = clock;
    }

    public List<FilialPublicaResponse> listar() {
        return lojaRepository.findAtivasComMercado().stream()
            .filter(l -> Boolean.TRUE.equals(l.getAtiva()) && Boolean.TRUE.equals(l.getMercado().getAtivo()))
            .filter(l -> !Loja.CODIGO_PADRAO.equals(l.getCodigoExterno()))
            .filter(l -> l.getLatitude() != null && l.getLongitude() != null)
            .sorted(Comparator.comparing((Loja l) -> l.getMercado().getId()).thenComparing(Loja::getId))
            .map(l -> new FilialPublicaResponse(l.getMercado().getId(), l.getMercado().getNome(),
                l.getId(), l.getNome(), l.getLatitude(), l.getLongitude()))
            .toList();
    }
}
