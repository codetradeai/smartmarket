package com.smartmarket.service;

import com.smartmarket.dto.mercado.MercadoRequest;
import com.smartmarket.dto.mercado.MercadoResponse;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Loja;
import com.smartmarket.model.Mercado;
import com.smartmarket.repository.LojaRepository;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MercadoService {

    private final MercadoRepository mercadoRepository;
    private final LojaRepository lojaRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<MercadoResponse> listarAtivos() {
        return mercadoRepository.findByAtivoTrue().stream()
            .map(MercadoResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<MercadoResponse> listarTodos() {
        return mercadoRepository.findAll().stream()
            .map(MercadoResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public MercadoResponse buscarPorId(Long id) {
        return mercadoRepository.findById(id)
            .map(MercadoResponse::from)
            .orElseThrow(() -> new ResourceNotFoundException("Mercado", id));
    }

    @Transactional
    public MercadoResponse criar(MercadoRequest request) {
        Mercado mercado = Mercado.builder()
            .nome(request.getNome())
            .endereco(request.getEndereco())
            .logoUrl(request.getLogoUrl())
            .ativo(true)
            .build();

        mercado = mercadoRepository.save(mercado);

        // Todo mercado tem uma loja "padrao": e nela que caem os precos coletados sem filial e e
        // ela que atende quem ainda nao informou CEP. Nasce na mesma transacao do mercado.
        lojaRepository.save(Loja.builder()
            .mercado(mercado)
            .nome(mercado.getNome())
            .endereco(mercado.getEndereco())
            .codigoExterno(Loja.CODIGO_PADRAO)
            .ativa(true)
            .build());

        return MercadoResponse.from(mercado);
    }

    @Transactional
    public MercadoResponse atualizar(Long id, MercadoRequest request) {
        Mercado mercado = mercadoRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Mercado", id));

        mercado.setNome(request.getNome());
        mercado.setEndereco(request.getEndereco());
        mercado.setLogoUrl(request.getLogoUrl());

        return MercadoResponse.from(mercadoRepository.save(mercado));
    }

    @Transactional
    public void remover(Long id) {
        Mercado mercado = mercadoRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Mercado", id));
        // As lojas nascem com o mercado (a padrao, ao menos) e a FK loja -> mercado nao tem cascata:
        // tira a preferencia de quem escolheu uma delas e apaga as lojas antes do mercado. Preco ja
        // coletado continua barrando a exclusao (FK de preco_loja/preco), como antes (409).
        List<Loja> lojas = lojaRepository.findByMercadoIdOrderByIdAsc(id);
        if (!lojas.isEmpty()) {
            usuarioRepository.limparLojaPreferida(lojas.stream().map(Loja::getId).toList());
            lojaRepository.deleteAll(lojas);
            lojaRepository.flush();
        }
        mercadoRepository.delete(mercado);
    }
}
