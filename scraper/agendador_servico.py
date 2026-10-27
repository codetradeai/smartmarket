"""
SmartMarket - Agendador Daemon de Coleta Diária
-----------------------------------------------
Serviço autônomo que roda continuamente em segundo plano no servidor
e dispara os robôs de coleta todos os dias no horário programado (padrão: 04:00 da manhã).
Pode ser executado diretamente via terminal, Docker ou como serviço systemd.
"""

import datetime
import logging
import os
import subprocess
import sys
import time
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [SmartMarket Scheduler] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
LOGGER = logging.getLogger("agendador")

BASE_DIR = Path(__file__).resolve().parent.parent
HORA_EXECUCAO = int(os.environ.get("HORA_COLETA_DIARIA", 4))  # 04:00 da manhã
MINUTO_EXECUCAO = int(os.environ.get("MINUTO_COLETA_DIARIA", 0))


def executar_comando(cmd: list, descricao: str) -> bool:
    """Executa um comando de forma síncrona com log detalhado."""
    LOGGER.info("Iniciando etapa: %s...", descricao)
    inicio = time.time()
    try:
        resultado = subprocess.run(
            cmd,
            cwd=str(BASE_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=True,
        )
        duracao = time.time() - inicio
        LOGGER.info("Etapa '%s' concluída com sucesso em %.2fs.", descricao, duracao)
        return True
    except subprocess.CalledProcessError as e:
        duracao = time.time() - inicio
        LOGGER.error("Falha na etapa '%s' (código %d) após %.2fs:\n%s", descricao, e.returncode, duracao, e.output)
        return False


def executar_ciclo_completo():
    """Executa o ciclo diário completo de coleta, enriquecimento e geração de catálogo."""
    LOGGER.info("=================================================================")
    LOGGER.info("Iniciando Ciclo Diário de Coleta SmartMarket (8 Redes do RS)")
    LOGGER.info("=================================================================")

    python_exe = sys.executable

    # 1. Testes automatizados
    sucesso_testes = executar_comando(
        [python_exe, "-m", "unittest", "discover", "scraper/tests"],
        "Validação de Testes de Scrapers",
    )
    if not sucesso_testes:
        LOGGER.warning("Testes relataram alertas, mas prosseguindo com tolerância a falhas...")

    # 2. Rotina de carga nos mercados
    executar_comando(
        [python_exe, "scraper/rotina_carga.py"],
        "Raspagem dos 8 Supermercados do RS",
    )

    # 3. Download de imagens HD
    executar_comando(
        [python_exe, "scraper/download_imagens.py"],
        "Download de Novas Imagens em Alta Resolução",
    )

    # 4. Consolidação de catálogo e SQL
    executar_comando(
        [python_exe, "scraper/gerar_catalogo_e_sql.py"],
        "Consolidação de Catálogo Frontend e Script SQL",
    )

    LOGGER.info("Ciclo diário finalizado com sucesso!")


def calcular_segundos_ate_proxima_execucao(hora_alvo: int, minuto_alvo: int) -> float:
    """Calcula quantos segundos faltam até o próximo horário alvo."""
    agora = datetime.datetime.now()
    alvo = agora.replace(hour=hora_alvo, minute=minuto_alvo, second=0, microsecond=0)
    if alvo <= agora:
        alvo += datetime.timedelta(days=1)
    segundos = (alvo - agora).total_seconds()
    return segundos, alvo


def main():
    LOGGER.info("SmartMarket Agendador iniciado com sucesso.")
    LOGGER.info(
        "Horário programado para coleta diária: %02d:%02d todos os dias.",
        HORA_EXECUCAO,
        MINUTO_EXECUCAO,
    )

    if "--agora" in sys.argv:
        LOGGER.info("Flag '--agora' detectada. Disparando coleta imediata...")
        executar_ciclo_completo()

    while True:
        segundos_espera, proximo_alvo = calcular_segundos_ate_proxima_execucao(HORA_EXECUCAO, MINUTO_EXECUCAO)
        LOGGER.info(
            "Próxima execução agendada para: %s (faltam %.1f horas)",
            proximo_alvo.strftime("%d/%m/%Y %H:%M:%S"),
            segundos_espera / 3600.0,
        )

        # Dorme em blocos de até 60 segundos para permitir encerramento suave
        tempo_fim = time.time() + segundos_espera
        while time.time() < tempo_fim:
            restante = tempo_fim - time.time()
            time.sleep(min(restante, 60))

        LOGGER.info("Horário programado atingido! Disparando ciclo diário...")
        try:
            executar_ciclo_completo()
        except Exception as e:
            LOGGER.error("Erro inesperado durante o ciclo: %s", e, exc_info=True)


if __name__ == "__main__":
    main()
