package com.smartmarket.service;

import com.smartmarket.dto.preco.PrecosVinculadosResponse;
import com.smartmarket.dto.preco.PrecosVinculadosResponse.PrecoVinculado;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Preco;
import com.smartmarket.model.Produto;
import com.smartmarket.model.VinculoProduto;
import com.smartmarket.repository.PrecoRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.VinculoProdutoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VinculoProdutoService {

    public static final String ORIGEM_PROPRIA = "proprio";

    private final ProdutoRepository produtoRepository;
    private final PrecoRepository precoRepository;
    private final VinculoProdutoRepository vinculoRepository;

    /**
     * Preço mais recente, por mercado, do produto e dos produtos vinculados (somente vínculos
     * confirmados, vizinhos diretos). Vínculos em "revisar" nunca aparecem aqui.
     */
    @Transactional(readOnly = true)
    public PrecosVinculadosResponse precosVinculados(Long produtoId) {
        Produto produto = produtoRepository.findById(produtoId)
            .orElseThrow(() -> new ResourceNotFoundException("Produto", produtoId));

        Map<Long, String> origemPorProduto = new LinkedHashMap<>();
        Map<Long, Produto> produtos = new LinkedHashMap<>();
        origemPorProduto.put(produto.getId(), ORIGEM_PROPRIA);
        produtos.put(produto.getId(), produto);
        for (VinculoProduto v : vinculoRepository.findDoProdutoComStatus(produtoId, VinculoProduto.STATUS_CONFIRMADO)) {
            Produto outro = v.getProdutoA().getId().equals(produtoId) ? v.getProdutoB() : v.getProdutoA();
            origemPorProduto.putIfAbsent(outro.getId(), v.getOrigem());
            produtos.putIfAbsent(outro.getId(), outro);
        }

        List<PrecoVinculado> saida = new ArrayList<>();
        Set<String> vistos = new HashSet<>();
        // Historico completo (mais recente primeiro, desempate por id): o par produto x mercado so
        // entra se a linha mais recente estiver disponivel; filtrar disponivel = true na consulta
        // traria de volta o preco antigo de quem deixou de vender o item (ver PrecosVigentes).
        for (Preco p : PrecosVigentes.descartandoParesIndisponiveis(
                precoRepository.findByProdutoIdInOrderByColetadoEmDescIdDesc(origemPorProduto.keySet()))) {
            // a lista vem do mais recente para o mais antigo: vale o primeiro de cada (produto, mercado)
            Long donoId = p.getProduto().getId();
            if (!vistos.add(donoId + ":" + p.getMercado().getId())) {
                continue;
            }
            Produto dono = produtos.get(donoId);
            saida.add(PrecoVinculado.builder()
                .produtoId(dono.getId())
                .produtoNome(dono.getNome())
                .mercadoId(p.getMercado().getId())
                .mercadoNome(p.getMercado().getNome())
                .valor(p.getValor())
                .coletadoEm(p.getColetadoEm())
                .origemVinculo(origemPorProduto.get(dono.getId()))
                .build());
        }
        saida.sort(Comparator.comparing(PrecoVinculado::getValor));

        return PrecosVinculadosResponse.builder()
            .produtoId(produto.getId())
            .produtoNome(produto.getNome())
            .precos(saida)
            .build();
    }
}
