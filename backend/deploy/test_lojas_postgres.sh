#!/usr/bin/env bash
# test_lojas_postgres.sh - valida 06_lojas_por_cep.sql e 07_indice_unico_vinculo_vigente.sql
# em PostgreSQL de verdade (o H2 dos testes Java nao cobre indice parcial nem tudo do dialeto).
#
# Uso:
#   bash backend/deploy/test_lojas_postgres.sh
#   PG_IMAGE=postgres:16-alpine bash backend/deploy/test_lojas_postgres.sh
#
# Sobe um container DESCARTAVEL (sem volume, sem porta publicada) e o remove ao terminar.
# Nunca aponta para o Neon nem para qualquer banco existente. Requer Docker em execucao.
#
# O que confere:
#   1. 01 -> 05 em banco vazio + historico sintetico (varias coletas por produto/mercado,
#      algumas indisponiveis, usuario e promocoes antigos).
#   2. 06 duas vezes: nada muda na 2a (mesmas contagens e mesmo checksum), preco intacto,
#      uma loja padrao por mercado, um vinculo por preco, um vinculo vigente por produto/mercado.
#   3. Cadeia de vigencia = proxima coleta; disponibilidade por loja = a do preco.
#   4. Reexecucao com preco legado novo fecha o vinculo anterior.
#   5. 07 duas vezes; depois disso uma loja NAO aceita dois vinculos vigentes do mesmo produto,
#      mas aceita fechar o antigo e abrir o novo na mesma transacao.
#   6. FK composta rejeita produto_id divergente do preco.
#   7. Apagar um preco apaga os vinculos (cascata): PrecoService.remover depende disso.

set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGEM="${PG_IMAGE:-postgres:16}"
CONTAINER="sm-lojas-validacao-$$"

limpar() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap limpar EXIT

falha() { echo "FALHOU: $*" >&2; exit 1; }
ok() { echo "ok - $*"; }

psql_() { docker exec -i "$CONTAINER" psql -U postgres -d sm_valida -v ON_ERROR_STOP=1 -q -t -A "$@"; }
aplicar() { psql_ < "$DEPLOY_DIR/$1" >/dev/null 2>&1 || falha "falha ao aplicar $1"; }
esperar_igual() { [ "$2" = "$3" ] || falha "$1: esperado '$2', obtido '$3'"; ok "$1 = $3"; }

docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=descartavel -e POSTGRES_DB=sm_valida "$IMAGEM" >/dev/null
# A imagem oficial sobe um servidor temporario e reinicia: exige respostas seguidas.
seguidas=0
for _ in $(seq 1 60); do
    if docker exec "$CONTAINER" psql -U postgres -d sm_valida -c 'select 1' >/dev/null 2>&1; then
        seguidas=$((seguidas + 1)); [ "$seguidas" -ge 3 ] && break
    else
        seguidas=0
    fi
    sleep 1
done
[ "$seguidas" -ge 3 ] || falha "PostgreSQL nao ficou pronto"

for f in 01_schema 02_mercados 03_carga 04_adiciona_ativa_promocao 05_corrige_nome_normalizado; do
    aplicar "$f.sql"
done

psql_ >/dev/null <<'SQL'
INSERT INTO preco(produto_id, mercado_id, valor, coletado_em, origem, disponivel)
SELECT p.produto_id, p.mercado_id, p.valor + n, p.coletado_em + (n || ' days')::interval, 'sintetico', (n <> 3)
FROM (SELECT * FROM preco ORDER BY id LIMIT 120) p, generate_series(1,3) n;
INSERT INTO preco(produto_id, mercado_id, valor, coletado_em, origem, disponivel)
SELECT produto_id, mercado_id, valor, coletado_em + interval '10 days', 'sintetico', true
FROM preco WHERE origem = 'sintetico' AND disponivel LIMIT 20;
INSERT INTO usuario(nome, email, senha, papel) VALUES ('Maria Teste', 'maria@teste.com', 'x', 'USER');
INSERT INTO promocao(produto_id, mercado_id, valor_original, valor_promocional, data_inicio, coletado_em)
SELECT produto_id, mercado_id, valor, valor - 1, current_date, now() FROM preco WHERE valor > 2 LIMIT 3;
SQL

