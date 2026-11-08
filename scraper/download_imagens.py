"""
SmartMarket - Downloader de Imagens de Alta Resolução
-----------------------------------------------------
Baixa as imagens dos produtos coletados pelos scrapers e armazena localmente
em `frontend/public/images/produtos/`, permitindo carregamento instantâneo offline
ou fallback inteligente no frontend.
"""

import argparse
import hashlib
import ipaddress
import json
import logging
import socket
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from typing import Dict, List, Optional
import concurrent.futures

LOGGER = logging.getLogger("download_imagens")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}


# As URLs vêm da API das redes (não confiáveis) e as imagens vão para uma pasta publicada
# no GitHub Pages: só http/https para destinos públicos, com teto de tamanho e tipo checado.
ESQUEMAS_PERMITIDOS = ("http", "https")
MAX_BYTES_IMAGEM = 5 * 1024 * 1024
TIPOS_GENERICOS_ACEITOS = ("application/octet-stream", "binary/octet-stream")


def sanitizar_id(valor) -> str:
    """Deixa só letras, dígitos, '-' e '_': nunca produz separador de caminho nem '..'."""
    limpo = "".join(c for c in str(valor) if c.isalnum() or c in "-_") if valor is not None else ""
    return limpo or "desconhecido"


def extrair_extensao(url: str) -> str:
    """Extrai a extensão da URL ou padrão jpg."""
    url_limpa = url.split("?")[0].lower()
    for ext in [".png", ".jpg", ".jpeg", ".webp"]:
        if url_limpa.endswith(ext):
            return ext
    return ".jpg"


def gerar_nome_arquivo(url: str, produto_id: Optional[str] = None) -> str:
    """Gera um identificador de arquivo único e seguro para o cache local."""
    hash_url = hashlib.md5(url.encode("utf-8")).hexdigest()[:12]
    ext = extrair_extensao(url)
    if produto_id:
        return f"{sanitizar_id(produto_id)}_{hash_url}{ext}"
    return f"prod_{hash_url}{ext}"


def _ip_publico(endereco: str) -> bool:
    try:
        return ipaddress.ip_address(endereco.split("%")[0]).is_global
    except ValueError:
        return False


def validar_url_publica(url) -> None:
    """Levanta ValueError se a URL não for http/https para um host público.

    Bloqueia file://, ftp://, data:, localhost, IPs privados/loopback/link-local (inclui
    o endpoint de metadados de nuvem) e nomes que resolvem para eles. Limite conhecido:
    DNS rebinding entre esta checagem e a conexão não é coberto.
    """
    if not isinstance(url, str):
        raise ValueError("url_nao_texto")
    partes = urllib.parse.urlparse(url.strip())
    if partes.scheme.lower() not in ESQUEMAS_PERMITIDOS:
        raise ValueError("esquema_nao_permitido")
    host = (partes.hostname or "").rstrip(".").lower()
    if not host:
        raise ValueError("host_ausente")
    if host == "localhost" or host.endswith(".localhost"):
        raise ValueError("host_interno")
    try:
        ipaddress.ip_address(host)
        enderecos = [host]
    except ValueError:
        try:
            enderecos = [info[4][0] for info in socket.getaddrinfo(host, None)]
        except (socket.gaierror, UnicodeError, OSError):
            raise ValueError("host_nao_resolvido") from None
    if not enderecos or not all(_ip_publico(e) for e in enderecos):
        raise ValueError("host_interno")


