package com.smartmarket.service;

import com.smartmarket.dto.localizacao.FilialPublicaResponse;
import com.smartmarket.model.Loja;
import com.smartmarket.repository.LojaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

/**
 * Filiais públicas por rede, com coordenadas, para o cliente calcular a distância a partir da posição do
 * navegador sem enviá-la a lugar nenhum. Só filial real (nunca a loja padrão), ativa, de mercado ativo e
 * com latitude e longitude as duas.
 */
@Service
public class FiliaisPublicasService {

    /** Quanto tempo a lista fica em memória: no máximo uma consulta ao banco a cada 10 minutos. */
    static final Duration TTL = Duration.ofMinutes(10);

    private record Instantaneo(List<FilialPublicaResponse> filiais, Instant validoAte) {
    }

    private final LojaRepository lojaRepository;
    private final Clock clock;
    private volatile Instantaneo instantaneo;

    @Autowired
    public FiliaisPublicasService(LojaRepository lojaRepository) {
        this(lojaRepository, Clock.systemUTC());
    }

    FiliaisPublicasService(LojaRepository lojaRepository, Clock clock) {
        this.lojaRepository = lojaRepository;
        this.clock = clock;
    }

    /** A lista (imutável) vem do instantâneo em memória; refaz a consulta só depois do TTL. */
    public List<FilialPublicaResponse> listar() {
        Instantaneo atual = instantaneo;
        if (atual != null && clock.instant().isBefore(atual.validoAte())) {
            return atual.filiais();
        }
        synchronized (this) {
            atual = instantaneo;
            Instant agora = clock.instant();
            if (atual == null || !agora.isBefore(atual.validoAte())) {
                atual = new Instantaneo(consultar(), agora.plus(TTL));
                instantaneo = atual;
            }
            return atual.filiais();
        }
    }

    private List<FilialPublicaResponse> consultar() {
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
