package com.smartmarket.controller;

import com.smartmarket.service.AdminService;
import com.smartmarket.service.ProdutoService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Paginação (LIMIT/OFFSET) só é estável se a ordenação for total. Nomes de produto se repetem
 * (mesmo item em redes diferentes) e usuários podem ter o mesmo nome: sem desempate por id, o
 * banco pode devolver os empatados em ordem diferente a cada página, repetindo ou perdendo itens.
 */
class PaginacaoDesempatePorIdTest {

    private final ProdutoService produtoService = mock(ProdutoService.class);
    private final AdminService adminService = mock(AdminService.class);

    private Sort ordenacaoDeProdutos(String sort) {
        reset(produtoService);   // vários sorts por teste: cada chamada confere só a sua invocação
        when(produtoService.buscar(any(), any(), any())).thenReturn(Page.empty());
        new ProdutoController(produtoService).listar(null, null, sort, 0, 10);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(produtoService).buscar(isNull(), isNull(), pageable.capture());
        return pageable.getValue().getSort();
    }

    private static List<String> descrever(Sort sort) {
        return sort.stream().map(o -> o.getProperty() + "," + o.getDirection().name().toLowerCase()).toList();
    }

    @Test
    void ordenacaoPadraoDeProdutosDesempataPorId() {
        assertThat(descrever(ordenacaoDeProdutos("nome,asc"))).containsExactly("nome,asc", "id,asc");
    }

    @Test
    void ordenacaoPorOutroCampoEDirecaoDesempataPorIdCrescente() {
        assertThat(descrever(ordenacaoDeProdutos("categoria,desc"))).containsExactly("categoria,desc", "id,asc");
        assertThat(descrever(ordenacaoDeProdutos("marca"))).containsExactly("marca,asc", "id,asc");
    }

    @Test
    void ordenacaoMultiplaMantemAOrdemDoClienteEAcrescentaOId() {
        assertThat(descrever(ordenacaoDeProdutos("categoria,asc,nome,desc")))
            .containsExactly("categoria,asc", "nome,desc", "id,asc");
    }

    @Test
    void sortVazioUsaNomeEDesempataPorId() {
        assertThat(descrever(ordenacaoDeProdutos(""))).containsExactly("nome,asc", "id,asc");
    }

    @Test
    void quandoOClienteJaOrdenaPorIdNaoDuplica() {
        assertThat(descrever(ordenacaoDeProdutos("id,desc"))).containsExactly("id,desc");
        assertThat(descrever(ordenacaoDeProdutos("nome,asc,id,desc"))).containsExactly("nome,asc", "id,desc");
    }

    @Test
    void listagemDeUsuariosOrdenaPorNomeEDesempataPorId() {
        when(adminService.listarUsuarios(any())).thenReturn(Page.empty());
        new AdminController(adminService).listarUsuarios(0, 20);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(adminService).listarUsuarios(pageable.capture());

        assertThat(descrever(pageable.getValue().getSort())).containsExactly("nome,asc", "id,asc");
    }
}
