package com.smartmarket.service;

import com.smartmarket.dto.localizacao.FilialPublicaResponse;
import com.smartmarket.model.Loja;
import com.smartmarket.model.Mercado;
import com.smartmarket.repository.LojaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Filiais publicas: so lojas reais, com as duas coordenadas, de mercado ativo (o filtro e em Java). */
class FiliaisPublicasServiceTest {

    private LojaRepository lojaRepository;
    private FiliaisPublicasService service;

    @BeforeEach
    void setUp() {
        lojaRepository = mock(LojaRepository.class);
        service = new FiliaisPublicasService(lojaRepository, Clock.fixed(Instant.parse("2026-11-14T12:00:00Z"), ZoneOffset.UTC));
    }

    private static Mercado mercado(long id, String nome) {
        return Mercado.builder().id(id).nome(nome).endereco("RS").ativo(true).build();
    }

    private static Loja loja(long id, Mercado mercado, String nome, String codigo, Double lat, Double lon, boolean ativa) {
        return Loja.builder().id(id).mercado(mercado).nome(nome).codigoExterno(codigo)
            .latitude(lat).longitude(lon).ativa(ativa).build();
    }

    @Test
    void devolveSoComIdsNomesECoordenadas() {
        Mercado fort = mercado(3, "Fort Atacadista");
        when(lojaRepository.findAtivasComMercado()).thenReturn(List.of(
            loja(41, fort, "Fort Cachoeirinha", "f1", -29.95, -51.10, true)));

        assertThat(service.listar()).containsExactly(
            new FilialPublicaResponse(3L, "Fort Atacadista", 41L, "Fort Cachoeirinha", -29.95, -51.10));
    }

    @Test
    void naoDevolveALojaPadrao() {
        Mercado fort = mercado(3, "Fort Atacadista");
        when(lojaRepository.findAtivasComMercado()).thenReturn(List.of(
            loja(40, fort, "Fort padrao", Loja.CODIGO_PADRAO, -29.0, -51.0, true)));

        assertThat(service.listar()).isEmpty();
    }

    @Test
    void naoDevolveFilialSemCoordenadaOuComCoordenadaPelaMetade() {
        Mercado fort = mercado(3, "Fort Atacadista");
        when(lojaRepository.findAtivasComMercado()).thenReturn(List.of(
            loja(41, fort, "Sem nada", "f1", null, null, true),
            loja(42, fort, "So latitude", "f2", -29.0, null, true),
            loja(43, fort, "So longitude", "f3", null, -51.0, true)));

        assertThat(service.listar()).isEmpty();
    }

    @Test
    void naoDevolveLojaInativaNemDeMercadoInativo() {
        Mercado fort = mercado(3, "Fort Atacadista");
        Mercado fechado = Mercado.builder().id(4L).nome("Fechado").endereco("RS").ativo(false).build();
        when(lojaRepository.findAtivasComMercado()).thenReturn(List.of(
            loja(41, fort, "Inativa", "f1", -29.0, -51.0, false),
            loja(42, fechado, "De mercado inativo", "f2", -29.1, -51.1, true)));

        assertThat(service.listar()).isEmpty();
    }

    @Test
    void ordenaPorMercadoEDepoisPorLoja() {
        Mercado a = mercado(1, "A");
        Mercado b = mercado(2, "B");
        when(lojaRepository.findAtivasComMercado()).thenReturn(List.of(
            loja(30, b, "B2", "f2", -29.3, -51.3, true),
            loja(20, b, "B1", "f1", -29.2, -51.2, true),
            loja(10, a, "A1", "f1", -29.1, -51.1, true)));

        assertThat(service.listar()).extracting(FilialPublicaResponse::lojaId).containsExactly(10L, 20L, 30L);
    }

    @Test
    void listaVaziaDevolveListaVazia() {
        when(lojaRepository.findAtivasComMercado()).thenReturn(List.of());

        assertThat(service.listar()).isEmpty();
    }

    @Test
    void aListaDevolvidaNaoPodeSerAlterada() {
        when(lojaRepository.findAtivasComMercado()).thenReturn(List.of());

        List<FilialPublicaResponse> lista = service.listar();

        org.junit.jupiter.api.Assertions.assertThrows(UnsupportedOperationException.class, () -> lista.add(null));
    }

    /** Relogio que o teste avanca na mao. */
    private static final class RelogioMutavel extends Clock {
        private Instant agora = Instant.parse("2026-11-14T12:00:00Z");

        void avancar(java.time.Duration d) {
            agora = agora.plus(d);
        }

        @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return agora; }
    }

    @Test
    void duasChamadasDentroDoTtlConsultamOBancoUmaVezSo() {
        RelogioMutavel relogio = new RelogioMutavel();
        FiliaisPublicasService comRelogio = new FiliaisPublicasService(lojaRepository, relogio);
        when(lojaRepository.findAtivasComMercado()).thenReturn(List.of());

        comRelogio.listar();
        relogio.avancar(java.time.Duration.ofMinutes(9).plusSeconds(59));
        comRelogio.listar();

        verify(lojaRepository, times(1)).findAtivasComMercado();
    }

    @Test
    void passadoOTtlDeDezMinutosConsultaDeNovoEPegaAMudanca() {
        RelogioMutavel relogio = new RelogioMutavel();
        FiliaisPublicasService comRelogio = new FiliaisPublicasService(lojaRepository, relogio);
        Mercado fort = mercado(3, "Fort Atacadista");
        when(lojaRepository.findAtivasComMercado()).thenReturn(List.of());
        assertThat(comRelogio.listar()).isEmpty();

        when(lojaRepository.findAtivasComMercado()).thenReturn(List.of(
            loja(41, fort, "Fort Cachoeirinha", "f1", -29.95, -51.10, true)));
        relogio.avancar(java.time.Duration.ofMinutes(10));

        assertThat(comRelogio.listar()).hasSize(1);
        verify(lojaRepository, times(2)).findAtivasComMercado();
    }
}
