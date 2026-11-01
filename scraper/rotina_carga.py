"""
SmartMarket - Rotina Automática de Coleta e Carga de Preços
------------------------------------------------------------
Orquestra a coleta das redes (Fort Atacadista e Carrefour Mercado),
executa a normalização dos dados e realiza a inserção/atualização contínua
e idempotente na tabela 'preco' do PostgreSQL (com preservação de histórico).

Pode ser executada como rotina única (batch one-shot) ou em modo agendado/daemon
com intervalo configurável de minutos.
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

# Garante importação dos módulos locais do scraper
DIRETORIO_SCRAPER = Path(__file__).resolve().parent
if str(DIRETORIO_SCRAPER) not in sys.path:
    sys.path.insert(0, str(DIRETORIO_SCRAPER))

import coleta_asun as asun
import coleta_atacadao as atacadao
import coleta_carrefour as carrefour
import coleta_fort_atacadista as fort
import coleta_master as master
import coleta_rissul as rissul
import coleta_stok as stok
import coleta_zaffari as zaffari
from pipeline import carregar, ErroIngestao, validar_dsn

LOGGER = logging.getLogger("rotina_carga")

REDES_CONFIG = {
    "fort": {
        "nome": "Fort Atacadista",
        "modulo": fort,
        "source": "fort",
        "store": fort.STORE_ID,
        "mercado_id_default": 1,
        "fixture_padrao": "fort_valido.json",
    },
    "carrefour": {
        "nome": "Carrefour",
        "modulo": carrefour,
        "source": "carrefour",
        "store": "mercado",
        "mercado_id_default": 2,
        "fixture_padrao": "carrefour_valido.json",
    },
    "asun": {
        "nome": "Asun Supermercados",
        "modulo": asun,
        "source": "asun",
        "store": asun.STORE_ID,
        "mercado_id_default": 3,
        "fixture_padrao": "asun_valido.json",
    },
    "atacadao": {
        "nome": "Atacadão",
        "modulo": atacadao,
        "source": "atacadao",
        "store": "online",
        "mercado_id_default": 4,
        "fixture_padrao": "atacadao_valido.json",
    },
    "master": {
        "nome": "Master Supermercados",
        "modulo": master,
        "source": "master",
        "store": "filial_1",
        "mercado_id_default": 5,
        "fixture_padrao": "master_valido.json",
    },
    "zaffari": {
        "nome": "Zaffari",
        "modulo": zaffari,
        "source": "zaffari",
        "store": "online",
        "mercado_id_default": 6,
        "fixture_padrao": "zaffari_valido.json",
    },
    "rissul": {
        "nome": "Rissul",
        "modulo": rissul,
        "source": "rissul",
        "store": "online",
        "mercado_id_default": 7,
        "fixture_padrao": "rissul_valido.json",
    },
    "stok": {
        "nome": "Stok Center",
        "modulo": stok,
        "source": "stok",
        "store": "filial_1",
        "mercado_id_default": 8,
        "fixture_padrao": "stok_valido.json",
    },
}


class LockProcesso:
    """Controle de concorrência multiplataforma via arquivo de lock."""
    def __init__(self, lock_file: Path):
        self.lock_file = lock_file
        self.adquirido = False

    def __enter__(self):
        self.lock_file.parent.mkdir(parents=True, exist_ok=True)
        try:
            # Criação exclusiva (O_CREAT | O_EXCL) funciona nativamente no Windows e Linux
            self.fd = os.open(str(self.lock_file), os.O_CREAT | os.O_EXCL | os.O_RDWR)
            os.write(self.fd, f"pid={os.getpid()}\n".encode("utf-8"))
            self.adquirido = True
            return self
        except FileExistsError:
            raise ErroIngestao(f"rotina_ja_em_execucao_lock_ativo: {self.lock_file}")

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.adquirido:
            try:
                os.close(self.fd)
                if self.lock_file.exists():
                    self.lock_file.unlink()
            except Exception as exc:
                LOGGER.warning("erro_ao_liberar_lock: %s", exc)


def obter_dsn(dsn_arg=None):
    """Obtém a string DSN do argumento ou de variáveis de ambiente do projeto."""
    if dsn_arg:
        return dsn_arg
    return (
        os.environ.get("SMARTMARKET_DSN")
        or os.environ.get("SMARTMARKET_LOCAL_DSN")
        or "host=localhost port=5436 dbname=smartmarket user=smartmarket password=smartmarket123"
    )


def garantir_mercados_existentes(conn, permitir_criacao=True):
    """Verifica e opcionalmente inicializa os mercados na tabela 'mercado'."""
    with conn.cursor() as cur:
        for info in REDES_CONFIG.values():
            m_id = info["mercado_id_default"]
            cur.execute("SELECT id, nome FROM mercado WHERE id=%s", (m_id,))
            row = cur.fetchone()
            if not row and permitir_criacao:
                cur.execute(
                    "INSERT INTO mercado(id, nome) VALUES(%s, %s) ON CONFLICT (id) DO NOTHING",
                    (m_id, info["nome"])
                )
                LOGGER.info("Mercado ID %s (%s) inicializado.", m_id, info["nome"])


def atualizar_indisponibilidade_produtos(conn, source, store, mercado_id, produtos_coletados_ids):
    """
    Cenário 3.1 BDD: Produtos vinculados à loja que não foram encontrados
    na coleta mais recente são marcados como indisponíveis na tabela 'preco'.
    """
    with conn.cursor() as cur:
        # Busca produtos conhecidos desta loja
        cur.execute(
            "SELECT external_id, produto_id FROM smartmarket_ingest.source_product WHERE source=%s AND store=%s",
            (source, store)
        )
        cadastrados = cur.fetchall()
        for ext_id, prod_id in cadastrados:
            if ext_id not in produtos_coletados_ids:
                # Marca o preço mais recente como indisponível
                cur.execute(
                    """
                    UPDATE preco
                    SET disponivel = FALSE
                    WHERE id = (
                        SELECT id FROM preco
                        WHERE produto_id = %s AND mercado_id = %s
                        ORDER BY coletado_em DESC
                        LIMIT 1
                    )
                    """,
                    (prod_id, mercado_id)
                )


def conectar_banco(config_db):
    """Abre conexão com o PostgreSQL usando psycopg."""
    import psycopg
    return psycopg.connect(**config_db)


def executar_ciclo_rede(chave_rede, config_rede, *, dsn, diretorio_base,
                        modo_fixture=False, diretorio_fixtures=None,
                        permitir_banco_app=True, mapeamento=None):
    """Executa o ciclo completo de uma rede: Coleta -> Normalização -> Carga."""
    modulo = config_rede["modulo"]
    source = config_rede["source"]
    store = config_rede["store"]
    mercado_id = config_rede["mercado_id_default"]
    agora_iso = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    run_id = f"{source}_{store}_{agora_iso}"

    dir_saida = diretorio_base / source / run_id
    dir_saida.mkdir(parents=True, exist_ok=True)

    LOGGER.info("Iniciando ciclo para %s (run_id=%s)", config_rede["nome"], run_id)

    # 1. Coleta
    if modo_fixture:
        fixtures_path = Path(diretorio_fixtures) if diretorio_fixtures else DIRETORIO_SCRAPER / "tests" / "fixtures"
        caminho_fixture = fixtures_path / config_rede["fixture_padrao"]
        status_coleta = modulo.main(["--fixture", str(caminho_fixture), "--output-dir", str(dir_saida)])
    else:
        status_coleta = modulo.main(["--output-dir", str(dir_saida)])

    if status_coleta == 1:
        raise ErroIngestao(f"coleta_falhou_totalmente_{source}")

    arquivo_produtos = dir_saida / "produtos_coletados.json"
    if not arquivo_produtos.exists():
        raise ErroIngestao(f"arquivo_produtos_nao_gerado_{source}")

    registros = json.loads(arquivo_produtos.read_text(encoding="utf-8"), parse_float=Decimal)
    if not registros:
        LOGGER.warning("Nenhum produto coletado para %s", config_rede["nome"])
        return {"source": source, "status": "sem_produtos", "precos_inseridos": 0}

    # 2. Carga Idempotente na tabela preco
    resumo_carga = carregar(
        registros,
        dsn=dsn,
        source=source,
        store=store,
        mercado_id=mercado_id,
        run_id=run_id,
        mapeamento=mapeamento,
        permitir_banco_app=permitir_banco_app
    )

    # 3. Atualização de Indisponibilidade
    config_db = validar_dsn(dsn, permitir_banco_app=permitir_banco_app)
    with conectar_banco(config_db) as conn:
        coletados_ids = {str(r.get("id_produto_origem")) for r in registros if r.get("id_produto_origem")}
        atualizar_indisponibilidade_produtos(conn, source, store, mercado_id, coletados_ids)

    resumo_carga["source"] = source
    resumo_carga["store"] = store
    resumo_carga["status"] = "concluido" if status_coleta == 0 else "parcial"
    resumo_carga["total_coletados"] = len(registros)
    LOGGER.info(
        "Ciclo concluído para %s: %d produtos criados, %d preços inseridos",
        config_rede["nome"],
        resumo_carga.get("produtos_criados", 0),
        resumo_carga.get("precos_inseridos", 0)
    )
    return resumo_carga


def executar_rodada_completa(*, dsn, diretorio_base, modo_fixture=False,
                             diretorio_fixtures=None, permitir_banco_app=True,
                             inicializar_mercados=True):
    """Executa a coleta e carga para todas as redes configuradas."""
    inicio = time.time()
    config_db = validar_dsn(dsn, permitir_banco_app=permitir_banco_app)

    # Garante que os mercados IDs 1 e 2 existem
    with conectar_banco(config_db) as conn:
        garantir_mercados_existentes(conn, permitir_criacao=inicializar_mercados)

    resultados = {}
    for chave, config_rede in REDES_CONFIG.items():
        try:
            resultados[chave] = executar_ciclo_rede(
                chave, config_rede,
                dsn=dsn,
                diretorio_base=diretorio_base,
                modo_fixture=modo_fixture,
                diretorio_fixtures=diretorio_fixtures,
                permitir_banco_app=permitir_banco_app
            )
        except Exception as exc:
            LOGGER.error("Falha ao processar rede %s: %s", chave, exc)
            resultados[chave] = {"status": "erro", "motivo": str(exc)}

    duracao = round(time.time() - inicio, 2)
    relatorio_geral = {
        "executado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "duracao_segundos": duracao,
        "modo": "fixture" if modo_fixture else "live",
        "redes": resultados,
        "sucesso_geral": all(r.get("status") in ("concluido", "parcial") for r in resultados.values()),
    }

    dir_rotina = diretorio_base / "relatorios"
    dir_rotina.mkdir(parents=True, exist_ok=True)
    arquivo_relatorio = dir_rotina / "relatorio_rotina.json"
    fort.salvar_atomico(arquivo_relatorio, lambda f: json.dump(relatorio_geral, f, indent=2, ensure_ascii=False))

    LOGGER.info("Rodada completa finalizada em %.2fs. Relatório salvo em %s", duracao, arquivo_relatorio)
    return relatorio_geral


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dsn", help="DSN de conexão com o banco PostgreSQL")
    parser.add_argument("--output-base", type=Path, default=DIRETORIO_SCRAPER / "output" / "rotina")
    parser.add_argument("--fixture", action="store_true", help="Usa fixtures locais em vez de chamadas HTTP")
    parser.add_argument("--fixture-dir", type=Path, help="Diretório contendo fixtures sintéticas")
    parser.add_argument("--allow-app-db", action="store_true", default=True, help="Permite carregar no banco da aplicação")
    parser.add_argument("--intervalo-minutos", type=int, default=0, help="Intervalo para execução em loop (0 = executa uma vez)")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    dsn = obter_dsn(args.dsn)
    lock_file = args.output_base / ".rotina.lock"

    try:
        with LockProcesso(lock_file):
            if args.intervalo_minutos <= 0:
                relatorio = executar_rodada_completa(
                    dsn=dsn,
                    diretorio_base=args.output_base,
                    modo_fixture=args.fixture,
                    diretorio_fixtures=args.fixture_dir,
                    permitir_banco_app=args.allow_app_db
                )
                return 0 if relatorio["sucesso_geral"] else 1
            else:
                LOGGER.info("Iniciando rotina agendada a cada %d minutos...", args.intervalo_minutos)
                while True:
                    try:
                        executar_rodada_completa(
                            dsn=dsn,
                            diretorio_base=args.output_base,
                            modo_fixture=args.fixture,
                            diretorio_fixtures=args.fixture_dir,
                            permitir_banco_app=args.allow_app_db
                        )
                    except Exception as exc:
                        LOGGER.error("Erro durante rodada agendada: %s", exc)

                    LOGGER.info("Aguardando %d minutos para a próxima coleta...", args.intervalo_minutos)
                    time.sleep(args.intervalo_minutos * 60)
    except ErroIngestao as exc:
        LOGGER.error("Execução bloqueada: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
