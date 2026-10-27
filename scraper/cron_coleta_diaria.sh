#!/usr/bin/env bash
# ==============================================================================
# SmartMarket - Automação de Coleta Diária de Preços (Servidor Linux)
# ==============================================================================
# Execução recomendada via crontab:
# 0 4 * * * /caminho/do/projeto/scraper/cron_coleta_diaria.sh >> /var/log/smartmarket_cron.log 2>&1
# ==============================================================================

set -euo pipefail

# Diretório base do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${PROJECT_ROOT}/scraper/logs"
DATA_HORA="$(date +'%Y-%m-%d_%H-%M-%S')"
LOG_FILE="${LOG_DIR}/coleta_${DATA_HORA}.log"

mkdir -p "${LOG_DIR}"

echo "==============================================================================" | tee -a "${LOG_FILE}"
echo "[${DATA_HORA}] Iniciando ciclo diário de raspagem SmartMarket..." | tee -a "${LOG_FILE}"
echo "Diretório do projeto: ${PROJECT_ROOT}" | tee -a "${LOG_FILE}"
echo "==============================================================================" | tee -a "${LOG_FILE}"

cd "${PROJECT_ROOT}"

# Ativa ambiente virtual se existir
if [ -d "${PROJECT_ROOT}/venv" ]; then
    source "${PROJECT_ROOT}/venv/bin/activate"
elif [ -d "${PROJECT_ROOT}/.venv" ]; then
    source "${PROJECT_ROOT}/.venv/bin/activate"
fi

# 1. Executa suíte de testes de integridade
echo "[$(date +'%T')] 1/4 - Executando testes automatizados..." | tee -a "${LOG_FILE}"
python3 -m unittest discover scraper/tests 2>&1 | tee -a "${LOG_FILE}"

# 2. Executa a rotina de carga e coleta das 8 redes do RS
echo "[$(date +'%T')] 2/4 - Executando robôs de coleta (Zaffari, Rissul, Asun, Stok, Atacadão, Master, Fort, Carrefour)..." | tee -a "${LOG_FILE}"
python3 scraper/rotina_carga.py 2>&1 | tee -a "${LOG_FILE}"

# 3. Baixa novas imagens em alta definição
echo "[$(date +'%T')] 3/4 - Baixando imagens em alta resolução..." | tee -a "${LOG_FILE}"
python3 scraper/download_imagens.py 2>&1 | tee -a "${LOG_FILE}"

# 4. Atualiza catálogo frontend e script SQL
echo "[$(date +'%T')] 4/4 - Consolidando catálogo e scripts de carga..." | tee -a "${LOG_FILE}"
python3 scraper/gerar_catalogo_e_sql.py 2>&1 | tee -a "${LOG_FILE}"

# Limpeza de logs antigos (mantém últimos 30 dias)
find "${LOG_DIR}" -type f -name "coleta_*.log" -mtime +30 -delete

echo "==============================================================================" | tee -a "${LOG_FILE}"
echo "[$(date +'%T')] Ciclo diário de raspagem finalizado com sucesso!" | tee -a "${LOG_FILE}"
echo "Log salvo em: ${LOG_FILE}" | tee -a "${LOG_FILE}"
echo "==============================================================================" | tee -a "${LOG_FILE}"
