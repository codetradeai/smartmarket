"""Normalização conservadora; identidade entre redes exige vínculo explícito."""
import re
import unicodedata
from decimal import Decimal

MEDIDA = re.compile(r'(?<![\w.,+\-])(\d+(?:[.,]\d+)?)\s*(kg|ml|mg|g|l|un)(?![a-z])', re.I)
MULTIPACK = re.compile(
    r'\d\s*[x×]|(?:kit|pack|pacote\s+com|leve\s+\d)|'
    r'\d+\s*(?:unidades?|latas?|garrafas?|saches?|frascos?|caixas?)\b', re.I)
MEDIDA_COM_SINAL = re.compile(r'[+\-−]\s*\d+(?:[.,]\d+)?\s*(?:kg|ml|mg|g|l|un)\b', re.I)


def texto_normalizado(texto):
    return ' '.join(''.join(c for c in unicodedata.normalize('NFKD', texto.casefold())
                           if not unicodedata.combining(c)).split())


def normalizar_produto(registro):
    nome = registro.get('nome_bruto')
    if not isinstance(nome, str) or not nome.strip():
        raise ValueError('nome_bruto_invalido')
    marca = registro.get('marca')
    if marca is not None and (not isinstance(marca, str) or not marca.strip()):
        raise ValueError('marca_invalida')
    nome_normalizado = texto_normalizado(nome)
    medidas = MEDIDA.findall(nome_normalizado)
    quantidade, unidade = None, None
    pendencias = []
    if (MULTIPACK.search(nome_normalizado) or MEDIDA_COM_SINAL.search(nome_normalizado) or len(medidas) != 1
            or (medidas and re.search(r'[.,]\d{3}$', medidas[0][0]))):
        pendencias.append('embalagem_ausente_ou_ambigua')
    else:
        valor, unidade = medidas[0]
        quantidade = Decimal(valor.replace(',', '.'))
        if quantidade <= 0:
            quantidade, unidade = None, None
            pendencias.append('embalagem_invalida')
    if marca is None:
        pendencias.append('marca_ausente')
    # Não inferir EAN, converter tamanhos, nem fundir marcas/embalagens.
    return {'nome': nome.strip(), 'nome_normalizado': nome_normalizado,
            'marca': marca.strip() if marca else None, 'quantidade': quantidade,
            'unidade': unidade, 'codigo_barras': None,
            'categoria': registro.get('categoria'), 'pendencias': pendencias}
