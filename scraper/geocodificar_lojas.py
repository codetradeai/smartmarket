"""Geocodificação única por CEP das lojas da lista curada (scraper/lojas/lojas.json).

Para cada loja com CEP e sem coordenadas, consulta a BrasilAPI v2 (que devolve coordenadas) e, se ela
não achar o CEP ou falhar, o ViaCEP de reserva (que só confirma o CEP e a cidade, sem coordenadas).
O resultado é gravado no PRÓPRIO arquivo (latitude, longitude e ``geocodificacao`` com status, fonte e
data), então o mesmo CEP nunca é consultado duas vezes: nem na mesma execução (lojas no mesmo CEP
reaproveitam), nem em execuções futuras (loja com coordenadas ou com tentativa registrada é pulada, a
menos que se use ``--refazer``).

Respeita as redes: User-Agent identificado (SMARTMARKET_CONTATO), 2 s entre chamadas e, ao receber
403, 429 ou 503, PARA (salva o que já resolveu) em vez de insistir. Nunca inventa coordenada: sem
coordenada na fonte, a loja fica com status ``sem_coordenada`` para preenchimento manual.
"""
import argparse
import json
import os
import math
import re
import tempfile
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from carregar_lojas import ARQUIVO_PADRAO, normalizar_cep
from identificacao import com_user_agent

URL_BRASILAPI = 'https://brasilapi.com.br/api/cep/v2/{cep}'
URL_VIACEP = 'https://viacep.com.br/ws/{cep}/json/'
URL_NOMINATIM = 'https://nominatim.openstreetmap.org/search'
DISTANCIA_MAXIMA_DO_CEP_KM = 30  # resultado do endereço mais longe que isso da coordenada do CEP é rejeitado
ABREVIACOES_LOGRADOURO = {'av.': 'Avenida', 'av': 'Avenida', 'r.': 'Rua', 'estr.': 'Estrada', 'rod.': 'Rodovia'}
PAUSA_ENTRE_CHAMADAS = 2.0
STATUS_BLOQUEIO = (403, 429, 503)


class ErroGeocodificacao(Exception):
    """Falha de transporte ou resposta inválida de um serviço de CEP."""


class ServicoBloqueou(ErroGeocodificacao):
    """403, 429 ou 503: a regra do projeto é parar naquele serviço, sem nova tentativa."""


def buscar_json(url, *, timeout=10):
    """GET com User-Agent identificado. None quando o CEP não existe (404)."""
    import requests
    try:
        resposta = requests.get(url, headers=com_user_agent({'Accept': 'application/json'}), timeout=timeout)
    except requests.RequestException as exc:
        raise ErroGeocodificacao(type(exc).__name__) from exc
    if resposta.status_code == 404:
        return None
    if resposta.status_code in STATUS_BLOQUEIO:
        raise ServicoBloqueou(f'http_{resposta.status_code}')
    if resposta.status_code >= 400:
        raise ErroGeocodificacao(f'http_{resposta.status_code}')
    try:
        return resposta.json()
    except ValueError as exc:
        raise ErroGeocodificacao('json_invalido') from exc


def _coordenadas_brasilapi(dados):
    coords = ((dados or {}).get('location') or {}).get('coordinates') or {}
    try:
        latitude, longitude = float(coords['latitude']), float(coords['longitude'])
    except (KeyError, TypeError, ValueError):
        return None
    if -90 <= latitude <= 90 and -180 <= longitude <= 180 and (latitude, longitude) != (0.0, 0.0):
        return latitude, longitude
    return None


class _Ritmo:
    """Garante PAUSA_ENTRE_CHAMADAS entre duas chamadas de rede (a primeira não espera)."""

    def __init__(self, dormir):
        self.dormir = dormir
        self.primeira = True

    def chamar(self, buscar, url):
        if not self.primeira:
            self.dormir(PAUSA_ENTRE_CHAMADAS)
        self.primeira = False
        return buscar(url)


