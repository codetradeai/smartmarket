package com.smartmarket.service;

import com.smartmarket.dto.alerta.AlertaGravado;
import com.smartmarket.dto.alerta.AlertaRequest;
import com.smartmarket.dto.alerta.AlertaResponse;
import com.smartmarket.dto.alerta.AtualizarAlertaRequest;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Alerta;
import com.smartmarket.model.Preco;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.AlertaRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AlertaService {

    private final AlertaRepository alertaRepository;
    private final ProdutoRepository produtoRepository;
    private final ConsultaMenorPreco consultaMenorPreco;
    private final UsuarioAutenticado usuarioAutenticado;

    @Transactional(readOnly = true)
    public List<AlertaResponse> listarMeus() {
        Usuario usuario = usuarioAutenticado.atual();
        return alertaRepository.findByUsuarioIdAndAtivoTrue(usuario.getId()).stream()
            .map(this::paraResposta)
            .toList();
    }

    @Transactional
    public AlertaGravado salvar(AlertaRequest request) {
        Usuario usuario = usuarioAutenticado.atual();
        Produto produto = produtoRepository.findById(request.getProdutoId())
            .orElseThrow(() -> new ResourceNotFoundException("Produto", request.getProdutoId()));

        Optional<Alerta> existente = alertaRepository.findByUsuarioIdAndProdutoId(usuario.getId(), produto.getId());
        if (existente.isPresent()) {
            Alerta alerta = existente.get();
            alerta.setPrecoAlvo(request.getPrecoAlvo());
            alerta.setAtivo(true);
            return new AlertaGravado(paraResposta(alertaRepository.save(alerta)), false);
        }

        Alerta alerta = Alerta.builder()
            .usuario(usuario)
            .produto(produto)
            .precoAlvo(request.getPrecoAlvo())
            .ativo(true)
            .build();
        return new AlertaGravado(paraResposta(alertaRepository.save(alerta)), true);
    }

    @Transactional
    public AlertaResponse atualizar(Long id, AtualizarAlertaRequest request) {
        Alerta alerta = buscarDoUsuario(id);
        alerta.setPrecoAlvo(request.getPrecoAlvo());
        alerta.setAtivo(true);
        return paraResposta(alertaRepository.save(alerta));
    }

    @Transactional
    public void desativar(Long id) {
        Alerta alerta = buscarDoUsuario(id);
        alerta.setAtivo(false);
        alertaRepository.save(alerta);
    }

    private Alerta buscarDoUsuario(Long id) {
        Usuario usuario = usuarioAutenticado.atual();
        return alertaRepository.findById(id)
            .filter(alerta -> alerta.getUsuario().getId().equals(usuario.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Alerta", id));
    }

    private AlertaResponse paraResposta(Alerta alerta) {
        Optional<Preco> menor = consultaMenorPreco.menorDisponivel(alerta.getProduto().getId());
        BigDecimal menorValor = menor.map(Preco::getValor).orElse(null);
        boolean atingido = menorValor != null && menorValor.compareTo(alerta.getPrecoAlvo()) <= 0;

        return AlertaResponse.builder()
            .id(alerta.getId())
            .produtoId(alerta.getProduto().getId())
            .produtoNome(alerta.getProduto().getNome())
            .precoAlvo(alerta.getPrecoAlvo())
            .ativo(alerta.getAtivo())
            .menorPreco(menorValor)
            .mercadoMenorPrecoId(menor.map(preco -> preco.getMercado().getId()).orElse(null))
            .mercadoMenorPrecoNome(menor.map(preco -> preco.getMercado().getNome()).orElse(null))
            .atingido(atingido)
            .createdAt(alerta.getCreatedAt())
            .build();
    }
}
