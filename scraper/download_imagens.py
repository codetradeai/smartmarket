"""
SmartMarket - Downloader de Imagens de Alta Resolução
-----------------------------------------------------
Baixa as imagens dos produtos coletados pelos scrapers e armazena localmente
em `frontend/public/images/produtos/`, permitindo carregamento instantâneo offline
ou fallback inteligente no frontend.
"""

import argparse
import hashlib
import json
import logging
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, List, Optional
import concurrent.futures

LOGGER = logging.getLogger("download_imagens")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}


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
        id_sanitizado = "".join(c for c in str(produto_id) if c.isalnum() or c in "-_")
        return f"{id_sanitizado}_{hash_url}{ext}"
    return f"prod_{hash_url}{ext}"


def baixar_imagem(url: str, destino: Path, timeout: int = 15) -> bool:
    """Baixa um arquivo de imagem se ainda não existir localmente, com fallback de resolução."""
    if destino.exists() and destino.stat().st_size > 0:
        return True

    urls_tentativas = [url]
    if "1000x1000" in url:
        urls_tentativas.append(url.replace("1000x1000", "500x500"))
        urls_tentativas.append(url.replace("1000x1000", "250x250"))

    for u in urls_tentativas:
        try:
            req = urllib.request.Request(u, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                conteudo = resp.read()
                if len(conteudo) < 200:
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
    total_imagens = 0
    baixadas_com_sucesso = 0
    tarefas = []

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
            for p in produtos:
                url_img = p.get("imagem_url")
                if not url_img:
                    continue
                total_imagens += 1
                nome_arq = gerar_nome_arquivo(url_img, p.get("id_produto_origem"))
                caminho_local = diretorio_destino / nome_arq
                p["imagem_local"] = f"/images/produtos/{nome_arq}"
                modificado = True

                tarefas.append((url_img, caminho_local))

            if modificado:
                arq.write_text(json.dumps(produtos, ensure_ascii=False, indent=2), encoding="utf-8")

        # Executa downloads
        futures = {executor.submit(baixar_imagem, u, dest): u for u, dest in tarefas}
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
