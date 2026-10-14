"""Cria nova base descartável e aplica somente CREATE do DDL da equipe."""
import argparse
import os
from pathlib import Path
import re

from pipeline import validar_dsn


def preparar_banco(dsn, nome):
    import psycopg
    from psycopg import sql
    from psycopg.conninfo import make_conninfo
    config = validar_dsn(dsn)
    if not re.fullmatch(r'smartmarket_fixture_[a-z0-9_]+', nome):
        raise ValueError('nome_de_banco_fixture_invalido')
    with psycopg.connect(**config, autocommit=True) as conn:
        # Falha se já existir: nunca limpa/substitui uma base.
        conn.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(nome)))
    config['dbname'] = nome
    target = make_conninfo(**config)
    ddl = (Path(__file__).resolve().parents[1] / 'backend/smartmarket_ddl_updated.sql').read_text()
    ddl = '\n'.join(line for line in ddl.splitlines() if not line.lstrip().upper().startswith('DROP '))
    with psycopg.connect(target) as conn:
        conn.execute(ddl)
        # Explicitamente sintéticos. Não representam três redes coletadas.
        for nome_mercado in ['Fixture Fort (sintético)', 'Fixture rede B (sintético)', 'Fixture rede C (sintético)']:
            conn.execute('INSERT INTO mercado(nome) VALUES(%s)',(nome_mercado,))
    return nome


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--name',required=True)
    args=parser.parse_args(argv)
    name=preparar_banco(os.environ.get('SMARTMARKET_LOCAL_DSN',''),args.name)
    print('Base descartável criada:', name, '(mercados sintéticos IDs 1, 2, 3)')


if __name__ == '__main__':
    main()