CHECKSUM_PRECO="select md5(string_agg(id||':'||produto_id||':'||mercado_id||':'||valor||':'||coletado_em||':'||disponivel||':'||coalesce(origem,''), ',' order by id)) from preco"
ESTADO="select (select count(*) from loja)||'/'||(select count(*) from preco_loja)||'/'||(select count(*) from preco_loja where vigente_ate is null)||'/'||(select md5(string_agg(id||':'||preco_id||':'||loja_id||':'||disponivel||':'||vigente_desde||':'||coalesce(vigente_ate::text,'-'), ',' order by id)) from preco_loja)"

ANTES_PRECO="$(psql_ -c "$CHECKSUM_PRECO")"
TOTAL_PRECO="$(psql_ -c 'select count(*) from preco')"
MERCADOS="$(psql_ -c 'select count(*) from mercado')"
PARES="$(psql_ -c 'select count(*) from (select distinct produto_id, mercado_id from preco) x')"

aplicar 06_lojas_por_cep.sql
ESTADO1="$(psql_ -c "$ESTADO")"
aplicar 06_lojas_por_cep.sql
ESTADO2="$(psql_ -c "$ESTADO")"

esperar_igual "2a execucao do 06 nao altera nada" "$ESTADO1" "$ESTADO2"
esperar_igual "preco intacto (checksum)" "$ANTES_PRECO" "$(psql_ -c "$CHECKSUM_PRECO")"
esperar_igual "uma loja padrao por mercado" "$MERCADOS" "$(psql_ -c 'select count(*) from loja')"
esperar_igual "um vinculo por preco" "$TOTAL_PRECO" "$(psql_ -c 'select count(*) from preco_loja')"
esperar_igual "um vinculo vigente por produto/mercado" "$PARES" "$(psql_ -c 'select count(*) from preco_loja where vigente_ate is null')"
esperar_igual "preco sem vinculo" "0" "$(psql_ -c 'select count(*) from preco p where not exists (select 1 from preco_loja pl where pl.preco_id = p.id)')"
esperar_igual "vigencia = proxima coleta" "0" "$(psql_ -c "select count(*) from (select pl.vigente_ate, lead(p.coletado_em) over (partition by p.produto_id, p.mercado_id order by p.coletado_em, p.id) prox from preco_loja pl join preco p on p.id = pl.preco_id) x where vigente_ate is distinct from prox")"
esperar_igual "disponibilidade do vinculo = a do preco" "0" "$(psql_ -c 'select count(*) from preco_loja pl join preco p on p.id = pl.preco_id where pl.disponivel is distinct from p.disponivel')"
esperar_igual "produto_id do vinculo = o do preco" "0" "$(psql_ -c 'select count(*) from preco_loja pl join preco p on p.id = pl.preco_id where pl.produto_id <> p.produto_id')"
esperar_igual "usuarios antigos sem localizacao" "1" "$(psql_ -c 'select count(*) from usuario where cep is null and loja_preferida_id is null')"
esperar_igual "promocoes antigas valem para a rede toda" "3" "$(psql_ -c 'select count(*) from promocao where loja_id is null')"

# Reexecucao com preco legado novo: o vinculo que era o mais recente passa a ser fechado.
psql_ -c "insert into preco(produto_id, mercado_id, valor, coletado_em, origem, disponivel) select produto_id, mercado_id, valor + 50, now(), 'legado_novo', true from preco where origem is distinct from 'sintetico' order by id limit 1" >/dev/null
aplicar 06_lojas_por_cep.sql
esperar_igual "reexecucao vincula o preco legado novo" "$((TOTAL_PRECO + 1))" "$(psql_ -c 'select count(*) from preco_loja')"
esperar_igual "reexecucao mantem um vigente por par" "$PARES" "$(psql_ -c 'select count(*) from preco_loja where vigente_ate is null')"