def geocodificar_cep(cep, *, buscar, ritmo):
    """Resultado de um CEP: status resolvida | sem_coordenada | nao_encontrada, com a fonte."""
    try:
        dados = ritmo.chamar(buscar, URL_BRASILAPI.format(cep=cep))
    except ServicoBloqueou:
        raise
    except ErroGeocodificacao:
        dados = None  # BrasilAPI indisponivel: tenta a reserva
    if dados:
        coordenadas = _coordenadas_brasilapi(dados)
        resultado = {'status': 'resolvida' if coordenadas else 'sem_coordenada', 'fonte': 'brasilapi_v2',
                     'cidade': dados.get('city'), 'uf': dados.get('state')}
        if coordenadas:
            resultado['latitude'], resultado['longitude'] = coordenadas
        return resultado
    try:
        reserva = ritmo.chamar(buscar, URL_VIACEP.format(cep=cep))
    except ServicoBloqueou:
        raise
    except ErroGeocodificacao:
        reserva = None
    if reserva and not reserva.get('erro'):
        # O ViaCEP nao traz coordenadas: so confirma que o CEP existe (cidade e UF).
        return {'status': 'sem_coordenada', 'fonte': 'viacep', 'cidade': reserva.get('localidade'),
                'uf': reserva.get('uf')}
    return {'status': 'nao_encontrada', 'fonte': 'brasilapi_v2+viacep'}


