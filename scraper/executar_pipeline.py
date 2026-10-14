"""Orquestra fixture Fort -> extração -> normalização -> carga local com checkpoint."""
import argparse
from decimal import Decimal
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re

import coleta_fort_atacadista as fort
from pipeline import carregar, ErroIngestao, validar_dsn


def executar(*, fixture, output_root, run_id, dsn, mercado_id):
    # Só fixtures nesta fatia: nenhuma chamada HTTP é feita pelo orquestrador.
    validar_dsn(dsn)
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', run_id):
        raise ErroIngestao('run_id_invalido_para_diretorio')
    fixture = Path(fixture)
    fingerprint = hashlib.sha256(fixture.read_bytes()).hexdigest()
    esperado = {'fixture_sha256': fingerprint, 'mercado_id': mercado_id,
                'source': 'fort', 'store': fort.STORE_ID, 'run_id': run_id}
    directory = Path(output_root) / run_id
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / '.run.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        manifest = directory / 'manifest.json'
        if manifest.exists():
            salvo = json.loads(manifest.read_text())
            if salvo != esperado:
                raise ErroIngestao('run_id_local_reutilizado_com_configuracao_diferente')
        else:
            fort.salvar_atomico(manifest, lambda f: json.dump(esperado, f, indent=2))
        checkpoint = directory / 'extracao_concluida.json'
        if not checkpoint.exists():
            status = fort.main(['--fixture', str(fixture), '--output-dir', str(directory)])
            if status != 0:
                raise ErroIngestao('extracao_parcial_ou_falhou_carga_bloqueada')
            raw = directory / 'produtos_coletados.json'
            fort.salvar_atomico(checkpoint, lambda f: json.dump({'sha256': hashlib.sha256(raw.read_bytes()).hexdigest()}, f))
        raw = directory / 'produtos_coletados.json'
        if hashlib.sha256(raw.read_bytes()).hexdigest() != json.loads(checkpoint.read_text())['sha256']:
            raise ErroIngestao('checkpoint_alterado')
        registros = json.loads(raw.read_text(), parse_float=Decimal)
        resumo = carregar(registros, dsn=dsn, source='fort', store=fort.STORE_ID,
                          mercado_id=mercado_id, run_id=run_id)
        fort.salvar_atomico(directory / 'resultado_carga.json', lambda f: json.dump(resumo, f, ensure_ascii=False, indent=2))
        return resumo


def main(argv=None):
    import psycopg
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fixture', required=True, type=Path)
    parser.add_argument('--output-root', type=Path, default=Path('scraper/output/runs'))
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--mercado-id', required=True, type=int)
    args = parser.parse_args(argv)
    try:
        result = executar(fixture=args.fixture, output_root=args.output_root,
                          run_id=args.run_id, mercado_id=args.mercado_id,
                          dsn=os.environ.get('SMARTMARKET_LOCAL_DSN',''))
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (OSError, ValueError) as exc:
        print(json.dumps({'status':'falhou','motivo':str(exc)}, ensure_ascii=False))
        return 1
    except psycopg.Error as exc:
        print(json.dumps({'status': 'falhou', 'motivo': type(exc).__name__}))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
