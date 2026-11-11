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
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from carregar_lojas import ARQUIVO_PADRAO, normalizar_cep
from identificacao import com_user_agent

URL_BRASILAPI = 'https://brasilapi.com.br/api/cep/v2/{cep}'
URL_VIACEP = 'https://viacep.com.br/ws/{cep}/json/'
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
            chave = {'resolvida': 'resolvidas', 'sem_coordenada': 'sem_coordenada',
                     'nao_encontrada': 'nao_encontradas'}[resultado['status']]
            resumo['reaproveitadas' if reaproveitada else chave] += 1
    except ServicoBloqueou as exc:
        resumo['interrompido'] = str(exc)
    finally:
        _gravar_atomico(caminho, dados)
    return resumo


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--arquivo', type=Path, default=ARQUIVO_PADRAO)
    parser.add_argument('--refazer', action='store_true', help='Consulta de novo lojas com tentativa registrada')
    args = parser.parse_args(argv)
    try:
        resumo = geocodificar_arquivo(args.arquivo, refazer=args.refazer)
    except (OSError, ValueError) as exc:
        print(json.dumps({'status': 'falhou', 'motivo': str(exc)}, ensure_ascii=False))
        return 1
    print(json.dumps(resumo, ensure_ascii=False))
    return 1 if resumo['interrompido'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
