"""Prepara os logos das redes para a faixa da segunda dobra da Home.

Lê os arquivos que o grupo coloca em `frontend/public/logos/` (e o logo do Master em `frontend/logo/`)
e grava, para cada rede:

  - `frontend/src/assets/logos-redes/<id>.png`: PNG com transparência real, sem margens e em 2x;
  - `frontend/src/components/ui/logosRedes.dados.json`: tamanho de exibição (px CSS) de cada logo.

O que o script resolve:
  1. JPEG com o "xadrez de transparência" gravado nos pixels (acontece ao exportar de uma prévia):
     detecta os dois tons neutros do xadrez e os remove, suavizando a borda para não deixar halo;
  2. margens vazias: apara pelo contorno do desenho;
  3. tamanho visual igual: cada logo recebe a mesma ÁREA de exibição (com tetos de largura e de
     altura), para um logo quase quadrado e um muito largo terem o mesmo peso na faixa.

Uso (na raiz do repositório):  python scripts/logos-redes/processar_logos.py
Dependências:  pip install pillow numpy scipy
Se o logo trocado ainda tiver fundo (JPEG com xadrez), prefira exportar de novo em PNG transparente:
o resultado deste script é bom, mas o recorte de um PNG de verdade sempre é melhor.
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

RAIZ = Path(__file__).resolve().parents[2]
FRONT = RAIZ / "frontend"
PUBLIC_LOGOS = FRONT / "public" / "logos"

ORIGENS = {
    "asun": PUBLIC_LOGOS / "logo-asun.png",
    "stok": PUBLIC_LOGOS / "logo-stok.png",
    "atacadao": PUBLIC_LOGOS / "logo-atacadao.jpeg",
    "carrefour": PUBLIC_LOGOS / "logo-carrefour.jpeg",
    "fort": PUBLIC_LOGOS / "logo-fort.jpeg",
    "rissul": PUBLIC_LOGOS / "logo-rissul.jpeg",
    "zaffari": PUBLIC_LOGOS / "logo-zaffari.png",
    "master": FRONT / "logo" / "mastersupermercados-logo.png",
}

SAIDA_IMAGENS = FRONT / "src" / "assets" / "logos-redes"
SAIDA_DADOS = FRONT / "src" / "components" / "ui" / "logosRedes.dados.json"

# Regra de tamanho visual: mesma área de exibição, limitada por largura e altura máximas (px CSS).
AREA_ALVO = 9600
LARGURA_MAX = 208
ALTURA_MAX = 76
DENSIDADE = 2  # PNG em 2x para telas de alta densidade (nunca amplia além do original)

# Fundo xadrez: pixel neutro (quase sem cor) e claro.
LIMITE_NEUTRO = 8
LIMITE_CLARO = 170
LIMITE_NEUTRO_FUNDO = 12  # mais folgado que o de cima: pega o ruído de cor do JPEG nos quadrados
LIMITE_CLARO_FUNDO = 185
D_FUNDO = 14   # distância ao tom do xadrez abaixo da qual o pixel é fundo puro
D_CORPO = 60   # distância acima da qual o pixel é desenho puro (entre as duas: borda suavizada)


def tons_do_xadrez(rgb):
    """Os dois tons neutros mais frequentes (o branco e o cinza do xadrez)."""
    neutro = (rgb.max(2) - rgb.min(2)) < LIMITE_NEUTRO
    claro = neutro & (rgb.min(2) >= LIMITE_CLARO)
    valores = rgb[..., 0][claro]
    if valores.size == 0:
        return []
    hist = np.bincount(valores // 4, minlength=64)
    ordem = np.argsort(hist)[::-1]
    primeiro = int(ordem[0])
    segundo = next((int(i) for i in ordem if abs(int(i) - primeiro) >= 3 and hist[i] > 0.05 * hist[primeiro]), None)
    tons = []
    for faixa in (primeiro, segundo):
        if faixa is None:
            continue
        sel = valores[(valores // 4) == faixa]
        tons.append(float(np.median(sel)))
    return tons


def remover_xadrez(imagem):
    """JPEG/PNG opaco com xadrez gravado -> RGBA com transparência."""
    rgb = np.asarray(imagem.convert("RGB"))
    tons = tons_do_xadrez(rgb)
    if not tons:
        return imagem.convert("RGBA")
    f = rgb.astype(np.float32)
    dist = np.stack([np.sqrt(((f - t) ** 2).sum(2)) for t in tons])
    mais_perto = dist.argmin(0)
    d = dist.min(0)
    alfa = np.clip((d - D_FUNDO) / (D_CORPO - D_FUNDO), 0.0, 1.0)
    # Alguns JPEGs têm mais de dois tons de xadrez: qualquer pixel neutro e claro é fundo.
    fundo_neutro = ((rgb.max(2) - rgb.min(2)) < LIMITE_NEUTRO_FUNDO) & (rgb.min(2) >= LIMITE_CLARO_FUNDO)
    alfa = np.where(fundo_neutro, 0.0, alfa)

    # Tira a contaminação do fundo nos pixels de borda: F = (C - T*(1-a)) / a
    tom = np.array(tons, dtype=np.float32)[mais_perto][..., None]
    a3 = np.maximum(alfa[..., None], 1e-3)
    cor = np.clip((f - tom * (1.0 - alfa[..., None])) / a3, 0, 255)

    # Apaga manchas soltas que o ruído do JPEG deixou no fundo.
    rotulos, n = ndimage.label(alfa > 0.5, structure=np.ones((3, 3)))
    if n > 0:
        areas = ndimage.sum(np.ones_like(alfa), rotulos, index=np.arange(1, n + 1))
        minimo = max(60.0, 0.00005 * alfa.size)
        lixo = np.isin(rotulos, 1 + np.flatnonzero(areas < minimo))
        lixo = ndimage.binary_dilation(lixo, iterations=2)
        alfa = np.where(lixo, 0.0, alfa)

    saida = np.dstack([cor, alfa[..., None] * 255.0]).astype(np.uint8)
    return Image.fromarray(saida, "RGBA")


def aparar(imagem):
    alfa = np.asarray(imagem.getchannel("A"))
    ys, xs = np.where(alfa > 10)
    if ys.size == 0:
        raise ValueError("logo sem pixels visíveis depois de remover o fundo")
    return imagem.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def tamanho_de_exibicao(largura, altura):
    """px CSS com a mesma área para todos, respeitando os tetos de largura e altura."""
    escala = min((AREA_ALVO / (largura * altura)) ** 0.5, LARGURA_MAX / largura, ALTURA_MAX / altura)
    return max(1, round(largura * escala)), max(1, round(altura * escala))


def processar(rede, caminho):
    original = Image.open(caminho)
    tem_alfa = original.mode in ("RGBA", "LA") or "transparency" in original.info
    rgba = original.convert("RGBA") if tem_alfa else remover_xadrez(original)
    if tem_alfa and np.asarray(rgba.getchannel("A")).min() == 255:
        rgba = remover_xadrez(original)  # PNG "transparente" que na verdade é opaco com xadrez
    rgba = aparar(rgba)

    largura, altura = tamanho_de_exibicao(*rgba.size)
    alvo = (largura * DENSIDADE, altura * DENSIDADE)
    if alvo[0] < rgba.size[0]:  # nunca amplia
        rgba = rgba.convert("RGBa").resize(alvo, Image.LANCZOS).convert("RGBA")
    SAIDA_IMAGENS.mkdir(parents=True, exist_ok=True)
    destino = SAIDA_IMAGENS / f"{rede}.png"
    rgba.save(destino, optimize=True)
    return {"largura": largura, "altura": altura}, destino.stat().st_size


def main():
    faltando = [f"{rede}: {c}" for rede, c in ORIGENS.items() if not c.exists()]
    if faltando:
        print("Arquivos de origem não encontrados:\n  " + "\n  ".join(faltando), file=sys.stderr)
        return 1
    dados = {}
    for rede, caminho in ORIGENS.items():
        tamanho, bytes_ = processar(rede, caminho)
        dados[rede] = tamanho
        print(f"{rede:10s} {tamanho['largura']:>4d}x{tamanho['altura']:<3d} px CSS  {bytes_ / 1024:6.1f} KB")
    SAIDA_DADOS.write_text(json.dumps(dados, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nTamanhos gravados em {SAIDA_DADOS.relative_to(RAIZ)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