# 07: indice unico parcial. Duas execucoes (idempotente) e a regra passa a valer.
aplicar 07_indice_unico_vinculo_vigente.sql
aplicar 07_indice_unico_vinculo_vigente.sql
esperar_igual "indice uk_preco_loja_vigente existe" "1" "$(psql_ -c "select count(*) from pg_indexes where indexname = 'uk_preco_loja_vigente'")"

ALVO="$(psql_ -c 'select pl.loja_id||chr(124)||pl.produto_id||chr(124)||p.mercado_id from preco_loja pl join preco p on p.id = pl.preco_id where pl.vigente_ate is null order by pl.id limit 1')"
LOJA="${ALVO%%|*}"; RESTO="${ALVO#*|}"; PRODUTO="${RESTO%%|*}"; MERCADO="${RESTO#*|}"

# Dois vinculos vigentes do mesmo produto na mesma loja: o banco tem de recusar.
NOVO_PRECO="$(psql_ -c "insert into preco(produto_id, mercado_id, valor, coletado_em, origem) values ($PRODUTO, $MERCADO, 99.90, now(), 'teste_07') returning id")"
MSG="$(psql_ -c "insert into preco_loja(preco_id, produto_id, loja_id, vigente_desde, confirmado_em) values ($NOVO_PRECO, $PRODUTO, $LOJA, now(), now())" 2>&1 || true)"
echo "$MSG" | grep -q 'uk_preco_loja_vigente' || falha "o banco aceitou dois vinculos vigentes do mesmo produto na mesma loja: $MSG"
ok "segundo vinculo vigente do mesmo produto na mesma loja e recusado"

# Fechar o antigo e abrir o novo na mesma transacao e o caminho permitido.
psql_ >/dev/null <<SQL || falha "fechar e abrir na mesma transacao deveria passar"
BEGIN;
UPDATE preco_loja SET vigente_ate = now() WHERE loja_id = $LOJA AND produto_id = $PRODUTO AND vigente_ate IS NULL;
INSERT INTO preco_loja(preco_id, produto_id, loja_id, vigente_desde, confirmado_em) VALUES ($NOVO_PRECO, $PRODUTO, $LOJA, now(), now());
COMMIT;
SQL
esperar_igual "apos trocar o preco continua 1 vigente por produto na loja" "1" "$(psql_ -c "select count(*) from preco_loja where loja_id = $LOJA and produto_id = $PRODUTO and vigente_ate is null")"

# FK composta: produto_id divergente do preco e recusado.
OUTRO="$(psql_ -c "select id from produto where id <> $PRODUTO order by id limit 1")"
MSG="$(psql_ -c "insert into preco_loja(preco_id, produto_id, loja_id, vigente_desde, vigente_ate, confirmado_em) values ($NOVO_PRECO, $OUTRO, $LOJA, now(), now(), now())" 2>&1 || true)"
echo "$MSG" | grep -q 'fk_preco_loja_preco_produto' || falha "FK composta aceitou produto_id divergente: $MSG"
ok "produto_id divergente do preco e recusado pela FK composta"

# Cascata: PrecoService.remover apaga o preco direto; com a FK composta do 07 o vinculo tem de ir junto.
esperar_igual "preco de teste tem vinculo antes de apagar" "1" "$(psql_ -c "select count(*) from preco_loja where preco_id = $NOVO_PRECO")"
psql_ -c "delete from preco where id = $NOVO_PRECO" >/dev/null || falha "apagar preco com vinculos deveria passar"
esperar_igual "apagar preco apaga os vinculos (cascata com a FK composta)" "0" "$(psql_ -c "select count(*) from preco_loja where preco_id = $NOVO_PRECO")"
esperar_igual "apagar preco nao deixa vinculo orfao" "0" "$(psql_ -c 'select count(*) from preco_loja pl where not exists (select 1 from preco p where p.id = pl.preco_id)')"

echo "TUDO OK: 06 e 07 validados em $IMAGEM"
