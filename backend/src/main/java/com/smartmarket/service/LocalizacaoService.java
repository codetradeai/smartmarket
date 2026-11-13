package com.smartmarket.service;

import com.smartmarket.dto.localizacao.LocalizacaoResponse;
import com.smartmarket.dto.localizacao.LojaProximaResponse;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Loja;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.LojaRepository;
import com.smartmarket.repository.UsuarioRepository;
import com.smartmarket.service.geo.Cep;
import com.smartmarket.service.geo.Haversine;
import com.smartmarket.service.geo.LocalizacaoCep;
import com.smartmarket.service.geo.ResolvedorCep;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Localização do usuário logado (CEP, cidade, UF, coordenadas, loja preferida) e as lojas que o
 * atendem. A localização é dado pessoal (LGPD): o usuário troca e apaga quando quiser.
 */
@Service
@RequiredArgsConstructor
public class LocalizacaoService {

    private final UsuarioRepository usuarioRepository;
    private final LojaRepository lojaRepository;
    private final ResolvedorCep resolvedorCep;
    // @Transactional não vale em chamada da própria classe; o template abre a transação curta do trocarCep.
    private final TransactionTemplate transacao;

    @Transactional(readOnly = true)
    public LocalizacaoResponse obter(String email) {
        return LocalizacaoResponse.from(usuario(email));
    }

    /**
     * Troca o CEP e resolve a localização de novo. A consulta externa roda fora de transação e,
     * se falhar ou o CEP não existir, a localização antiga é descartada (cidade/UF/coordenadas
     * ficam nulas) em vez de ficar apontando para o CEP anterior.
     */
    public LocalizacaoResponse trocarCep(String email, String cepInformado) {
        if (!usuarioRepository.existsByEmail(email)) {
            throw new ResourceNotFoundException("Usuario nao encontrado");
        }
        String cep = Cep.normalizar(cepInformado);
        LocalizacaoCep local = resolvedorCep.resolver(cep).orElse(null);

        // Grava só a localização, numa transação curta: o usuário não é carregado antes da espera
        // pela consulta, então nada que mudou nesse intervalo (ex.: o papel) é sobrescrito.
        Integer alteradas = transacao.execute(status -> usuarioRepository.atualizarLocalizacaoPorEmail(
            email, cep,
            local == null ? null : local.cidade(),
            local == null ? null : local.uf(),
            local == null ? null : local.latitude(),
            local == null ? null : local.longitude()));
        if (alteradas == null || alteradas == 0) {
            // O usuário foi apagado durante a consulta.
            throw new ResourceNotFoundException("Usuario nao encontrado");
        }
        return LocalizacaoResponse.from(usuario(email));
    }

    /** {@code lojaId} nulo remove a preferência. Loja inexistente ou inativa dá 404. */
    @Transactional
    public LocalizacaoResponse definirLojaPreferida(String email, Long lojaId) {
        Usuario usuario = usuario(email);
        if (lojaId == null) {
            usuario.setLojaPreferida(null);
        } else {
            Loja loja = lojaRepository.findById(lojaId)
                .filter(l -> Boolean.TRUE.equals(l.getAtiva()))
                .orElseThrow(() -> new ResourceNotFoundException("Loja", lojaId));
            usuario.setLojaPreferida(loja);
        }
        return LocalizacaoResponse.from(usuarioRepository.save(usuario));
    }

    /**
     * Exclusão da localização (LGPD): zera CEP, cidade, UF e coordenadas, sem apagar a conta.
     * A loja preferida não é dado de localização e fica como está.
     */
    @Transactional
    public void excluir(String email) {
        Usuario usuario = usuario(email);
        usuario.setCep(null);
        usuario.setCidade(null);
        usuario.setUf(null);
        usuario.setLatitude(null);
        usuario.setLongitude(null);
        usuarioRepository.save(usuario);
    }

    /**
     * A loja que atende o usuário em cada rede. Ordem de decisão, por mercado:
     * 1) a loja preferida do usuário, se for deste mercado e estiver ativa;
     * 2) a filial (não padrão) mais próxima, se o usuário tem coordenadas e existe filial com coordenadas;
     * 3) a loja padrão do mercado (codigo_externo = 'padrao').
     * Mercado sem nenhuma loja utilizável não aparece. Ordena por distância (sem distância no fim).
     */
    @Transactional(readOnly = true)
    public List<LojaProximaResponse> lojasProximas(String email) {
        Usuario usuario = usuario(email);
        Long preferidaId = usuario.getLojaPreferida() == null ? null : usuario.getLojaPreferida().getId();
        boolean temLocal = usuario.getLatitude() != null && usuario.getLongitude() != null;

        Map<Long, List<Loja>> porMercado = new LinkedHashMap<>();
        for (Loja loja : lojaRepository.findAtivasComMercado()) {
            porMercado.computeIfAbsent(loja.getMercado().getId(), id -> new ArrayList<>()).add(loja);
        }

        return porMercado.values().stream()
            .map(lojas -> escolher(lojas, usuario, temLocal, preferidaId))
            .flatMap(Optional::stream)
            .sorted(Comparator
                .comparing(LojaProximaResponse::distanciaKm, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(LojaProximaResponse::mercadoNome))
            .toList();
    }

    private Optional<LojaProximaResponse> escolher(List<Loja> lojas, Usuario usuario, boolean temLocal, Long preferidaId) {
        Optional<Loja> preferida = lojas.stream().filter(l -> l.getId().equals(preferidaId)).findFirst();
        if (preferida.isPresent()) {
            return Optional.of(resposta(preferida.get(), usuario, temLocal, true));
        }
        if (temLocal) {
            Optional<Loja> maisProxima = lojas.stream()
                .filter(l -> !l.ehPadrao() && l.getLatitude() != null && l.getLongitude() != null)
                .min(Comparator.comparingDouble(l -> Haversine.distanciaKm(
                    usuario.getLatitude(), usuario.getLongitude(), l.getLatitude(), l.getLongitude())));
            if (maisProxima.isPresent()) {
                return Optional.of(resposta(maisProxima.get(), usuario, true, false));
            }
        }
        return lojas.stream().filter(Loja::ehPadrao).findFirst()
            .map(padrao -> resposta(padrao, usuario, temLocal, false));
    }

    private LojaProximaResponse resposta(Loja loja, Usuario usuario, boolean temLocal, boolean preferida) {
        Double distancia = null;
        if (temLocal && loja.getLatitude() != null && loja.getLongitude() != null) {
            double km = Haversine.distanciaKm(
                usuario.getLatitude(), usuario.getLongitude(), loja.getLatitude(), loja.getLongitude());
            distancia = Math.round(km * 100.0) / 100.0;
        }
        // As coordenadas da loja só saem como par e nunca na loja padrão: ela representa a rede, não um
        // lugar, e uma coordenada nela seria um ponto enganoso no mapa ("Como chegar" do catálogo).
        boolean expoeCoordenadas = !loja.ehPadrao() && loja.getLatitude() != null && loja.getLongitude() != null;
        return new LojaProximaResponse(
            loja.getMercado().getId(), loja.getMercado().getNome(),
            loja.getId(), loja.getNome(), loja.getEndereco(), loja.getCidade(), loja.getUf(),
            expoeCoordenadas ? loja.getLatitude() : null, expoeCoordenadas ? loja.getLongitude() : null,
            distancia, loja.ehPadrao(), preferida);
    }

    private Usuario usuario(String email) {
        return usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));
    }
}