class _RedirectSeguro(urllib.request.HTTPRedirectHandler):
    """Segue redirecionamentos só para destinos que passariam em validar_url_publica."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validar_url_publica(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def criar_opener() -> urllib.request.OpenerDirector:
    """Opener só com HTTP/HTTPS (sem FileHandler, FTPHandler nem DataHandler)."""
    opener = urllib.request.OpenerDirector()
    for handler in (urllib.request.ProxyHandler(), urllib.request.HTTPHandler(),
                    urllib.request.HTTPSHandler(), urllib.request.HTTPDefaultErrorHandler(),
                    _RedirectSeguro(), urllib.request.HTTPErrorProcessor(),
                    urllib.request.UnknownHandler()):
        opener.add_handler(handler)
    return opener


def _parece_imagem(conteudo: bytes) -> bool:
    """Assinatura (magic bytes) de JPEG, PNG, GIF ou WebP."""
    return (conteudo.startswith(b"\xff\xd8\xff") or conteudo.startswith(b"\x89PNG\r\n\x1a\n")
            or conteudo.startswith((b"GIF87a", b"GIF89a"))
            or (conteudo[:4] == b"RIFF" and conteudo[8:12] == b"WEBP"))


def baixar_imagem(url: str, destino: Path, timeout: int = 15, opener=None) -> bool:
    """Baixa uma imagem se ainda não existir localmente, com fallback de resolução.

    Recusa esquemas/destinos não públicos, corpo acima de MAX_BYTES_IMAGEM, Content-Type que
    não seja imagem e conteúdo sem assinatura de imagem.
    """
    if destino.exists() and destino.stat().st_size > 0:
        return True

    try:
        validar_url_publica(url)
    except ValueError as exc:
        LOGGER.warning("Imagem recusada (%s): '%s'", exc, str(url)[:200])
        return False

    opener = opener or criar_opener()
    urls_tentativas = [url]
    if "1000x1000" in url:
        urls_tentativas.append(url.replace("1000x1000", "500x500"))
        urls_tentativas.append(url.replace("1000x1000", "250x250"))

    for u in urls_tentativas:
        try:
            req = urllib.request.Request(u, headers=HEADERS)
            with opener.open(req, timeout=timeout) as resp:
                tipo = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
                if tipo and not tipo.startswith("image/") and tipo not in TIPOS_GENERICOS_ACEITOS:
                    continue
                declarado = resp.headers.get("Content-Length")
                if declarado and declarado.isdigit() and int(declarado) > MAX_BYTES_IMAGEM:
                    continue
                conteudo = resp.read(MAX_BYTES_IMAGEM + 1)
                if len(conteudo) > MAX_BYTES_IMAGEM or len(conteudo) < 200 or not _parece_imagem(conteudo):
                    continue
                destino.parent.mkdir(parents=True, exist_ok=True)
                destino.write_bytes(conteudo)
                return True
        except Exception:
            continue

    LOGGER.warning("Não foi possível baixar imagem '%s'", url)
    return False


def processar_coletas(
    arquivos_json: List[Path],
    diretorio_destino: Path,
    max_workers: int = 8,
) -> Dict[str, int]:
    """Lê os arquivos de coleta, baixa as imagens em paralelo e atualiza os registros."""
    diretorio_destino.mkdir(parents=True, exist_ok=True)
    raiz_segura = diretorio_destino.resolve()
    opener = criar_opener()
    total_imagens = 0
    baixadas_com_sucesso = 0
    tarefas = []

    def agendar(url, caminho) -> bool:
        """Só agenda URL pública e caminho dentro do diretório de destino."""
        if not caminho.resolve().is_relative_to(raiz_segura):
            LOGGER.warning("Caminho fora do destino ignorado: '%s'", caminho)
            return False
        try:
            validar_url_publica(url)
        except ValueError as exc:
            LOGGER.warning("Imagem recusada (%s): '%s'", exc, str(url)[:200])
            return False
        tarefas.append((url, caminho))
        return True

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        for arq in arquivos_json:
            if not arq.exists():
                continue
            try:
                produtos = json.loads(arq.read_text(encoding="utf-8"))
            except Exception as e:
                LOGGER.error("Erro ao ler '%s': %s", arq, e)
                continue

            modificado = False
            if not isinstance(produtos, list):
                LOGGER.error("Formato inesperado em '%s'", arq)
                continue
            for p in produtos:
                if not isinstance(p, dict):
                    continue
                url_img = p.get("imagem_url")
                if url_img and isinstance(url_img, str):
                    total_imagens += 1
                    nome_arq = gerar_nome_arquivo(url_img, p.get("id_produto_origem"))
                    caminho_local = diretorio_destino / nome_arq
                    if agendar(url_img, caminho_local):
                        p["imagem_local"] = f"/images/produtos/{nome_arq}"
                        modificado = True

                # Processamento de sequências 360° autênticas
                frames_360 = p.get("three_dimensional_images")
                if isinstance(frames_360, list) and len(frames_360) >= 2:
                    origem_id = sanitizar_id(p.get("id_produto_origem"))
                    subpasta_360 = diretorio_destino / "360" / origem_id
                    frames_locais = []
                    for idx, frame_url in enumerate(frames_360):
                        if not frame_url or not isinstance(frame_url, str):
                            continue
                        ext = extrair_extensao(frame_url)
                        nome_frame = f"frame_{idx:02d}{ext}"
                        caminho_frame = subpasta_360 / nome_frame
                        total_imagens += 1
                        if agendar(frame_url, caminho_frame):
                            frames_locais.append(f"/images/produtos/360/{origem_id}/{nome_frame}")

                    if frames_locais:
                        p["three_dimensional_images_local"] = frames_locais
                        modificado = True

            if modificado:
                arq.write_text(json.dumps(produtos, ensure_ascii=False, indent=2), encoding="utf-8")

        # Executa downloads
        futures = {executor.submit(baixar_imagem, u, dest, opener=opener): u for u, dest in tarefas}
        for fut in concurrent.futures.as_completed(futures):
            if fut.result():
                baixadas_com_sucesso += 1

    LOGGER.info(
        "Download concluído: %d/%d imagens salvas em '%s'",
        baixadas_com_sucesso,
        total_imagens,
        diretorio_destino,
    )
    return {"total": total_imagens, "sucesso": baixadas_com_sucesso}


def main():
    parser = argparse.ArgumentParser(description="Downloader de imagens em alta resolução do SmartMarket")
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=Path("scraper/output"),
        help="Diretório onde estão os arquivos coleta_*.json",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("frontend/public/images/produtos"),
        help="Diretório onde as imagens serão salvas",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    arquivos = [a for a in args.input_dir.glob("*.json") if a.name.startswith("coleta_") or a.name == "produtos_coletados.json"]
    LOGGER.info("Encontrados %d arquivos de coleta em '%s'", len(arquivos), args.input_dir)
    res = processar_coletas(arquivos, args.output_dir)
    print(f"Sucesso! {res['sucesso']}/{res['total']} imagens em alta resolução armazenadas em {args.output_dir}")


if __name__ == "__main__":
    main()
