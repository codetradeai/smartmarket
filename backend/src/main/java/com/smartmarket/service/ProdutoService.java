package com.smartmarket.service;

import com.smartmarket.dto.produto.ProdutoRequest;
import com.smartmarket.dto.produto.ProdutoResponse;
import com.smartmarket.exception.ProdutoNaoEncontradoException;
import com.smartmarket.model.Produto;
import com.smartmarket.repository.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProdutoService {

    private final ProdutoRepository produtoRepository;

    @Transactional(readOnly = true)
    public Page<ProdutoResponse> buscar(String nome, String categoria, Pageable pageable) {
        Specification<Produto> spec = (root, query, cb) -> cb.conjunction();

        if (nome != null && !nome.isBlank()) {
            spec = spec.and(ProdutoSpecification.withNome(nome));
        }
        if (categoria != null && !categoria.isBlank()) {
            spec = spec.and(ProdutoSpecification.withCategoria(categoria));
        }

        return produtoRepository.findAll(spec, pageable).map(ProdutoResponse::from);
    }

    @Transactional(readOnly = true)
    public ProdutoResponse buscarPorId(Long id) {
        return produtoRepository.findById(id)
            .map(ProdutoResponse::from)
            .orElseThrow(() -> new ProdutoNaoEncontradoException(id));
    }

    @Transactional
    public ProdutoResponse criar(ProdutoRequest request) {
        Produto produto = Produto.builder()
            .nome(request.getNome())
            .marca(request.getMarca())
            .quantidade(request.getQuantidade())
            .unidade(request.getUnidade())
            .codigoBarras(request.getCodigoBarras())
            .categoria(request.getCategoria())
            .imagemUrl(request.getImagemUrl())
            .build();

        return ProdutoResponse.from(produtoRepository.save(produto));
    }

    @Transactional
    public ProdutoResponse atualizar(Long id, ProdutoRequest request) {
        Produto produto = produtoRepository.findById(id)
            .orElseThrow(() -> new ProdutoNaoEncontradoException(id));

        produto.setNome(request.getNome());
        produto.setMarca(request.getMarca());
        produto.setQuantidade(request.getQuantidade());
        produto.setUnidade(request.getUnidade());
        produto.setCodigoBarras(request.getCodigoBarras());
        produto.setCategoria(request.getCategoria());
        produto.setImagemUrl(request.getImagemUrl());

        return ProdutoResponse.from(produtoRepository.save(produto));
    }

    @Transactional
    public void remover(Long id) {
        Produto produto = produtoRepository.findById(id)
            .orElseThrow(() -> new ProdutoNaoEncontradoException(id));

        produtoRepository.delete(produto);
    }
}
