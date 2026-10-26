package com.smartmarket.controller;

import com.smartmarket.dto.lista.ComparacaoCestaResponse;
import com.smartmarket.dto.lista.ListaCompraResponse;
import com.smartmarket.service.ListaCompraService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ListaCompraControllerIntegrationTest {
    @Autowired MockMvc mockMvc;
    @MockitoBean ListaCompraService service;

    @Test
    void listar_SemToken_DeveRetornar401() throws Exception {
        mockMvc.perform(get("/api/listas"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void renomear_ComToken_DevePreservarContratoDaMain() throws Exception {
        when(service.renomear(eq(3L), any()))
            .thenReturn(ListaCompraResponse.builder().id(3L).nome("Festa").build());

        mockMvc.perform(put("/api/listas/3").with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Festa\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(3))
            .andExpect(jsonPath("$.nome").value("Festa"));
    }

    @Test
    void renomear_SemNome_DeveRetornar400() throws Exception {
        mockMvc.perform(put("/api/listas/3").with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"\"}"))
            .andExpect(status().isBadRequest());
        verify(service, never()).renomear(anyLong(), any());
    }

    @Test
    void atualizarItem_DeveManterRespostaDaMain() throws Exception {
        when(service.atualizarItem(eq(3L), eq(7L), any()))
            .thenReturn(ListaCompraResponse.builder().id(3L).nome("Compras").build());

        mockMvc.perform(put("/api/listas/3/itens/7").with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"produtoId\":9,\"quantidade\":5}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nome").value("Compras"));
    }

    @Test
    void atualizarItem_QuantidadeInvalida_DeveRetornar400() throws Exception {
        mockMvc.perform(put("/api/listas/3/itens/7").with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"produtoId\":9,\"quantidade\":0}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void comparar_DevePreservarRotaDaMain() throws Exception {
        when(service.compararCesta(3L))
            .thenReturn(ComparacaoCestaResponse.builder().listaId(3L).build());
        mockMvc.perform(get("/api/listas/3/comparar").with(jwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.listaId").value(3));
    }
}
