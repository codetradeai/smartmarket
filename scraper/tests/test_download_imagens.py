"""
download_imagens: só http/https para destinos públicos, com limite de tamanho, tipo
verificado e nomes de arquivo que não escapam do diretório de destino.

As URLs vêm da API das redes (não confiáveis): file://, ftp://, redirecionamentos para
metadados de nuvem, corpos gigantes e ids como "../../x" não podem virar leitura/escrita
arbitrária no disco que é publicado no GitHub Pages.
"""
import io
import json
import shutil
import sys
import tempfile
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import download_imagens as di  # noqa: E402

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 300
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 300
IP_PUBLICO = [(2, 1, 6, "", ("93.184.216.34", 0))]


class RespostaFalsa:
    def __init__(self, corpo, content_type="image/png", content_length=None):
        self.corpo = corpo
        self.headers = {}
        if content_type is not None:
            self.headers["Content-Type"] = content_type
        if content_length is not None:
            self.headers["Content-Length"] = str(content_length)
        self.leituras = []

    def read(self, n=None):
        self.leituras.append(n)
        assert n is not None and n >= 0, "a leitura do corpo precisa ter limite"
        return self.corpo[:n]

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class OpenerFalso:
    def __init__(self, resposta):
        self.resposta = resposta
        self.abertas = []

    def open(self, req, timeout=None):
        self.abertas.append(req.full_url if hasattr(req, "full_url") else req)
        return self.resposta


class BaseTeste(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="smartmarket_test_img_"))
        patcher = mock.patch("download_imagens.socket.getaddrinfo", return_value=IP_PUBLICO)
        patcher.start()
        self.addCleanup(patcher.stop)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)


