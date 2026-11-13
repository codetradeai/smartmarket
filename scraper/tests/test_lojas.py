"""Lista curada de lojas, validação do carregador e geocodificação única por CEP (tudo offline)."""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

import carregar_lojas
import geocodificar_lojas as geo
from pipeline import ErroIngestao

LOJA_OK = {"mercado": "asun", "nome": "Asun Teste", "endereco": "Rua A, 1", "cep": "90010-000", "cidade": "Porto Alegre",
           "uf": "rs", "codigo_externo": "1500", "fonte_url": "https://exemplo.test/lojas", "latitude": None,
           "longitude": None}
CONTATO = {"SMARTMARKET_CONTATO": "github.com/exemplo/projeto"}


def brasilapi(lat="-30.03", lng="-51.23", cidade="Porto Alegre", uf="RS"):
    corpo = {"cep": "90010000", "city": cidade, "state": uf}
    if lat is not None:
        corpo["location"] = {"type": "Point", "coordinates": {"latitude": lat, "longitude": lng}}
    return corpo


class BuscaFalsa:
    """Responde por URL e conta as chamadas; um valor Exception é levantado."""

    def __init__(self, respostas):
        self.respostas = respostas
        self.chamadas = []

    def __call__(self, url):
        self.chamadas.append(url)
        resposta = self.respostas.get(url, None)
        if isinstance(resposta, Exception):
            raise resposta
        return resposta


class ValidacaoDeLojaTest(unittest.TestCase):
    def test_loja_valida_e_normalizada(self):
        loja = carregar_lojas.validar_loja(LOJA_OK)
        self.assertEqual((loja["cep"], loja["uf"], loja["codigo_externo"]), ("90010000", "RS", "1500"))

    def test_cep_aceita_com_ou_sem_hifen_e_rejeita_o_resto(self):
        self.assertEqual(carregar_lojas.normalizar_cep("90010-000"), "90010000")
        self.assertEqual(carregar_lojas.normalizar_cep("90010000"), "90010000")
        for ruim in ("9001000", "900100000", "9001-0000", "abcdefgh", "90010 000", None):
            with self.subTest(ruim), self.assertRaises(ValueError):
                carregar_lojas.normalizar_cep(ruim)

    def test_campos_obrigatorios(self):
        for campo in carregar_lojas.OBRIGATORIOS:
            with self.subTest(campo), self.assertRaisesRegex(ValueError, campo):
                carregar_lojas.validar_loja({**LOJA_OK, campo: None})

    def test_padrao_e_reservado_e_valores_invalidos_sao_recusados(self):
        casos = {"codigo_externo_reservado": {"codigo_externo": "padrao"}, "uf_invalida": {"uf": "RSS"},
                 "latitude_invalida": {"latitude": 91, "longitude": 0},
                 "longitude_invalida": {"latitude": 0, "longitude": 181},
                 "latitude_e_longitude_juntas": {"latitude": -30.0, "longitude": None},
                 "cep_invalido": {"cep": "123"}}
        for motivo, mudanca in casos.items():
            with self.subTest(motivo), self.assertRaisesRegex(ValueError, motivo):
                carregar_lojas.validar_loja({**LOJA_OK, **mudanca})

    def test_loja_nao_objeto_e_texto_longo_demais(self):
        with self.assertRaisesRegex(ValueError, "loja_nao_objeto"):
            carregar_lojas.validar_loja("x")
        with self.assertRaisesRegex(ValueError, "nome_longo_demais"):
            carregar_lojas.validar_loja({**LOJA_OK, "nome": "x" * 300})

    def test_cep_vazio_vira_nulo(self):
        self.assertIsNone(carregar_lojas.validar_loja({**LOJA_OK, "cep": ""})["cep"])

    def test_mercados_conhecidos_mapeiam_para_os_ids_da_rotina(self):
        ids = {r: carregar_lojas.mercado_id_da_rede(r) for r in ("carrefour", "asun", "atacadao", "master", "stok")}
        self.assertEqual(ids, {"carrefour": 2, "asun": 3, "atacadao": 4, "master": 5, "stok": 8})
        with self.assertRaisesRegex(ValueError, "mercado_desconhecido"):
            carregar_lojas.mercado_id_da_rede("rede_inexistente")


