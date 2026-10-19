package com.smartmarket.service;

import com.smartmarket.dto.promocao.PromocaoRequest;
import com.smartmarket.dto.promocao.PromocaoResponse;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Promocao;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.PromocaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PromocaoService {

    private final PromocaoRepository promocaoRepository;
    private final ProdutoRepository produtoRepository;
    private final MercadoRepository mercadoRepository;

    @Transactional(readOnly = true)
    public List<PromocaoResponse> listar() {
        return promocaoRepository.findAll().stream()
            .map(PromocaoResponse::from)
            .toList();
    }

    @Transactional
    public PromocaoResponse criar(PromocaoRequest request) {
        if (request.getDataInicio().isAfter(request.getDataFim())) {
            throw new IllegalArgumentException(
                "A data de inicio nao pode ser posterior a data de fim.");
        }
        if (request.getValorPromocional().compareTo(request.getValorOriginal()) > 0) {
            throw new IllegalArgumentException(
                "O valor promocional nao pode ser maior que o valor original.");
        }

        Produto produto = produtoRepository.findById(request.getProdutoId())
            .orElseThrow(() -> new ResourceNotFoundException("Produto", request.getProdutoId()));
        Mercado mercado = mercadoRepository.findById(request.getMercadoId())
            .orElseThrow(() -> new ResourceNotFoundException("Mercado", request.getMercadoId()));

        Promocao promocao = Promocao.builder()
            .produto(produto)
            .mercado(mercado)
            .valorOriginal(request.getValorOriginal())
            .valorPromocional(request.getValorPromocional())
            .dataInicio(request.getDataInicio())
            .dataFim(request.getDataFim())
            .build();

        return PromocaoResponse.from(promocaoRepository.save(promocao));
    }
}
