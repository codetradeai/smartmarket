"""Captura de EAN pela página pública do produto (HTML), sem usar a API.

Usado por Zaffari e Rissul (cujo robots.txt proíbe ``/api``) e pelo Carrefour
(a listagem não traz EAN). Respeita intervalo mínimo entre requisições por
host, usa User-Agent identificável e para ao primeiro 403/429, sem tentar
contornar bloqueios.
"""
import logging
import re
import time
from typing import Callable, Iterable, Optional

from ean import validar_ean
from identificacao import com_user_agent

LOGGER = logging.getLogger(__name__)

PAUSA_MINIMA_S = 2.0

# Zaffari/Rissul (VTEX IO): "ean":"789..." no estado da página.
# Carrefour: "gtin":"789..." no JSON-LD (schema.org Product).
_CHAVES_EAN = re.compile(r'"(?:ean|gtin13|gtin12|gtin8|gtin14|gtin)"\s*:\s*"(\d+)"', re.I)


class BloqueioDetectado(Exception):
    """Resposta 403/429: a captura de EAN deve parar."""


def extrair_ean_html(html: Optional[str]) -> Optional[str]:
    """Primeiro GTIN válido encontrado nas chaves ean/gtin do HTML; ``None`` se não houver."""
    if not isinstance(html, str):
        return None
    for m in _CHAVES_EAN.finditer(html):
        valido = validar_ean(m.group(1), aceitar_ean8=False)  # refs internas de 8 dígitos passam no DV por acaso
        if valido:
            return valido
    return None


def buscar_html(url: str, *, timeout: int = 20) -> str:
    import requests

    resposta = requests.get(url, headers=com_user_agent({"Accept": "text/html"}), timeout=timeout)
    if resposta.status_code in (403, 429):
        raise BloqueioDetectado(str(resposta.status_code))
    resposta.raise_for_status()
    resposta.encoding = "utf-8"
    return resposta.text


def enriquecer_com_ean(produtos: Iterable[dict], *, url_de: Callable[[dict], Optional[str]],
                       buscar: Callable[[str], str] = buscar_html, dormir=time.sleep,
                       pausa: float = PAUSA_MINIMA_S) -> dict:
    """Preenche ``codigo_barras`` de cada produto lendo a página do produto.

    Faz no máximo 1 requisição por vez, com ``pausa`` (mínimo 2 s) entre elas.
    """
    pausa = max(pausa, PAUSA_MINIMA_S)  # nunca abaixo do intervalo mínimo por host
    resumo = {"consultados": 0, "com_ean": 0, "falhas": 0, "interrompido_por_bloqueio": False}
    primeira = True
    for produto in produtos:
        url = url_de(produto)
        if not url:
            continue
        if not primeira:
            dormir(pausa)
        primeira = False
        resumo["consultados"] += 1
        try:
            produto["codigo_barras"] = extrair_ean_html(buscar(url))
        except BloqueioDetectado as exc:
            LOGGER.warning("bloqueio_ao_buscar_ean status=%s; captura de EAN interrompida", exc)
            resumo["interrompido_por_bloqueio"] = True
            break
        except Exception as exc:  # falha isolada não derruba a coleta
            LOGGER.warning("falha_ao_buscar_ean %s", type(exc).__name__)
            resumo["falhas"] += 1
            continue
        if produto.get("codigo_barras"):
            resumo["com_ean"] += 1
    return resumo
