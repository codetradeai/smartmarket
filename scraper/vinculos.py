"""Grava no banco os vínculos entre produtos de redes diferentes (saída do casamento.py).

Cada par vira uma linha de ``vinculo_produto`` (produto_a_id < produto_b_id) com ``origem``
("ean"|"nome") e ``status`` ("confirmado"|"revisar"). Só pares cujos dois lados já foram
carregados (existem em ``smartmarket_ingest.source_product``) são gravados; os demais são
reportados como não resolvidos. A tabela é criada pelo DDL/migração da equipe, nunca aqui.
"""
import argparse
import json
import os
from pathlib import Path

from pipeline import ErroIngestao, validar_dsn

ORIGENS = ("ean", "nome")
STATUS = ("confirmado", "revisar")


def _produto_id(cur, rede, id_origem):
    """produto_id único para (rede, id externo); None se ausente ou ambíguo entre lojas."""
    cur.execute("SELECT DISTINCT produto_id FROM smartmarket_ingest.source_product "
                "WHERE source=%s AND external_id=%s", (rede, str(id_origem)))
    ids = [r[0] for r in cur.fetchall()]
    return ids[0] if len(ids) == 1 else None


def gravar_vinculos(pares, *, dsn, permitir_banco_app=False):
    import psycopg
    for par in pares:
        if par.get("origem") not in ORIGENS or par.get("status") not in STATUS:
            raise ErroIngestao("vinculo_origem_ou_status_invalido")
    config = validar_dsn(dsn, permitir_banco_app=permitir_banco_app)
    resumo = {"inseridos": 0, "atualizados": 0, "nao_resolvidos": 0, "mesmo_produto": 0, "revisar": 0}
    with psycopg.connect(**config) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.vinculo_produto') IS NOT NULL")
            if not cur.fetchone()[0]:
                raise ErroIngestao("tabela_vinculo_produto_ausente_aplique_migration_add_vinculo_produto")
            for par in pares:
                a = _produto_id(cur, par["a"]["rede"], par["a"]["id_origem"])
                b = _produto_id(cur, par["b"]["rede"], par["b"]["id_origem"])
                if a is None or b is None:
                    resumo["nao_resolvidos"] += 1
                    continue
                if a == b:
                    resumo["mesmo_produto"] += 1
                    continue
                a, b = min(a, b), max(a, b)
                # EAN é evidência mais forte que nome: um vínculo "ean" nunca é rebaixado para "nome".
                cur.execute(
                    "INSERT INTO vinculo_produto(produto_a_id, produto_b_id, origem, status, motivo) "
                    "VALUES (%s,%s,%s,%s,%s) "
                    "ON CONFLICT (produto_a_id, produto_b_id) DO UPDATE SET "
                    "origem = CASE WHEN vinculo_produto.origem = 'ean' THEN 'ean' ELSE EXCLUDED.origem END, "
                    "status = EXCLUDED.status, motivo = EXCLUDED.motivo, updated_at = CURRENT_TIMESTAMP "
                    "RETURNING (xmax = 0)",
                    (a, b, par["origem"], par["status"], par.get("motivo")))
                resumo["inseridos" if cur.fetchone()[0] else "atualizados"] += 1
                if par["status"] == "revisar":
                    resumo["revisar"] += 1
    return resumo


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vinculos", required=True, type=Path, help="JSON gerado por casamento.py")
    parser.add_argument("--allow-app-db", action="store_true", help="Permite gravar na base smartmarket da aplicação")
    args = parser.parse_args(argv)
    try:
        pares = json.loads(args.vinculos.read_text(encoding="utf-8")).get("pares", [])
        resumo = gravar_vinculos(pares, dsn=os.environ.get("SMARTMARKET_LOCAL_DSN", ""),
                                 permitir_banco_app=args.allow_app_db)
        print(json.dumps(resumo, ensure_ascii=False))
        return 0
    except (OSError, ValueError) as exc:
        print(json.dumps({"status": "falhou", "motivo": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