class ArquivosVersionadosTest(unittest.TestCase):
    def test_lista_curada_valida_e_so_tem_fonte_publica(self):
        lojas = carregar_lojas.ler_lojas()
        self.assertGreaterEqual(len(lojas), 1)
        cavalhada = next(l for l in lojas if l["codigo_externo"] == "1540")
        self.assertEqual((cavalhada["mercado"], cavalhada["cep"], cavalhada["uf"]), ("asun", "91740001", "RS"))
        bruto = json.loads(carregar_lojas.ARQUIVO_PADRAO.read_text(encoding="utf-8"))
        for loja in bruto["lojas"]:
            self.assertTrue(loja["fonte_url"].startswith("https://"), loja["nome"])

    def test_modelo_cobre_as_redes_e_nao_e_carregavel(self):
        caminho = carregar_lojas.ARQUIVO_PADRAO.with_name("lojas_modelo.json")
        bruto = json.loads(caminho.read_text(encoding="utf-8"))
        self.assertEqual({l["mercado"] for l in bruto["lojas"]},
                         {"fort", "carrefour", "asun", "atacadao", "master", "zaffari", "rissul", "stok"})
        with self.assertRaisesRegex(ErroIngestao, "lojas_invalidas"):
            carregar_lojas.ler_lojas(caminho)

    def test_arquivo_com_duplicata_e_mercado_desconhecido_reporta_todos_os_problemas(self):
        with tempfile.TemporaryDirectory() as pasta:
            caminho = Path(pasta) / "lojas.json"
            caminho.write_text(json.dumps({"lojas": [LOJA_OK, LOJA_OK, {**LOJA_OK, "mercado": "x"}]}), encoding="utf-8")
            with self.assertRaises(ErroIngestao) as ctx:
                carregar_lojas.ler_lojas(caminho)
        self.assertIn("lojas[1]: loja_duplicada_no_arquivo", str(ctx.exception))
        self.assertIn("lojas[2]: mercado_desconhecido", str(ctx.exception))

    def test_cli_recusa_arquivo_invalido_sem_tocar_no_banco(self):
        saida = carregar_lojas.main(["--arquivo", str(carregar_lojas.ARQUIVO_PADRAO.with_name("lojas_modelo.json"))])
        self.assertEqual(saida, 1)

    def test_carga_recusa_dsn_remoto(self):
        with self.assertRaises(ErroIngestao):
            carregar_lojas.carregar_lojas(carregar_lojas.ler_lojas(), dsn="host=example.com dbname=smartmarket")


