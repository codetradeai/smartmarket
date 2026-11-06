#!/usr/bin/env bash
# test_seed_integridade.sh — testa itens 2 e 3 do relatório de revisão do #67
#
# Uso:
#   bash backend/deploy/test_seed_integridade.sh [PG_DSN]
#
# PG_DSN padrão: postgresql://smartmarket:smartmarket@localhost:5436/postgres
#
# O que testa:
#   1. Aplica 01→02→03 em banco vazio.
#   2. Checksum MD5 dos 530 pares (produto_id, mercado_nome, valor)
#      é igual ao aplicando com a ordem dos mercados trocada no 02
#      (os subselects no 03 resolvem por nome, independente do id).
#   3. 0 divergências (produto/rede/valor) em ambos os cenários.
#   4. INSERT de produto e preço sem id explícito após a carga deve funcionar
#      (valida setval das sequências).
#   5. Mutação: 03_carga reescrito com id numérico fixo (versão antiga) + 02
#      sem IDs explícitos → deve registrar divergências, provando que a correção
#      (subselect no 03 + IDs explícitos no 02) é necessária.
#
# Requer: psql disponível no PATH ou DOCKER_CONTAINER definido para docker exec.

set -euo pipefail

DSN="${1:-postgresql://smartmarket:smartmarket@localhost:5436/postgres}"
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_A="sm_test_a_$$"
DB_B="sm_test_b_$$"
DB_MUT="sm_test_mut_$$"

# Detecta docker exec como fallback quando psql não está no PATH
if command -v psql >/dev/null 2>&1; then
    PG_EXEC="psql $DSN"
else
    CONTAINER="${DOCKER_CONTAINER:-smartmarket-db}"
    PG_EXEC="docker exec -i $CONTAINER psql -U smartmarket"
    # DSN_SUFFIX extrai apenas o nome do banco
    db_from_dsn() { printf '%s' "${1##*/}"; }
fi

run_sql() {
    local db="$1"; shift
    if command -v psql >/dev/null 2>&1; then
        psql "${DSN%/*}/$db" "$@"
    else
        # docker exec: converte -f FILE em stdin redirection
        local args=() file=""
        while [[ $# -gt 0 ]]; do
            case "$1" in
                -f) file="$2"; shift 2 ;;
                *)  args+=("$1"); shift ;;
            esac
        done
        if [[ -n "$file" ]]; then
            docker exec -i "$CONTAINER" psql -U smartmarket -d "$db" "${args[@]}" < "$file"
        else
            docker exec -i "$CONTAINER" psql -U smartmarket -d "$db" "${args[@]}"
        fi
    fi
}

create_db() {
    if command -v psql >/dev/null 2>&1; then
        psql "$DSN" -c "CREATE DATABASE $1"
    else
        docker exec "$CONTAINER" psql -U smartmarket -c "CREATE DATABASE $1"
    fi
}

drop_db() {
    if command -v psql >/dev/null 2>&1; then
        psql "$DSN" -c "DROP DATABASE IF EXISTS $1" 2>/dev/null || true
    else
        docker exec "$CONTAINER" psql -U smartmarket -c "DROP DATABASE IF EXISTS $1" 2>/dev/null || true
    fi
}

cleanup() {
    drop_db "$DB_A"
    drop_db "$DB_B"
    drop_db "$DB_MUT"
}
trap cleanup EXIT

DIVERGENCE_QUERY="
  SELECT COUNT(*) FROM preco p JOIN mercado m ON p.mercado_id = m.id
  WHERE p.origem LIKE 'seed_%'
    AND NOT (
      (p.origem='seed_asun'     AND m.nome='Asun Supermercados')    OR
      (p.origem='seed_atacadao' AND m.nome='Atacadão')              OR
      (p.origem='seed_master'   AND m.nome='Master Supermercados')  OR
      (p.origem='seed_zaffari'  AND m.nome='Zaffari / Bourbon')     OR
      (p.origem='seed_rissul'   AND m.nome='Supermercados Rissul')  OR
      (p.origem='seed_stok'     AND m.nome='Stok Center')
    );"

CHECKSUM_QUERY="
  SELECT md5(string_agg(concat(p.produto_id,'|',m.nome,'|',p.valor::text), ',' ORDER BY p.produto_id, m.nome))
  FROM preco p JOIN mercado m ON p.mercado_id = m.id
  WHERE p.origem LIKE 'seed_%'
  HAVING COUNT(*) = 530;"

FAIL=0

