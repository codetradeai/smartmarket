package com.smartmarket.service;

import com.smartmarket.dto.favorito.FavoritoGravado;
import com.smartmarket.dto.favorito.FavoritoRequest;
import com.smartmarket.dto.favorito.FavoritoResponse;
import com.smartmarket.dto.produto.ProdutoComPrecosResponse;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Favorito;
import com.smartmarket.model.FavoritoProduto;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.FavoritoProdutoRepository;
import com.smartmarket.repository.FavoritoRepository;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FavoritoService {

    private final FavoritoRepository favoritoRepository;
    private final FavoritoProdutoRepository favoritoProdutoRepository;
    private final MercadoRepository mercadoRepository;
    private final ProdutoRepository produtoRepository;
    private final PrecoService precoService;
    private final UsuarioAutenticado usuarioAutenticado;

    @Transactional(readOnly = true)
    public List<FavoritoResponse> listarMeus() {
        Usuario usuario = usuarioAutenticado.atual();
        return favoritoRepository.findByUsuarioId(usuario.getId()).stream()
            .map(FavoritoResponse::from)
            .toList();
    }

    @Transactional
    public FavoritoGravado favoritar(FavoritoRequest request) {
        Usuario usuario = usuarioAutenticado.atual();
        Mercado mercado = mercadoRepository.findById(request.getMercadoId())
            .orElseThrow(() -> new ResourceNotFoundException("Mercado", request.getMercadoId()));

        if (!Boolean.TRUE.equals(mercado.getAtivo())) {
            throw new IllegalArgumentException("Mercado inativo nao pode ser favoritado.");
        }

        return favoritoRepository.findByUsuarioIdAndMercadoId(usuario.getId(), mercado.getId())
            .map(existente -> new FavoritoGravado(FavoritoResponse.from(existente), false))
            .orElseGet(() -> gravarNovo(usuario, mercado));
    }

    @Transactional
    public void desfavoritar(Long mercadoId) {
        Usuario usuario = usuarioAutenticado.atual();
        Favorito favorito = favoritoRepository.findByUsuarioIdAndMercadoId(usuario.getId(), mercadoId)
            .orElseThrow(() -> new ResourceNotFoundException("Favorito do mercado", mercadoId));
        favoritoRepository.delete(favorito);
    }

    @Transactional(readOnly = true)
    public List<ProdutoComPrecosResponse> listarProdutosFavoritos() {
        Usuario usuario = usuarioAutenticado.atual();
        List<FavoritoProduto> favs = favoritoProdutoRepository.findByUsuarioId(usuario.getId());
        return favs.stream()
            .map(fp -> precoService.buscarPrecosPorProduto(fp.getProduto().getId()))
            .toList();
    }

    @Transactional
    public void favoritarProduto(Long produtoId) {
        Usuario usuario = usuarioAutenticado.atual();
        Produto produto = produtoRepository.findById(produtoId)
            .orElseThrow(() -> new ResourceNotFoundException("Produto", produtoId));

        if (!favoritoProdutoRepository.existsByUsuarioIdAndProdutoId(usuario.getId(), produtoId)) {
            favoritoProdutoRepository.save(FavoritoProduto.builder()
                .usuario(usuario)
                .produto(produto)
                .build());
        }
    }

    @Transactional
    public void desfavoritarProduto(Long produtoId) {
        Usuario usuario = usuarioAutenticado.atual();
        FavoritoProduto fav = favoritoProdutoRepository.findByUsuarioIdAndProdutoId(usuario.getId(), produtoId)
            .orElseThrow(() -> new ResourceNotFoundException("Produto favorito", produtoId));
        favoritoProdutoRepository.delete(fav);
    }

    private FavoritoGravado gravarNovo(Usuario usuario, Mercado mercado) {
        Favorito favorito = Favorito.builder()
            .usuario(usuario)
            .mercado(mercado)
            .build();
        return new FavoritoGravado(FavoritoResponse.from(favoritoRepository.save(favorito)), true);
    }
}
