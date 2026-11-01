package com.smartmarket.service;

import com.smartmarket.dto.mercado.MercadoRequest;
import com.smartmarket.dto.mercado.MercadoResponse;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Mercado;
import com.smartmarket.repository.MercadoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MercadoService {

    private final MercadoRepository mercadoRepository;

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

        return MercadoResponse.from(mercadoRepository.save(mercado));
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
        mercadoRepository.delete(mercado);
    }
}