def _gravar_atomico(caminho, dados):
    caminho = Path(caminho)
    fd, temporario = tempfile.mkstemp(dir=caminho.parent, prefix='.lojas_', suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as arquivo:
            json.dump(dados, arquivo, ensure_ascii=False, indent=2)
            arquivo.write('\n')
        os.replace(temporario, caminho)
    except BaseException:
        if os.path.exists(temporario):
            os.unlink(temporario)
        raise


def geocodificar_arquivo(caminho=ARQUIVO_PADRAO, *, buscar=buscar_json, dormir=time.sleep, refazer=False):
    dados = json.loads(Path(caminho).read_text(encoding='utf-8'))
    ritmo = _Ritmo(dormir)
    resumo = {'resolvidas': 0, 'sem_coordenada': 0, 'nao_encontradas': 0, 'ja_tinham': 0,
              'ja_tentadas': 0, 'reaproveitadas': 0, 'sem_cep_valido': 0, 'interrompido': None}
    por_cep = {}
    for loja in dados.get('lojas', []):  # CEP que o arquivo ja resolveu nao e consultado de novo
        if loja.get('latitude') is not None and loja.get('longitude') is not None and loja.get('cep'):
            try:
                chave = normalizar_cep(loja['cep'])
            except ValueError:
                continue
            por_cep.setdefault(chave, {'status': 'resolvida', 'fonte': 'arquivo',
                                       'latitude': loja['latitude'], 'longitude': loja['longitude']})
    agora = datetime.now(timezone.utc).isoformat(timespec='seconds')
    try:
        for loja in dados.get('lojas', []):
            if loja.get('latitude') is not None and loja.get('longitude') is not None:
                resumo['ja_tinham'] += 1
                continue
            if loja.get('geocodificacao') and not refazer:
                resumo['ja_tentadas'] += 1
                continue
            try:
                cep = normalizar_cep(loja.get('cep'))
            except ValueError:
                resumo['sem_cep_valido'] += 1
                continue
            reaproveitada = cep in por_cep
            if not reaproveitada:
                por_cep[cep] = geocodificar_cep(cep, buscar=buscar, ritmo=ritmo)
            resultado = por_cep[cep]
            if resultado['status'] == 'resolvida':
                loja['latitude'], loja['longitude'] = resultado['latitude'], resultado['longitude']
            loja['geocodificacao'] = {'status': resultado['status'], 'fonte': resultado['fonte'], 'em': agora}
            if resultado['status'] == 'resolvida':
                loja['geocodificacao']['precisao'] = 'cep'  # centro do CEP/cidade, não o endereço da loja
                # guardada à parte: a etapa por endereço sobrescreve latitude/longitude e compara com ela
                loja['geocodificacao']['cep_latitude'] = resultado['latitude']
                loja['geocodificacao']['cep_longitude'] = resultado['longitude']
            chave = {'resolvida': 'resolvidas', 'sem_coordenada': 'sem_coordenada',
                     'nao_encontrada': 'nao_encontradas'}[resultado['status']]
            resumo['reaproveitadas' if reaproveitada else chave] += 1
    except ServicoBloqueou as exc:
        resumo['interrompido'] = str(exc)
    finally:
        _gravar_atomico(caminho, dados)
    return resumo


def _sem_acento(texto):
    base = unicodedata.normalize('NFKD', str(texto or ''))
    return ''.join(c for c in base if not unicodedata.combining(c)).casefold().strip()


def consulta_nominatim(loja):
    """URL da busca estruturada: logradouro e número (sem o bairro), cidade e estado."""
    principal = re.split(r'\s+-\s+', loja['endereco'].strip(), maxsplit=1)[0]  # o que vem depois de " - " é bairro/complemento
    logradouro, _, numero = principal.rpartition(',')
    if not logradouro:  # sem vírgula: só o logradouro
        logradouro, numero = principal, ''
    palavras = logradouro.strip().split(' ', 1)
    palavras[0] = ABREVIACOES_LOGRADOURO.get(palavras[0].casefold(), palavras[0])
    rua = ' '.join(palavras)
    numero = numero.strip()
    street = f'{numero} {rua}' if re.fullmatch(r'\d+[A-Za-z]?', numero) else rua  # "S/N" e afins ficam de fora
    parametros = {'street': street, 'city': loja['cidade'], 'state': 'Rio Grande do Sul', 'countrycodes': 'br',
                  'format': 'jsonv2', 'addressdetails': '1', 'limit': '1'}
    return f'{URL_NOMINATIM}?{urlencode(parametros)}'


def _coordenadas_nominatim(achado):
    try:
        latitude, longitude = float(achado['lat']), float(achado['lon'])
    except (KeyError, TypeError, ValueError):
        return None
    if -90 <= latitude <= 90 and -180 <= longitude <= 180 and (latitude, longitude) != (0.0, 0.0):
        return latitude, longitude
    return None


def distancia_km(lat1, lon1, lat2, lon2):
    """Distância em km pelo círculo máximo (Haversine, raio médio da Terra de 6371 km)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((phi2 - phi1) / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(a))


def _coordenada_do_cep(loja):
    """(lat, lon) do CEP guardada na loja; None se a loja nunca teve coordenada de CEP."""
    g = loja.get('geocodificacao') or {}
    if g.get('cep_latitude') is not None and g.get('cep_longitude') is not None:
        return g['cep_latitude'], g['cep_longitude']
    return None


def _cidade_devolvida(achado):
    endereco = achado.get('address') or {}
    return endereco.get('city') or endereco.get('town') or endereco.get('municipality')


def geocodificar_por_endereco(caminho=ARQUIVO_PADRAO, *, buscar=buscar_json, dormir=time.sleep, refazer=False):
    """Refina as coordenadas pelo endereço (Nominatim/OpenStreetMap), uma chamada por loja e 2 s entre elas.

    Só aceita o resultado se a cidade devolvida for a da loja (sem acento e sem caixa); senão a loja mantém
    o que tinha e ganha ``geocodificacao.endereco = "rejeitada_cidade_diferente"``. Endereço que o Nominatim
    não acha fica registrado como ``"nao_encontrado"``. Loja já resolvida por endereço, ou com tentativa
    registrada, é pulada (a menos de ``refazer``). Ao terminar a etapa COMPLETA, aplica a regra da coordenada
    repetida dentro da mesma rede; se um 403/429/503 interrompeu, salva o que já resolveu e não aplica a regra.
    """
    dados = json.loads(Path(caminho).read_text(encoding='utf-8'))
    lojas = dados.get('lojas', [])
    ritmo = _Ritmo(dormir)
    resumo = {'resolvidas_endereco': 0, 'rejeitadas_cidade': 0, 'rejeitadas_longe_do_cep': 0, 'nao_encontradas': 0,
              'ja_resolvidas': 0, 'sem_endereco': 0, 'anuladas_repetidas': [], 'interrompido': None}
    agora = datetime.now(timezone.utc).isoformat(timespec='seconds')
    for loja in lojas:  # a coordenada que veio do CEP antes desta etapa passa a ser marcada e guardada como tal
        g = loja.get('geocodificacao')
        if g and loja.get('latitude') is not None and 'precisao' not in g:
            g['precisao'] = 'cep'
        if g and g.get('precisao') == 'cep' and loja.get('latitude') is not None and _coordenada_do_cep(loja) is None:
            g['cep_latitude'], g['cep_longitude'] = loja['latitude'], loja['longitude']
    try:
        for loja in lojas:
            g = loja.get('geocodificacao') or {}
            if not loja.get('endereco') or not loja.get('cidade'):
                resumo['sem_endereco'] += 1
                continue
            if not refazer and (g.get('precisao') == 'endereco' or g.get('endereco')):
                resumo['ja_resolvidas'] += 1
                continue
            resposta = ritmo.chamar(buscar, consulta_nominatim(loja))
            achado = resposta[0] if isinstance(resposta, list) and resposta else None
            coordenadas = _coordenadas_nominatim(achado) if achado else None
            g = loja.setdefault('geocodificacao', {})
            if coordenadas is None:
                g['endereco'] = 'nao_encontrado'
                resumo['nao_encontradas'] += 1
            elif _sem_acento(_cidade_devolvida(achado)) != _sem_acento(loja['cidade']):
                g['endereco'] = 'rejeitada_cidade_diferente'
                resumo['rejeitadas_cidade'] += 1
            elif (cep := _coordenada_do_cep(loja)) and distancia_km(*cep, *coordenadas) > DISTANCIA_MAXIMA_DO_CEP_KM:
                g['endereco'] = 'rejeitada_longe_do_cep'  # mesma cidade e mesma rua, mas em outro distrito
                resumo['rejeitadas_longe_do_cep'] += 1
            else:
                loja['latitude'], loja['longitude'] = coordenadas
                novo = {'status': 'resolvida', 'fonte': 'nominatim', 'precisao': 'endereco', 'em': agora}
                if cep:
                    novo['cep_latitude'], novo['cep_longitude'] = cep
                loja['geocodificacao'] = novo
                resumo['resolvidas_endereco'] += 1
        resumo['anuladas_repetidas'] = anular_coordenadas_repetidas(lojas)
    except ServicoBloqueou as exc:
        resumo['interrompido'] = str(exc)
    finally:
        _gravar_atomico(caminho, dados)
    return resumo


def anular_coordenadas_repetidas(lojas):
    """Dentro da MESMA rede, coordenadas idênticas viram null (melhor sem distância do que distância errada).

    Devolve os ``codigo_externo`` das lojas anuladas. Redes diferentes no mesmo ponto não se afetam.
    """
    por_ponto = {}
    for loja in lojas:
        if loja.get('latitude') is not None and loja.get('longitude') is not None:
            por_ponto.setdefault((loja['mercado'], loja['latitude'], loja['longitude']), []).append(loja)
    anuladas = []
    for grupo in por_ponto.values():
        if len(grupo) < 2:
            continue
        for loja in grupo:
            loja['latitude'] = loja['longitude'] = None
            loja.setdefault('geocodificacao', {})['status'] = 'coordenada_repetida'
            anuladas.append(loja['codigo_externo'])
    return anuladas


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--arquivo', type=Path, default=ARQUIVO_PADRAO)
    parser.add_argument('--refazer', action='store_true', help='Consulta de novo lojas com tentativa registrada')
    parser.add_argument('--por-endereco', action='store_true',
                        help='Refina pelo endereço (Nominatim) em vez de consultar o CEP; depois anula coordenadas repetidas na rede')
    args = parser.parse_args(argv)
    try:
        etapa = geocodificar_por_endereco if args.por_endereco else geocodificar_arquivo
        resumo = etapa(args.arquivo, refazer=args.refazer)
    except (OSError, ValueError) as exc:
        print(json.dumps({'status': 'falhou', 'motivo': str(exc)}, ensure_ascii=False))
        return 1
    print(json.dumps(resumo, ensure_ascii=False))
    return 1 if resumo['interrompido'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
