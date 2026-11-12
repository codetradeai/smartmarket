-- ============================================================
-- SmartMarket - Deploy Script 07: travas de integridade do preco por loja (SO PostgreSQL)
-- ============================================================
-- 1. Uma loja nunca tem dois vinculos vigentes (vigente_ate NULL) para o mesmo produto
--    (indice unico parcial). Sem isto, a regra dependeria so do lock da carga
--    (pg_advisory_xact_lock). A carga precisa fechar o vinculo antigo antes de abrir o novo,
--    na mesma transacao.
-- 2. preco_loja.produto_id (copia de preco.produto_id) nao pode divergir do preco: FK composta
--    (preco_id, produto_id) -> preco(id, produto_id).
--
-- Arquivo separado do 06 porque indice unico PARCIAL e bloco DO nao existem no H2 usado nos
-- testes do backend; o 06 continua rodando nos dois. Validacao em PostgreSQL real:
-- backend/deploy/test_lojas_postgres.sh.
--
-- Ordem: depois do 06. Idempotente. Se falhar com "could not create unique index" ou na FK,
-- ha vinculos vigentes duplicados ou com produto_id divergente: corrija antes (o 06 nao os cria).
-- Uso: execute manualmente no banco (console SQL do Neon), por ordem do responsavel.
-- ============================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uk_preco_id_produto ON preco (id, produto_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_preco_loja_preco_produto') THEN
        ALTER TABLE preco_loja
            ADD CONSTRAINT fk_preco_loja_preco_produto
            FOREIGN KEY (preco_id, produto_id) REFERENCES preco (id, produto_id) ON DELETE CASCADE;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uk_preco_loja_vigente
    ON preco_loja (loja_id, produto_id)
    WHERE vigente_ate IS NULL;

COMMIT;