class TestUrlPermitida(BaseTeste):
    def test_so_http_e_https(self):
        for url in ("https://cdn.exemplo.com/a.jpg", "http://cdn.exemplo.com/a.jpg"):
            with self.subTest(url=url):
                di.validar_url_publica(url)  # não levanta
        for url in ("file:///etc/passwd", "ftp://cdn.exemplo.com/a.jpg", "data:image/png;base64,AAAA",
                    "javascript:alert(1)", "//cdn.exemplo.com/a.jpg", "", "https:///sem-host", "gopher://x/y"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                di.validar_url_publica(url)

    def test_destinos_internos_sao_bloqueados(self):
        for url in ("http://169.254.169.254/latest/meta-data/", "http://127.0.0.1/a.jpg",
                    "http://[::1]/a.jpg", "http://10.0.0.5/a.jpg", "http://192.168.1.1/a.jpg",
                    "http://localhost/a.jpg", "http://LOCALHOST./a.jpg"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                di.validar_url_publica(url)

    def test_nome_que_resolve_para_ip_interno_e_bloqueado(self):
        interno = [(2, 1, 6, "", ("169.254.169.254", 0))]
        with mock.patch("download_imagens.socket.getaddrinfo", return_value=interno):
            with self.assertRaises(ValueError):
                di.validar_url_publica("https://cdn-aparentemente-inocente.exemplo.com/a.jpg")

    def test_nome_que_nao_resolve_e_rejeitado(self):
        import socket
        with mock.patch("download_imagens.socket.getaddrinfo", side_effect=socket.gaierror):
            with self.assertRaises(ValueError):
                di.validar_url_publica("https://nao-existe.exemplo.com/a.jpg")


class TestOpenerSeguro(BaseTeste):
    def test_opener_nao_tem_handlers_de_arquivo_ftp_ou_data(self):
        opener = di.criar_opener()
        proibidos = (urllib.request.FileHandler, urllib.request.FTPHandler, urllib.request.DataHandler)
        for handler in opener.handlers:
            self.assertNotIsInstance(handler, proibidos)

    def test_opener_real_recusa_file(self):
        alvo = self.tmp / "segredo.txt"
        alvo.write_bytes(b"x" * 500)
        with self.assertRaises(urllib.error.URLError):
            di.criar_opener().open(alvo.as_uri(), timeout=2)

    def test_redirect_para_esquema_ou_destino_proibido_e_recusado(self):
        manipulador = di._RedirectSeguro()
        req = urllib.request.Request("https://cdn.exemplo.com/a.jpg")
        for novo in ("file:///etc/passwd", "ftp://cdn.exemplo.com/a.jpg",
                     "http://169.254.169.254/latest/meta-data/"):
            with self.subTest(destino=novo), self.assertRaises(ValueError):
                manipulador.redirect_request(req, io.BytesIO(), 302, "Found", {}, novo)

    def test_redirect_para_destino_publico_e_seguido(self):
        manipulador = di._RedirectSeguro()
        req = urllib.request.Request("https://cdn.exemplo.com/a.jpg")
        novo = manipulador.redirect_request(req, io.BytesIO(), 302, "Found", {}, "https://outro.exemplo.com/b.jpg")
        self.assertEqual(novo.full_url, "https://outro.exemplo.com/b.jpg")


class TestBaixarImagem(BaseTeste):
    def baixar(self, resposta, url="https://cdn.exemplo.com/a.png"):
        destino = self.tmp / "saida" / "a.png"
        opener = OpenerFalso(resposta)
        ok = di.baixar_imagem(url, destino, opener=opener)
        return ok, destino, opener

    def test_imagem_valida_e_salva(self):
        for corpo, tipo in ((PNG, "image/png"), (JPEG, "image/jpeg"), (JPEG, "application/octet-stream"),
                            (b"RIFF\x00\x00\x00\x00WEBP" + b"\x00" * 300, "image/webp")):
            with self.subTest(tipo=tipo):
                ok, destino, _ = self.baixar(RespostaFalsa(corpo, tipo))
                self.assertTrue(ok)
                self.assertEqual(destino.read_bytes(), corpo)
                destino.unlink()

    def test_corpo_acima_do_limite_e_recusado_sem_ler_tudo(self):
        corpo = PNG + b"\x00" * 5000
        resposta = RespostaFalsa(corpo)
        with mock.patch.object(di, "MAX_BYTES_IMAGEM", 1000):
            ok, destino, _ = self.baixar(resposta)
        self.assertFalse(ok)
        self.assertFalse(destino.exists())
        self.assertEqual(resposta.leituras, [1001], "lê no máximo limite+1 bytes")

    def test_content_length_acima_do_limite_nem_le_o_corpo(self):
        resposta = RespostaFalsa(PNG, content_length=10 * 1024 * 1024)
        ok, destino, _ = self.baixar(resposta)
        self.assertFalse(ok)
        self.assertEqual(resposta.leituras, [])
        self.assertFalse(destino.exists())

    def test_tipo_que_nao_e_imagem_e_recusado(self):
        ok, destino, _ = self.baixar(RespostaFalsa(PNG, "text/html"))
        self.assertFalse(ok)
        self.assertFalse(destino.exists())

    def test_conteudo_sem_assinatura_de_imagem_e_recusado_mesmo_com_content_type_image(self):
        texto = b"AWS_SECRET_ACCESS_KEY=nao-e-uma-imagem\n" * 20
        ok, destino, _ = self.baixar(RespostaFalsa(texto, "image/jpeg"))
        self.assertFalse(ok)
        self.assertFalse(destino.exists())

    def test_url_com_esquema_proibido_nem_chega_ao_opener(self):
        origem = self.tmp / "origem.txt"
        origem.write_bytes(b"x" * 500)
        opener = OpenerFalso(RespostaFalsa(PNG))
        destino = self.tmp / "saida" / "a.jpg"
        self.assertFalse(di.baixar_imagem(origem.as_uri(), destino, opener=opener))
        self.assertEqual(opener.abertas, [])
        self.assertFalse(destino.exists())

    def test_fallback_de_resolucao_tambem_passa_pela_validacao(self):
        url = "https://cdn.exemplo.com/1000x1000/a.png"
        opener = OpenerFalso(RespostaFalsa(b"curto"))  # < 200 bytes: tenta as outras resoluções
        self.assertFalse(di.baixar_imagem(url, self.tmp / "a.png", opener=opener))
        self.assertEqual(len(opener.abertas), 3)


class TestProcessarColetas(BaseTeste):
    def coleta(self, produtos):
        arq = self.tmp / "produtos_coletados.json"
        arq.write_text(json.dumps(produtos), encoding="utf-8")
        return arq

    def processar(self, produtos, corpo=PNG):
        arq = self.coleta(produtos)
        destino = self.tmp / "out" / "produtos"
        opener = OpenerFalso(RespostaFalsa(corpo))
        with mock.patch("download_imagens.criar_opener", return_value=opener):
            resultado = di.processar_coletas([arq], destino)
        return resultado, destino, json.loads(arq.read_text(encoding="utf-8")), opener

    def test_file_url_no_campo_imagem_nao_le_o_arquivo_local(self):
        segredo = self.tmp / ".env"
        segredo.write_bytes(b"TOKEN=abc\n" * 50)
        _, destino, produtos, opener = self.processar(
            [{"id_produto_origem": "1", "imagem_url": segredo.as_uri()}])
        self.assertEqual(opener.abertas, [])
        self.assertEqual(list(destino.glob("*")), [])
        self.assertNotIn("imagem_local", produtos[0])

    def test_id_com_path_traversal_nao_escreve_fora_do_destino(self):
        resultado, destino, produtos, _ = self.processar([{
            "id_produto_origem": "../../pwn/z",
            "imagem_url": "https://cdn.exemplo.com/a.jpg",
            "three_dimensional_images": ["https://cdn.exemplo.com/f0.jpg", "https://cdn.exemplo.com/f1.jpg"],
        }])
        self.assertEqual(resultado["sucesso"], 3)
        raiz = destino.resolve()
        gravados = [p for p in self.tmp.rglob("*") if p.is_file() and p.suffix == ".jpg"]
        self.assertEqual(len(gravados), 3)
        for arquivo in gravados:
            self.assertTrue(arquivo.resolve().is_relative_to(raiz), f"fora do destino: {arquivo}")
        self.assertFalse((self.tmp / "pwn").exists())
        for caminho in [produtos[0]["imagem_local"], *produtos[0]["three_dimensional_images_local"]]:
            self.assertNotIn("..", caminho)
            self.assertTrue(caminho.startswith("/images/produtos/"))

    def test_id_que_some_na_sanitizacao_usa_nome_neutro(self):
        _, destino, produtos, _ = self.processar([{
            "id_produto_origem": "../..",
            "three_dimensional_images": ["https://cdn.exemplo.com/f0.jpg", "https://cdn.exemplo.com/f1.jpg"],
        }])
        self.assertTrue((destino / "360" / "desconhecido" / "frame_00.jpg").exists())
        self.assertEqual(produtos[0]["three_dimensional_images_local"][0],
                         "/images/produtos/360/desconhecido/frame_00.jpg")

    def test_frame_com_esquema_proibido_e_ignorado(self):
        _, destino, _, opener = self.processar([{
            "id_produto_origem": "7",
            "three_dimensional_images": ["file:///etc/passwd", "https://cdn.exemplo.com/f1.jpg"],
        }])
        self.assertEqual(opener.abertas, ["https://cdn.exemplo.com/f1.jpg"])

    def test_campos_de_tipo_inesperado_nao_quebram_a_rotina(self):
        resultado, *_ = self.processar([None, "texto", {"id_produto_origem": 1, "imagem_url": {"x": 1}},
                                        {"id_produto_origem": 2, "imagem_url": "https://cdn.exemplo.com/ok.png"}])
        self.assertEqual(resultado["sucesso"], 1)


class TestNomeArquivo(unittest.TestCase):
    def test_nome_do_arquivo_nao_tem_separadores(self):
        nome = di.gerar_nome_arquivo("https://cdn.exemplo.com/a.jpg", "../../etc/passwd")
        self.assertNotIn("/", nome)
        self.assertNotIn("..", nome)

    def test_sanitizar_id_remove_tudo_que_nao_e_seguro(self):
        self.assertEqual(di.sanitizar_id("../../pwn/z"), "pwnz")
        self.assertEqual(di.sanitizar_id("ab-12_x"), "ab-12_x")
        self.assertEqual(di.sanitizar_id(".."), "desconhecido")
        self.assertEqual(di.sanitizar_id(None), "desconhecido")


if __name__ == "__main__":
    unittest.main()
