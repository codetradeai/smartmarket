import re
import sys
import threading
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import relatorio_casamento as rc
from casamento import casar

VIP = "https://services.vipcommerce.com.br/api-admin/v1"
URL_MASTER = VIP + "/org/161/filial/1/centro_distribuicao/1/loja/buscas/produtos/termo/x"
URL_STOK = VIP + "/org/130/filial/1/centro_distribuicao/1/loja/buscas/produtos/termo/x"
URL_ATACADAO = "https://www.atacadao.com.br/api/catalog_system/pub/products/search"


class RelogioFalso:
    """Relógio controlado pelo teste: dormir avança o tempo e registra a pausa."""

    def __init__(self):
        self.t, self.pausas, self._lock = 0.0, [], threading.Lock()

    def agora(self):
        with self._lock:
            return self.t

    def dormir(self, s):
        with self._lock:
            self.pausas.append(round(s, 6))
            self.t += s


class UserAgentTest(unittest.TestCase):
    def test_contato_vem_da_variavel_de_ambiente(self):
        ua = rc.user_agent({"SMARTMARKET_CONTATO": "github.com/codetradeai/smartmarket"})
        self.assertEqual(ua, "SmartMarketBot/0.1 (projeto academico Codifica/+praTI; contato: github.com/codetradeai/smartmarket)")

    def test_falha_com_mensagem_clara_sem_a_variavel(self):
        for ambiente in ({}, {"SMARTMARKET_CONTATO": "   "}):
            with self.assertRaises(rc.ErroConfiguracao) as ctx:
                rc.user_agent(ambiente)
            self.assertIn("SMARTMARKET_CONTATO", str(ctx.exception))

    def test_codigo_nao_tem_email(self):
        fonte = Path(rc.__file__).read_text(encoding="utf-8")
        self.assertIsNone(re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", fonte))
        self.assertFalse(hasattr(rc, "USER_AGENT"))


class LimitadorPorHostTest(unittest.TestCase):
    def setUp(self):
        self.relogio = RelogioFalso()
        self.lim = rc.LimitadorPorHost(2.0, relogio=self.relogio.agora, dormir=self.relogio.dormir)

    def test_master_e_stok_dividem_o_limitador_do_mesmo_host(self):
        self.lim.aguardar(URL_MASTER)
        self.lim.aguardar(URL_STOK)
        self.assertEqual(self.relogio.pausas, [2.0])
        self.assertEqual(self.lim.contagem["services.vipcommerce.com.br"], 2)

    def test_hosts_diferentes_nao_esperam_um_pelo_outro(self):
        self.lim.aguardar(URL_MASTER)
        self.lim.aguardar(URL_ATACADAO)
        self.assertEqual(self.relogio.pausas, [])

    def test_minimo_de_2s_mesmo_pedindo_menos(self):
        self.assertEqual(rc.LimitadorPorHost(0.5).intervalo, 2.0)
        self.assertEqual(rc.LimitadorPorHost(3.0).intervalo, 3.0)

    def test_threads_no_mesmo_host_ficam_a_2s_uma_da_outra(self):
        inicios = []
        original = self.lim.aguardar

        def aguardar_e_marcar(url):
            original(url)
            inicios.append(self.relogio.agora())

        ts = [threading.Thread(target=aguardar_e_marcar, args=(u,)) for u in [URL_MASTER, URL_STOK] * 3]
        for t in ts:
            t.start()
        for t in ts:
            t.join()
        inicios.sort()
        self.assertEqual(len(inicios), 6)
        self.assertTrue(all(b - a >= 2.0 - 1e-9 for a, b in zip(inicios, inicios[1:])), inicios)


class ParadaNoBloqueioTest(unittest.TestCase):
    def sessao(self):
        relogio = RelogioFalso()
        lim = rc.LimitadorPorHost(relogio=relogio.agora, dormir=relogio.dormir)
        return rc.Sessao(lim, ua="teste")

    def test_429_interrompe_a_sessao_e_guarda_host_e_status(self):
        s = self.sessao()
        self.assertTrue(s.antes(URL_STOK))
        self.assertFalse(s.depois(URL_STOK, 429))
        self.assertEqual((s.bloqueio.host, s.bloqueio.status), ("services.vipcommerce.com.br", 429))
        self.assertFalse(s.antes(URL_ATACADAO))
        self.assertEqual(s.limitador.contagem["www.atacadao.com.br"], 0)

    def test_consultar_eans_para_tudo_no_primeiro_403(self):
        s = self.sessao()
        resp = lambda status, corpo: mock.Mock(status_code=status, json=lambda: corpo)

        chamadas, trava = [], threading.Lock()

        def get(url, **kw):
            with trava:
                chamadas.append(url)
                primeira = len(chamadas) == 1
            return resp(403, {}) if primeira else resp(200, {"data": {"produtos": []}} if "vipcommerce" in url else [])

        with mock.patch("requests.post", return_value=resp(200, {"data": "token"})), \
             mock.patch("requests.get", side_effect=get):
            with self.assertRaises(rc.Bloqueio) as ctx:
                rc.consultar_eans({f"789100000{i:04d}" for i in range(20)}, {}, sessao=s)
        self.assertEqual(ctx.exception.status, 403)
        # Depois do 403, cada uma das 3 threads faz no máximo a requisição que já tinha liberado.
        # Sem a parada seriam 60 buscas (20 EANs x 3 redes).
        self.assertLessEqual(len(chamadas), 3)


def reg(rede, id_, nome, ean=None, marca="Camil"):
    return {"supermercado": rede, "id_produto_origem": id_, "nome_bruto": nome, "marca": marca, "codigo_barras": ean}


DADOS = [
    reg("Atacadão", "1", "Arroz Camil Tipo 1 1kg", "7896011906881"),
    reg("Master", "2", "Arroz Bco Camil Tp1 1kg", "7896011906881"),
    reg("Stok Center", "3", "Feijão Preto Camil 1kg", "7893500020158"),
    reg("Fort Atacadista", "4", "Feijão Preto Camil 1kg"),
    reg("Zaffari", "5", "Pão Francês", None, marca=None),
]


class RelatorioCasamentoTest(unittest.TestCase):
    def setUp(self):
        self.por_rede = rc.agrupar_por_rede(DADOS)

    def test_chave_rede_distingue_fort_de_atacadao(self):
        self.assertEqual(rc.chave_rede("Fort Atacadista"), "fort")
        self.assertEqual(rc.chave_rede("Atacadão"), "atacadao")
        self.assertEqual(rc.chave_rede("Stok Center"), "stok")
        self.assertEqual(rc.chave_rede("Asun Supermercados"), "asun")

    def test_resumo_por_rede_conta_so_ean_valido(self):
        r = rc.resumo_por_rede(self.por_rede)
        self.assertEqual(r["atacadao"], {"produtos": 1, "com_ean": 1})
        self.assertEqual(r["fort"], {"produtos": 1, "com_ean": 0})
        self.assertEqual(r["zaffari"], {"produtos": 1, "com_ean": 0})

    def test_ean_em_duas_redes_e_matriz(self):
        pres = rc.presencas(self.por_rede)
        self.assertEqual(rc.eans_em_2_ou_mais(pres), 1)
        self.assertEqual(rc.matriz_pares(pres)[("atacadao", "master")], 1)

    def test_consulta_cruzada_amplia_presencas_sem_duplicar(self):
        consulta = {"stok": {"07896011906881": "Arroz Camil T1 1kg", "07893500020158": False}}
        pres = rc.presencas(self.por_rede, consulta)
        self.assertEqual(set(pres["07896011906881"]), {"atacadao", "master", "stok"})
        self.assertEqual(set(pres["07893500020158"]), {"stok"})

    def test_nomes_muito_diferentes_listados_com_limite(self):
        pres = {"07896011906881": {"a": "Arroz Branco Camil", "b": "Fórmula Infantil Nestlé"},
                "07893500020158": {"a": "Feijão Preto Camil 1kg", "b": "Feijão Preto Camil 1kg"}}
        div = rc.pares_nomes_divergentes(pres, limite=20)
        self.assertEqual([d["ean"] for d in div], ["07896011906881"])
        self.assertEqual(rc.pares_nomes_divergentes(pres, limite=0), [])

    def test_similaridade_ignora_medida_e_acento(self):
        self.assertEqual(rc.similaridade("Café Melitta 500g", "CAFE MELITTA 250 g"), 1.0)

    def test_termo_de_consulta(self):
        self.assertEqual(rc.termo_de_consulta("07896011906881"), "7896011906881")
        self.assertEqual(rc.termo_de_consulta("00036000291452"), "0036000291452")

    def test_pausa_de_2s_entre_consultas_ao_mesmo_host(self):
        relogio = RelogioFalso()
        lim = rc.LimitadorPorHost(2.0, relogio=relogio.agora, dormir=relogio.dormir)
        lim.aguardar("https://www.atacadao.com.br/a")
        relogio.t += 0.5
        lim.aguardar("https://www.atacadao.com.br/b")
        self.assertEqual(relogio.pausas, [1.5])
        self.assertGreaterEqual(rc.PAUSA_S, 2.0)

    def test_markdown_tem_as_secoes_pedidas(self):
        pres = rc.presencas(self.por_rede)
        md = rc.renderizar(self.por_rede, casar(self.por_rede), pres, None,
                           rc.pares_nomes_divergentes(pres), data="2026-11-03")
        for titulo in ("## 1. Produtos por rede", "## 2. EANs em 2 ou mais redes", "## 3. Matriz de sobreposição",
                       "## 4. Casamento", "## 5. Pares com o mesmo EAN"):
            self.assertIn(titulo, md)
        self.assertIn("| Atacadão | 1 | 1 | 100% |", md)
        self.assertIn("ean = 3", md)
        self.assertIn("nome = 1", md)
        self.assertIn("Pares entre redes", md)

    def test_relatorio_lista_pares_em_revisao_e_status_da_embalagem(self):
        dados = [reg("Atacadão", "1", "Lã de Aço Bombril 45g", "7891022868036", marca="Bombril"),
                 reg("Master", "2", "Esponja Aço Bombril Eco Com 6 Unidade", "7891022868036", marca="Bombril")]
        por_rede = rc.agrupar_por_rede(dados)
        pres = rc.presencas(por_rede)
        md = rc.renderizar(por_rede, casar(por_rede), pres, None, rc.pares_nomes_divergentes(pres), data="2026-11-03")
        self.assertIn("### 4.1 Pares em revisão", md)
        self.assertIn("embalagem_diferente", md)
        self.assertIn("revisar (embalagem_diferente)", md)


if __name__ == "__main__":
    unittest.main()
