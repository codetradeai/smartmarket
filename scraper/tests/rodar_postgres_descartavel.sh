#!/usr/bin/env bash
# rodar_postgres_descartavel.sh - roda os testes de integracao do scraper contra um PostgreSQL
# DESCARTAVEL (container sem volume, porta so em 127.0.0.1), removido ao terminar. Nunca o Neon.
#
# Uso (da raiz do repositorio, com o Docker em execucao):
#   bash scraper/tests/rodar_postgres_descartavel.sh
#   PG_IMAGE=postgres:15-alpine PG_PORTA=55498 bash scraper/tests/rodar_postgres_descartavel.sh
#
# Roda test_pipeline_postgres (carga e historico) e test_lojas_postgres (vinculo preco x loja por
# coleta, indisponibilidade por loja, carregador de lojas). Sem SMARTMARKET_TEST_DSN esses testes
# sao pulados na suite normal (python -m unittest discover -s scraper/tests).
#
# Notas de ambiente:
#   - O DSN usa 127.0.0.1, nao "localhost": no Windows "localhost" tenta ::1 primeiro e cada
#     conexao espera o timeout (os testes parecem travados).
#   - PYTHONUTF8=1: o DDL da equipe tem acentos e o Python do Windows le em cp1252 por padrao.
#   - O nome do banco inicial precisa comecar com smartmarket_fixture_ (validar_dsn).

set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
IMAGEM="${PG_IMAGE:-postgres:16}"
PORTA="${PG_PORTA:-55497}"
CONTAINER="sm-scraper-pg-$$"

limpar() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap limpar EXIT

docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=descartavel -e POSTGRES_DB=smartmarket_fixture_admin \
    -p "127.0.0.1:${PORTA}:5432" "$IMAGEM" >/dev/null

# A imagem oficial sobe um servidor temporario e reinicia: exige respostas seguidas.
seguidas=0
for _ in $(seq 1 60); do
    if docker exec "$CONTAINER" psql -U postgres -d smartmarket_fixture_admin -c 'select 1' >/dev/null 2>&1; then
        seguidas=$((seguidas + 1)); [ "$seguidas" -ge 3 ] && break
    else
        seguidas=0
    fi
    sleep 1
done
[ "$seguidas" -ge 3 ] || { echo "FALHOU: PostgreSQL nao ficou pronto" >&2; exit 1; }

export PYTHONUTF8=1
export SMARTMARKET_TEST_DSN="host=127.0.0.1 port=${PORTA} dbname=smartmarket_fixture_admin user=postgres password=descartavel"
cd "$RAIZ/scraper/tests"
python -u -m unittest test_pipeline_postgres test_lojas_postgres
echo "TUDO OK em $IMAGEM"