# ----------------------------------------------------------------
echo "=== [1+2+3] Banco A: 02 com IDs explícitos + 03 com subselect ==="
create_db "$DB_A"
run_sql "$DB_A" -f "$DEPLOY_DIR/01_schema.sql"  > /dev/null
run_sql "$DB_A" -f "$DEPLOY_DIR/02_mercados.sql" > /dev/null
run_sql "$DB_A" -f "$DEPLOY_DIR/03_carga.sql"    > /dev/null

CS_A=$(run_sql "$DB_A" -t -A -c "$CHECKSUM_QUERY")
DIV_A=$(run_sql "$DB_A" -t -A -c "$DIVERGENCE_QUERY")

if [ -z "$CS_A" ]; then
    echo "   FALHA: não retornou exatamente 530 preços seed no banco A."
    FAIL=1
elif [ "$DIV_A" -ne 0 ]; then
    echo "   FALHA: $DIV_A divergências de rede no banco A."
    FAIL=1
else
    echo "   OK: checksum=$CS_A, divergências=0"
fi

# ----------------------------------------------------------------
echo ""
echo "=== [2b] Banco B: 02 com ordem trocada (sem IDs) + 03 com subselect ==="
create_db "$DB_B"
run_sql "$DB_B" -f "$DEPLOY_DIR/01_schema.sql" > /dev/null

# 02 mutado: mesmos nomes mas sem IDs explícitos e ordem trocada
run_sql "$DB_B" -c "
INSERT INTO mercado (nome, endereco, logo_url, ativo)
SELECT v.nome, v.endereco, v.logo_url, v.ativo
FROM (VALUES
    ('Stok Center',           'RS-020, km 5, Viamão, RS',                       NULL::varchar, TRUE),
    ('Supermercados Rissul',  'Av. Protásio Alves, 7000, Porto Alegre, RS',      NULL::varchar, TRUE),
    ('Zaffari / Bourbon',     'Av. Ipiranga, 1575, Porto Alegre, RS',            NULL::varchar, TRUE),
    ('Master Supermercados',  'Av. Nilo Peçanha, 2900, Porto Alegre, RS',        NULL::varchar, TRUE),
    ('Atacadão',              'Av. Presidente Vargas, 1000, Porto Alegre, RS',   NULL::varchar, TRUE),
    ('Asun Supermercados',    'Av. Cavalhada, 2200, Porto Alegre, RS',           NULL::varchar, TRUE),
    ('Carrefour Mercado',     'Av. Ipiranga, 5300, Porto Alegre, RS',            NULL::varchar, TRUE),
    ('Fort Atacadista',       'Av. Assis Brasil, 2615, Porto Alegre, RS',        NULL::varchar, TRUE)
) AS v(nome, endereco, logo_url, ativo)
WHERE NOT EXISTS (SELECT 1 FROM mercado m WHERE m.nome = v.nome);" > /dev/null

run_sql "$DB_B" -f "$DEPLOY_DIR/03_carga.sql" > /dev/null

CS_B=$(run_sql "$DB_B" -t -A -c "$CHECKSUM_QUERY")
DIV_B=$(run_sql "$DB_B" -t -A -c "$DIVERGENCE_QUERY")

if [ "$CS_B" != "$CS_A" ]; then
    echo "   FALHA: checksums diferentes entre banco A e B ($CS_B != $CS_A)."
    echo "   O subselect deveria achar o mercado por nome independente da ordem."
    FAIL=1
elif [ "$DIV_B" -ne 0 ]; then
    echo "   FALHA: $DIV_B divergências no banco B apesar do subselect."
    FAIL=1
else
    echo "   OK: checksum idêntico ao banco A, 0 divergências."
fi

# ----------------------------------------------------------------
echo ""
echo "=== [3] Insert sem id após carga (valida setval) ==="
run_sql "$DB_A" -c "
  INSERT INTO produto (nome, nome_normalizado, marca, quantidade, unidade, categoria)
  VALUES ('Produto Setval Teste', 'produto setval teste', 'T', 1.0, 'un', 'mercearia');" > /dev/null

NOVO=$(run_sql "$DB_A" -t -A -c "SELECT id FROM produto WHERE nome = 'Produto Setval Teste';")
NOVO=$(echo "$NOVO" | tr -d '[:space:]')

if [ -z "$NOVO" ] || [ "$NOVO" -le 530 ]; then
    echo "   FALHA: id do produto novo ($NOVO) não é > 530."
    FAIL=1
else
    run_sql "$DB_A" -c "
      INSERT INTO preco (produto_id, mercado_id, valor, coletado_em, origem, nome_bruto, disponivel)
      VALUES ($NOVO, 3, 1.99, CURRENT_DATE, 'teste_setval', 'Produto Setval Teste', TRUE);" > /dev/null
    echo "   OK: produto id=$NOVO inserido sem conflito."