class GeocodificacaoTest(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.addCleanup(self.pasta.cleanup)
        self.arquivo = Path(self.pasta.name) / "lojas.json"
        self.pausas = []

    def gravar(self, *lojas):
        self.arquivo.write_text(json.dumps({"versao": 1, "lojas": list(lojas)}), encoding="utf-8")

    def ler(self):
        return json.loads(self.arquivo.read_text(encoding="utf-8"))["lojas"]

    def rodar(self, busca, **kw):
        return geo.geocodificar_arquivo(self.arquivo, buscar=busca, dormir=self.pausas.append, **kw)

    def test_resolve_pela_brasilapi_grava_no_arquivo_e_nao_repete_consulta(self):
        self.gravar(LOJA_OK)
        busca = BuscaFalsa({geo.URL_BRASILAPI.format(cep="90010000"): brasilapi()})

        resumo = self.rodar(busca)
        loja = self.ler()[0]

        self.assertEqual(resumo["resolvidas"], 1)
        self.assertEqual((loja["latitude"], loja["longitude"]), (-30.03, -51.23))
        self.assertEqual(loja["geocodificacao"]["status"], "resolvida")
        self.assertEqual(loja["geocodificacao"]["fonte"], "brasilapi_v2")
        # Segunda execucao: a loja ja tem coordenadas, nenhuma chamada de rede.
        busca2 = BuscaFalsa({})
        self.assertEqual(self.rodar(busca2)["ja_tinham"], 1)
        self.assertEqual(busca2.chamadas, [])

    def test_lojas_no_mesmo_cep_fazem_uma_unica_consulta(self):
        self.gravar(LOJA_OK, {**LOJA_OK, "nome": "Outra", "codigo_externo": "1501"})
        busca = BuscaFalsa({geo.URL_BRASILAPI.format(cep="90010000"): brasilapi()})

        resumo = self.rodar(busca)

        self.assertEqual(len(busca.chamadas), 1)
        self.assertEqual((resumo["resolvidas"], resumo["reaproveitadas"]), (1, 1))
        self.assertEqual([l["latitude"] for l in self.ler()], [-30.03, -30.03])

    def test_cep_ja_resolvido_no_arquivo_e_reaproveitado_sem_consulta(self):
        ja = {**LOJA_OK, "latitude": -30.0, "longitude": -51.0}
        self.gravar(ja, {**LOJA_OK, "nome": "Outra", "codigo_externo": "1501"})
        busca = BuscaFalsa({})

        resumo = self.rodar(busca)

        self.assertEqual(busca.chamadas, [])
        self.assertEqual((resumo["ja_tinham"], resumo["reaproveitadas"]), (1, 1))
        self.assertEqual(self.ler()[1]["latitude"], -30.0)

    def test_pausa_de_2s_entre_chamadas_e_nenhuma_antes_da_primeira(self):
        self.gravar(LOJA_OK, {**LOJA_OK, "nome": "B", "codigo_externo": "1502", "cep": "90020-000"},
                    {**LOJA_OK, "nome": "C", "codigo_externo": "1503", "cep": "90030-000"})
        busca = BuscaFalsa({geo.URL_BRASILAPI.format(cep=c): brasilapi() for c in ("90010000", "90020000", "90030000")})

        self.rodar(busca)

        self.assertEqual(len(busca.chamadas), 3)
        self.assertEqual(self.pausas, [geo.PAUSA_ENTRE_CHAMADAS, geo.PAUSA_ENTRE_CHAMADAS])
        self.assertEqual(geo.PAUSA_ENTRE_CHAMADAS, 2.0)

    def test_brasilapi_sem_coordenada_fica_sem_coordenada_e_nao_inventa(self):
        self.gravar(LOJA_OK)
        busca = BuscaFalsa({geo.URL_BRASILAPI.format(cep="90010000"): brasilapi(lat=None)})

        resumo = self.rodar(busca)
        loja = self.ler()[0]

        self.assertEqual(resumo["sem_coordenada"], 1)
        self.assertIsNone(loja["latitude"])
        self.assertEqual(loja["geocodificacao"]["status"], "sem_coordenada")
        # A tentativa fica registrada: nao consulta de novo, a menos que se peca para refazer.
        busca2 = BuscaFalsa({})
        self.assertEqual(self.rodar(busca2)["ja_tentadas"], 1)
        self.assertEqual(busca2.chamadas, [])
        busca3 = BuscaFalsa({geo.URL_BRASILAPI.format(cep="90010000"): brasilapi()})
        self.assertEqual(self.rodar(busca3, refazer=True)["resolvidas"], 1)
        self.assertEqual(self.ler()[0]["latitude"], -30.03)

    def test_viacep_de_reserva_quando_a_brasilapi_nao_acha_so_confirma_o_cep(self):
        self.gravar(LOJA_OK)
        busca = BuscaFalsa({geo.URL_BRASILAPI.format(cep="90010000"): None,
                            geo.URL_VIACEP.format(cep="90010000"): {"cep": "90010-000", "localidade": "Porto Alegre",
                                                                    "uf": "RS"}})

        resumo = self.rodar(busca)
        loja = self.ler()[0]

        self.assertEqual(len(busca.chamadas), 2)
        self.assertEqual(resumo["sem_coordenada"], 1)
        self.assertEqual((loja["geocodificacao"]["fonte"], loja["latitude"]), ("viacep", None))

    def test_viacep_de_reserva_quando_a_brasilapi_falha(self):
        self.gravar(LOJA_OK)
        busca = BuscaFalsa({geo.URL_BRASILAPI.format(cep="90010000"): geo.ErroGeocodificacao("http_500"),
                            geo.URL_VIACEP.format(cep="90010000"): {"localidade": "Porto Alegre", "uf": "RS"}})
        self.assertEqual(self.rodar(busca)["sem_coordenada"], 1)

    def test_cep_inexistente_nos_dois_servicos(self):
        self.gravar(LOJA_OK)
        busca = BuscaFalsa({geo.URL_BRASILAPI.format(cep="90010000"): None,
                            geo.URL_VIACEP.format(cep="90010000"): {"erro": True}})
        self.assertEqual(self.rodar(busca)["nao_encontradas"], 1)
        self.assertEqual(self.ler()[0]["geocodificacao"]["status"], "nao_encontrada")

    def test_falha_nos_dois_servicos_vira_nao_encontrada_sem_derrubar(self):
        self.gravar(LOJA_OK)
        busca = BuscaFalsa({geo.URL_BRASILAPI.format(cep="90010000"): geo.ErroGeocodificacao("x"),
                            geo.URL_VIACEP.format(cep="90010000"): geo.ErroGeocodificacao("y")})
        self.assertEqual(self.rodar(busca)["nao_encontradas"], 1)

    def test_429_para_na_hora_e_salva_o_que_ja_resolveu(self):
        self.gravar(LOJA_OK, {**LOJA_OK, "nome": "B", "codigo_externo": "1502", "cep": "90020-000"},
                    {**LOJA_OK, "nome": "C", "codigo_externo": "1503", "cep": "90030-000"})
        busca = BuscaFalsa({geo.URL_BRASILAPI.format(cep="90010000"): brasilapi(),
                            geo.URL_BRASILAPI.format(cep="90020000"): geo.ServicoBloqueou("http_429")})

        resumo = self.rodar(busca)
        lojas = self.ler()

        self.assertEqual(resumo["interrompido"], "http_429")
        self.assertEqual(len(busca.chamadas), 2)  # nao tentou o CEP seguinte nem a reserva
        self.assertEqual(lojas[0]["latitude"], -30.03)
        self.assertNotIn("geocodificacao", lojas[1])
        self.assertNotIn("geocodificacao", lojas[2])

    def test_viacep_bloqueado_tambem_para(self):
        self.gravar(LOJA_OK)
        busca = BuscaFalsa({geo.URL_BRASILAPI.format(cep="90010000"): None,
                            geo.URL_VIACEP.format(cep="90010000"): geo.ServicoBloqueou("http_503")})
        self.assertEqual(self.rodar(busca)["interrompido"], "http_503")

    def test_loja_sem_cep_valido_e_pulada(self):
        self.gravar({**LOJA_OK, "cep": None}, {**LOJA_OK, "cep": "123", "codigo_externo": "1502"})
        busca = BuscaFalsa({})
        self.assertEqual(self.rodar(busca)["sem_cep_valido"], 2)
        self.assertEqual(busca.chamadas, [])

    def test_gravacao_atomica_nao_deixa_temporario_e_preserva_outros_campos(self):
        self.gravar({**LOJA_OK, "campo_extra": "fica"})
        self.rodar(BuscaFalsa({geo.URL_BRASILAPI.format(cep="90010000"): brasilapi()}))
        self.assertEqual(self.ler()[0]["campo_extra"], "fica")
        self.assertEqual([p.name for p in Path(self.pasta.name).iterdir()], ["lojas.json"])

    def test_cli_resumo_e_codigo_de_saida(self):
        self.gravar({**LOJA_OK, "latitude": -30.0, "longitude": -51.0})
        self.assertEqual(geo.main(["--arquivo", str(self.arquivo)]), 0)
        self.assertEqual(geo.main(["--arquivo", str(self.arquivo.with_name("nao_existe.json"))]), 1)


class GeocodificacaoPorEnderecoTest(unittest.TestCase):
    """Etapa --por-endereco: Nominatim por endereço estruturado, só aceita a cidade da loja (HTTP simulado)."""

    LOJA = {**LOJA_OK, "mercado": "fort", "nome": "Fort Canoas", "endereco": "Av. Farroupilha, 4803 - Marechal Rondon",
            "cep": "92020475", "cidade": "Canoas", "uf": "RS", "codigo_externo": "545",
            "latitude": -29.91778, "longitude": -51.18361,
            "geocodificacao": {"status": "resolvida", "fonte": "brasilapi_v2", "em": "2026-11-13T02:04:00+00:00"}}

    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.addCleanup(self.pasta.cleanup)
        self.arquivo = Path(self.pasta.name) / "lojas.json"
        self.pausas = []
        self.urls = []

    def gravar(self, *lojas):
        self.arquivo.write_text(json.dumps({"versao": 1, "lojas": list(lojas)}), encoding="utf-8")

    def ler(self):
        return json.loads(self.arquivo.read_text(encoding="utf-8"))["lojas"]

    def busca(self, *respostas):
        """Devolve as respostas em ordem (uma por chamada); um valor Exception é levantado."""
        fila = list(respostas)

        def buscar(url):
            self.urls.append(url)
            resposta = fila.pop(0)
            if isinstance(resposta, Exception):
                raise resposta
            return resposta
        return buscar

    def rodar(self, buscar, **kw):
        return geo.geocodificar_por_endereco(self.arquivo, buscar=buscar, dormir=self.pausas.append, **kw)

    @staticmethod
    def achado(lat="-29.9", lng="-51.1", **endereco):
        return [{"lat": lat, "lon": lng, "address": endereco}]

    def test_monta_a_consulta_estruturada_sem_o_bairro(self):
        from urllib.parse import parse_qs, urlparse
        self.gravar(self.LOJA)

        self.rodar(self.busca([]))

        url = urlparse(self.urls[0])
        self.assertEqual(f"{url.scheme}://{url.netloc}{url.path}", "https://nominatim.openstreetmap.org/search")
        self.assertEqual({k: v[0] for k, v in parse_qs(url.query).items()},
                         {"street": "4803 Avenida Farroupilha", "city": "Canoas", "state": "Rio Grande do Sul",
                          "countrycodes": "br", "format": "jsonv2", "addressdetails": "1", "limit": "1"})

    def test_endereco_sem_numero_vai_so_com_o_logradouro(self):
        from urllib.parse import parse_qs, urlparse
        self.gravar({**self.LOJA, "endereco": "Av. Florianópolis, S/N - Nova Tramandaí", "cidade": "Tramandaí"},
                    {**self.LOJA, "codigo_externo": "2", "endereco": "Rua Lateral da BR-101 - Centro"})

        self.rodar(self.busca([], []))

        ruas = [parse_qs(urlparse(u).query)["street"][0] for u in self.urls]
        self.assertEqual(ruas, ["Avenida Florianópolis", "Rua Lateral da BR-101"])

    def test_aceita_cidade_igual_sem_acento_e_sem_caixa_e_grava_com_precisao_de_endereco(self):
        self.gravar({**self.LOJA, "cidade": "Gravataí"})

        resumo = self.rodar(self.busca(self.achado("-29.9181", "-51.1822", town="GRAVATAI")))
        loja = self.ler()[0]

        self.assertEqual(resumo["resolvidas_endereco"], 1)
        self.assertEqual((loja["latitude"], loja["longitude"]), (-29.9181, -51.1822))
        g = loja["geocodificacao"]
        self.assertEqual((g["status"], g["fonte"], g["precisao"]), ("resolvida", "nominatim", "endereco"))
        self.assertRegex(g["em"], r"^\d{4}-\d\d-\d\dT")

    def test_rejeita_cidade_diferente_e_a_loja_mantem_o_que_tinha(self):
        self.gravar(self.LOJA)

        resumo = self.rodar(self.busca(self.achado("-30.0", "-51.2", city="Porto Alegre")))
        loja = self.ler()[0]

        self.assertEqual(resumo["rejeitadas_cidade"], 1)
        self.assertEqual((loja["latitude"], loja["longitude"]), (-29.91778, -51.18361))
        self.assertEqual(loja["geocodificacao"]["endereco"], "rejeitada_cidade_diferente")
        self.assertEqual(loja["geocodificacao"]["precisao"], "cep")  # a coordenada que ficou veio do CEP

    def test_endereco_nao_encontrado_e_registrado_e_nao_apaga_coordenada(self):
        self.gravar(self.LOJA)

        resumo = self.rodar(self.busca([]))

        self.assertEqual(resumo["nao_encontradas"], 1)
        self.assertEqual(self.ler()[0]["latitude"], -29.91778)
        self.assertEqual(self.ler()[0]["geocodificacao"]["endereco"], "nao_encontrado")

    def test_429_para_e_salva_o_que_ja_resolveu_sem_anular_nada(self):
        self.gravar(self.LOJA, {**self.LOJA, "codigo_externo": "2"}, {**self.LOJA, "codigo_externo": "3"})

        resumo = self.rodar(self.busca(self.achado("-29.91", "-51.19", city="Canoas"), geo.ServicoBloqueou("http_429")))
        lojas = self.ler()

        self.assertEqual(resumo["interrompido"], "http_429")
        self.assertEqual(len(self.urls), 2)  # não tentou a terceira
        self.assertEqual((lojas[0]["latitude"], lojas[0]["geocodificacao"]["precisao"]), (-29.91, "endereco"))
        # as duas restantes seguem com a coordenada do CEP (a regra da repetição não roda com a etapa incompleta)
        self.assertEqual([l["latitude"] for l in lojas[1:]], [-29.91778, -29.91778])

    def test_loja_ja_resolvida_por_endereco_e_pulada_e_refazer_consulta_de_novo(self):
        resolvida = {**self.LOJA, "latitude": -29.9, "longitude": -51.1,
                     "geocodificacao": {"status": "resolvida", "fonte": "nominatim", "precisao": "endereco", "em": "x"}}
        self.gravar(resolvida)

        resumo = self.rodar(self.busca())
        self.assertEqual((resumo["ja_resolvidas"], self.urls), (1, []))

        self.rodar(self.busca(self.achado("-29.95", "-51.15", city="Canoas")), refazer=True)
        self.assertEqual(len(self.urls), 1)
        self.assertEqual(self.ler()[0]["latitude"], -29.95)

    def test_pausa_de_2s_entre_chamadas_e_nenhuma_antes_da_primeira(self):
        self.gravar(self.LOJA, {**self.LOJA, "codigo_externo": "2"})

        self.rodar(self.busca([], []))

        self.assertEqual(self.pausas, [2.0])

    def test_loja_sem_endereco_ou_sem_cidade_e_pulada(self):
        self.gravar({**self.LOJA, "endereco": None}, {**self.LOJA, "codigo_externo": "2", "cidade": None})

        resumo = self.rodar(self.busca())

        self.assertEqual((resumo["sem_endereco"], self.urls), (2, []))


class CoordenadaRepetidaTest(unittest.TestCase):
    """Dentro da mesma rede, coordenadas idênticas viram null: melhor sem distância do que distância errada."""

    def loja(self, mercado, codigo, lat, lng, **extra):
        return {**LOJA_OK, "mercado": mercado, "codigo_externo": codigo, "latitude": lat, "longitude": lng,
                "geocodificacao": {"status": "resolvida", "fonte": "brasilapi_v2", "precisao": "cep"}, **extra}

    def test_anula_todas_as_lojas_da_rede_que_dividem_a_coordenada(self):
        lojas = [self.loja("zaffari", "a", -30.0, -51.0), self.loja("zaffari", "b", -30.0, -51.0),
                 self.loja("zaffari", "c", -30.0, -51.0), self.loja("zaffari", "d", -30.1, -51.1)]

        anuladas = geo.anular_coordenadas_repetidas(lojas)

        self.assertEqual(anuladas, ["a", "b", "c"])
        self.assertEqual([(l["latitude"], l["longitude"]) for l in lojas[:3]], [(None, None)] * 3)
        self.assertEqual(lojas[0]["geocodificacao"]["status"], "coordenada_repetida")
        self.assertEqual((lojas[3]["latitude"], lojas[3]["geocodificacao"]["status"]), (-30.1, "resolvida"))

    def test_redes_diferentes_no_mesmo_ponto_nao_se_anulam(self):
        lojas = [self.loja("fort", "a", -30.0, -51.0), self.loja("asun", "b", -30.0, -51.0),
                 self.loja("zaffari", "c", -30.0, -51.0)]

        self.assertEqual(geo.anular_coordenadas_repetidas(lojas), [])
        self.assertEqual([l["latitude"] for l in lojas], [-30.0, -30.0, -30.0])

    def test_so_a_rede_com_repeticao_e_anulada_quando_ha_mistura(self):
        lojas = [self.loja("fort", "a", -30.0, -51.0), self.loja("asun", "b", -30.0, -51.0),
                 self.loja("asun", "c", -30.0, -51.0)]

        self.assertEqual(geo.anular_coordenadas_repetidas(lojas), ["b", "c"])
        self.assertEqual(lojas[0]["latitude"], -30.0)

    def test_loja_sem_coordenada_nao_conta_como_repetida(self):
        lojas = [self.loja("asun", "a", None, None), self.loja("asun", "b", None, None)]

        self.assertEqual(geo.anular_coordenadas_repetidas(lojas), [])


class BuscaHttpTest(unittest.TestCase):
    """buscar_json com requests simulado: 404 vira None; 403/429/503 bloqueiam; User-Agent identificado."""

    @staticmethod
    def resposta(status, corpo=None, json_invalido=False):
        r = mock.Mock(status_code=status)
        if json_invalido:
            r.json.side_effect = ValueError("x")
        else:
            r.json.return_value = corpo
        return r

    def buscar(self, resposta):
        with mock.patch.dict(os.environ, CONTATO), mock.patch("requests.get", return_value=resposta) as get:
            return geo.buscar_json("https://x/cep"), get

    def test_200_devolve_json_com_user_agent_identificado(self):
        dados, get = self.buscar(self.resposta(200, {"ok": 1}))
        self.assertEqual(dados, {"ok": 1})
        self.assertIn("SmartMarketBot", get.call_args.kwargs["headers"]["User-Agent"])

    def test_404_vira_none(self):
        self.assertIsNone(self.buscar(self.resposta(404))[0])

    def test_bloqueios_e_erros(self):
        for status in (403, 429, 503):
            with self.subTest(status), self.assertRaises(geo.ServicoBloqueou):
                self.buscar(self.resposta(status))
        with self.assertRaises(geo.ErroGeocodificacao):
            self.buscar(self.resposta(500))
        with self.assertRaises(geo.ErroGeocodificacao):
            self.buscar(self.resposta(200, json_invalido=True))

    def test_erro_de_rede_vira_erro_de_geocodificacao(self):
        import requests
        with mock.patch.dict(os.environ, CONTATO), mock.patch("requests.get", side_effect=requests.ConnectionError()):
            with self.assertRaises(geo.ErroGeocodificacao):
                geo.buscar_json("https://x/cep")


if __name__ == "__main__":
    unittest.main()


class GerarSqlLojasTest(unittest.TestCase):
    """gerar_sql_lojas: SQL do 08 gerado a partir da lista curada (offline, sem banco)."""

    def sql_de(self, lojas, data='2026-11-12'):
        import gerar_sql_lojas
        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / 'lojas.json'
            arquivo.write_text(json.dumps({'versao': 1, 'lojas': lojas}), encoding='utf-8')
            return gerar_sql_lojas.gerar_sql(carregar_lojas.ler_lojas(arquivo), data=data)

    def test_apostrofo_do_nome_e_do_endereco_e_escapado(self):
        loja = dict(LOJA_OK, mercado='zaffari', nome="Zaffari Mont'Serrat", endereco="Rua D'Ouro, 1",
                    codigo_externo='zaffari-mont-serrat')
        sql = self.sql_de([loja])
        self.assertIn("'Zaffari Mont''Serrat'", sql)
        self.assertIn("'Rua D''Ouro, 1'", sql)

    def test_loja_sem_cep_e_sem_coordenada_gera_null(self):
        loja = dict(LOJA_OK, mercado='asun', nome='Asun Guaiba', codigo_externo='asun-guaiba', cep=None)
        sql = self.sql_de([loja])
        valores = [l for l in sql.splitlines() if "'asun-guaiba'" in l and l.lstrip().startswith('(')]
        self.assertEqual(len(valores), 1)
        self.assertEqual(valores[0].count('NULL'), 3, valores[0])  # cep, latitude, longitude
        self.assertNotIn("''", valores[0])

    def test_saida_e_deterministica_para_a_mesma_entrada(self):
        lojas = [dict(LOJA_OK), dict(LOJA_OK, nome='Asun Dois', codigo_externo='1501')]
        self.assertEqual(self.sql_de(lojas), self.sql_de(lojas))

    def test_nenhuma_linha_de_valores_usa_o_codigo_padrao(self):
        arquivo = RAIZ / 'lojas' / 'lojas.json'
        import gerar_sql_lojas
        sql = gerar_sql_lojas.gerar_sql(carregar_lojas.ler_lojas(arquivo), data='2026-11-12')
        valores = [l for l in sql.splitlines() if l.startswith('    (')]
        self.assertEqual(len(valores), 82)
        self.assertFalse([l for l in valores if "'padrao'" in l])
        self.assertNotIn('DELETE', sql.upper())

    def test_loja_com_codigo_padrao_nem_chega_ao_gerador(self):
        with self.assertRaises(ErroIngestao):
            self.sql_de([dict(LOJA_OK, codigo_externo='padrao')])
