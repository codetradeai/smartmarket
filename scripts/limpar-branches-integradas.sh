#!/usr/bin/env bash
# Apaga as branches remotas ja integradas na main (verificado em 2026-11-01).
# Uso: bash scripts/limpar-branches-integradas.sh
set -euo pipefail
git fetch -p origin
for b in \
  "feat(clubes)" \
  "feature/auth-context-rotas-protegidas" \
  "feature/auth-jwt" \
  "feature/banco_dados" \
  "feature/catalogo-produtos-filtros" \
  "feature/cenarios-teste" \
  "feature/corrige-lista-compras" \
  "feature/frontend-design-system" \
  "feature/home-busca-carrossel-precos-clube" \
  "feature/joao-coleta-fort-pipeline" \
  "feature/lista-compras-comparador" \
  "feature/lista-compras-painel-comparativo" \
  "feature/mapeamento-entidades-jpa" \
  "feature/produto-catalogo" \
  "feature/scraper-coleta-inicial" \
  "feature/scraper-expansao-rs-automacao" \
  "feature/seed-massa-dados-inicial" \
  "feature/setup-project" \
  "feature/setup-tests" \
  "feature/tela-login-registro-home" \
  "feature/telas-favoritos-admin" \
  "feature/testes-comparador-precos" \
  "feature/testes-frontend-cobertura" \
  "feature/ux-catalogo-9406-grafico-alertas" \
  "fix/ci-main-audit-20261026" \
  "fix/integracao-develop-audit" \
  "fix/telas-seguranca-cobertura" \
  "main" \
  "test/core-services" \
; do
  if [ "$(git rev-list --count origin/main..origin/$b 2>/dev/null || echo 0)" = 0 ] || [ "$(git cherry origin/main origin/$b | grep -c "^+")" = 0 ]; then
    git push origin --delete "$b" && echo "apagada: $b"
  else
    echo "PULADA (tem commits fora da main): $b"
  fi
done
