#!/usr/bin/env bash
# Falha se o build do frontend (dist/) ficar grande demais.
# Cada deploy guarda o dist inteiro (na Vercel foi assim que o projeto passou de 8 GB).
#
# Uso:  bash scripts/verificar-tamanho-dist.sh [pasta-do-dist]
# Limites (podem ser trocados por variável de ambiente):
#   MAX_TOTAL_MB    tamanho total do dist           (padrão 100; ~85 sem as variáveis do bucket, ~5 com elas)
#   MAX_ARQUIVO_MB  maior arquivo individual        (padrão 3)
# O chunk do catálogo (assets/data-*.js, ~28 MB) é a única exceção: ele só existe no build sem
# VITE_CATALOGO_URL (CI, dev, Docker). O deploy no Pages usa o catálogo do bucket e passa
# MAX_TOTAL_MB=20 (ver .github/workflows/deploy-pages.yml e docs/ASSETS-NEON.md).
set -euo pipefail

DIST="${1:-frontend/dist}"
MAX_TOTAL_MB="${MAX_TOTAL_MB:-100}"
MAX_ARQUIVO_MB="${MAX_ARQUIVO_MB:-3}"

if [ ! -d "$DIST" ]; then
  echo "ERRO: pasta '$DIST' não existe. Rode o build antes." >&2
  exit 2
fi

total_bytes=$(find "$DIST" -type f -printf '%s\n' | awk '{s+=$1} END {print s+0}')
total_mb=$(( (total_bytes + 1048575) / 1048576 ))
echo "dist: ${total_mb} MB no total (limite ${MAX_TOTAL_MB} MB)"

falhou=0
if [ "$total_mb" -gt "$MAX_TOTAL_MB" ]; then
  echo "ERRO: o dist passou de ${MAX_TOTAL_MB} MB." >&2
  falhou=1
fi

grandes=$(find "$DIST" -type f -size +"${MAX_ARQUIVO_MB}"M ! -path '*/assets/data-*.js' -printf '%s %p\n' | sort -rn || true)
if [ -n "$grandes" ]; then
  echo "ERRO: arquivos acima de ${MAX_ARQUIVO_MB} MB no dist (tamanho em bytes, caminho):" >&2
  echo "$grandes" >&2
  falhou=1
fi

if [ "$falhou" -ne 0 ]; then
  echo "Mova mídia pesada para Blob/CDN e carregue por URL, em vez de empacotar no deploy." >&2
  exit 1
fi
echo "OK: tamanho do dist dentro dos limites."
