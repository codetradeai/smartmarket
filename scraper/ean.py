"""Validação de EAN/GTIN (EAN-8, UPC-A/12, EAN-13 e GTIN-14).

Só é EAN o que tem comprimento permitido E dígito verificador correto.
Códigos internos de loja (ex.: 5 a 9 dígitos vistos no Master) NÃO são EAN e
devem ser descartados do campo ``codigo_barras``.
"""
import re
from typing import Optional

COMPRIMENTOS = {8: "EAN-8", 12: "UPC-A", 13: "EAN-13", 14: "GTIN-14"}


def digito_verificador_valido(digitos: str) -> bool:
    """Módulo 10 do GS1: pesos 3/1 alternados a partir do dígito mais à direita (sem o verificador)."""
    if not digitos.isdigit() or len(digitos) < 2:
        return False
    corpo, verificador = digitos[:-1], int(digitos[-1])
    soma = sum(int(d) * (3 if i % 2 == 0 else 1) for i, d in enumerate(reversed(corpo)))
    return (10 - soma % 10) % 10 == verificador


def validar_ean(valor, *, aceitar_ean8: bool = True) -> Optional[str]:
    """Devolve o código (somente dígitos) se for GTIN válido; senão ``None``.

    ``aceitar_ean8=False`` serve às fontes cujos códigos internos curtos
    poderiam passar no dígito verificador por acaso (Master/Stok).
    """
    if valor is None or isinstance(valor, bool):
        return None
    if isinstance(valor, int):
        valor = str(valor)
    if not isinstance(valor, str):
        return None
    codigo = valor.strip()
    if not re.fullmatch(r"\d+", codigo):
        return None
    if len(codigo) not in COMPRIMENTOS or (len(codigo) == 8 and not aceitar_ean8):
        return None
    if int(codigo) == 0 or not digito_verificador_valido(codigo):
        return None
    return codigo


def tipo_ean(codigo: str) -> Optional[str]:
    valido = validar_ean(codigo)
    return COMPRIMENTOS[len(valido)] if valido else None


def ean_canonico(codigo) -> Optional[str]:
    """Chave de comparação entre redes: GTIN-14 com zeros à esquerda (UPC-A == EAN-13 com 0 inicial)."""
    valido = validar_ean(codigo)
    return valido.zfill(14) if valido else None