fi

# ----------------------------------------------------------------
echo ""
echo "=== [4] Mutação: 03 com id numérico fixo + 02 sem IDs explícitos ==="
# Gera versão do 03 com hardcoded ids (estilo antigo)
TMP_03_OLD=$(mktemp)
sed 's/(SELECT id FROM mercado WHERE nome = '\''Asun Supermercados'\'')/3/g;
     s/(SELECT id FROM mercado WHERE nome = '\''Atacad[^'\'']*'\'')/4/g;
     s/(SELECT id FROM mercado WHERE nome = '\''Master Supermercados'\'')/5/g;
     s/(SELECT id FROM mercado WHERE nome = '\''Zaffari[^'\'']*'\'')/6/g;
     s/(SELECT id FROM mercado WHERE nome = '\''Supermercados Rissul'\'')/7/g;
     s/(SELECT id FROM mercado WHERE nome = '\''Stok Center'\'')/8/g' \
     "$DEPLOY_DIR/03_carga.sql" > "$TMP_03_OLD"

create_db "$DB_MUT"
run_sql "$DB_MUT" -f "$DEPLOY_DIR/01_schema.sql" > /dev/null

# 02 sem IDs explícitos com ordem diferente
run_sql "$DB_MUT" -c "
INSERT INTO mercado (nome, endereco, logo_url, ativo)
SELECT v.nome, v.endereco, v.logo_url, v.ativo
FROM (VALUES
    ('Master Supermercados',  'Av. Nilo Peçanha, 2900, Porto Alegre, RS',        NULL::varchar, TRUE),
    ('Fort Atacadista',       'Av. Assis Brasil, 2615, Porto Alegre, RS',        NULL::varchar, TRUE),
    ('Supermercados Rissul',  'Av. Protásio Alves, 7000, Porto Alegre, RS',      NULL::varchar, TRUE),
    ('Atacadão',              'Av. Presidente Vargas, 1000, Porto Alegre, RS',   NULL::varchar, TRUE),
    ('Zaffari / Bourbon',     'Av. Ipiranga, 1575, Porto Alegre, RS',            NULL::varchar, TRUE),
    ('Asun Supermercados',    'Av. Cavalhada, 2200, Porto Alegre, RS',           NULL::varchar, TRUE),
    ('Carrefour Mercado',     'Av. Ipiranga, 5300, Porto Alegre, RS',            NULL::varchar, TRUE),
    ('Stok Center',           'RS-020, km 5, Viamão, RS',                        NULL::varchar, TRUE)
) AS v(nome, endereco, logo_url, ativo)
WHERE NOT EXISTS (SELECT 1 FROM mercado m WHERE m.nome = v.nome);" > /dev/null

run_sql "$DB_MUT" -f "$TMP_03_OLD" > /dev/null 2>&1 || true
rm -f "$TMP_03_OLD"

DIV_MUT=$(run_sql "$DB_MUT" -t -A -c "$DIVERGENCE_QUERY")

if [ "$DIV_MUT" -eq 0 ]; then
    echo "   FALHA: mutação não produziu divergências — a proteção não está cobrindo o caso."
    FAIL=1
else
    echo "   OK: mutação produziu $DIV_MUT divergências (bug detectado corretamente)."
fi

# ----------------------------------------------------------------
echo ""
echo "=== [5] NOT NULL: nome de mercado errado deve causar falha ==="
# Subselect com nome inexistente retorna NULL; NOT NULL em preco.mercado_id deve rejeitar
set +e
run_sql "$DB_A" -c "
  INSERT INTO preco (produto_id, mercado_id, valor, coletado_em, origem, nome_bruto, disponivel)
  VALUES (1, (SELECT id FROM mercado WHERE nome = 'Mercado Inexistente XYZ'), 9.99, CURRENT_DATE, 'teste_null', 'Produto Teste Null', TRUE);" > /dev/null 2>&1
INSERT_RC=$?
set -e

if [ "$INSERT_RC" -eq 0 ]; then
    echo "   FALHA: INSERT com mercado inexistente deveria ter falhado (NOT NULL violado), mas foi aceito."
    FAIL=1
else
    echo "   OK: INSERT com mercado inexistente rejeitado corretamente (NOT NULL em mercado_id)."
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
    echo "=== TODOS OS TESTES PASSARAM ==="
else
    echo "=== ALGUNS TESTES FALHARAM ==="
    exit 1
fi
