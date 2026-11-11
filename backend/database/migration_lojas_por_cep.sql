-- ============================================================
-- SmartMarket - Deploy Script 06: lojas (filiais) e localizacao por CEP
-- ============================================================
-- O que faz:
--   1. loja: filial de um mercado (rede), com endereco, CEP e coordenadas.
--   2. preco_loja: liga um preco (historico, por mercado) a uma loja, com vigencia.
--      Um mesmo preco pode valer em varias lojas, entao o valor nao se duplica por filial.
--   3. usuario: CEP, cidade, UF, coordenadas e loja preferida (todos opcionais; contas
--      antigas ficam NULL).
--   4. promocao.loja_id: NULL = a promocao vale para a rede toda (comportamento de hoje).
--   5. Indices de consulta, inclusive produto(codigo_barras).
--   6. Dados atuais: uma loja "padrao" por mercado (codigo_externo = 'padrao') e um vinculo
--      preco_loja para cada preco que ja existe. Nenhuma linha de preco e apagada ou alterada.
--
-- Ordem: depois de 01_schema.sql (e de 02/03/04/05 quando o banco ja tiver dados).
-- Idempotente: so cria o que falta e so vincula precos que ainda nao tem vinculo. Rodar de
-- novo (por exemplo depois de cadastrar um mercado novo) nao duplica nada.
-- Rode com o coletor antigo parado: preco novo gravado pelo coletor antigo depois da migration
-- fica sem vinculo ate a proxima execucao deste script.
-- Uso: execute manualmente no banco (console SQL do Neon). Nao e aplicado automaticamente.
-- ============================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1. loja
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loja (
    id             BIGSERIAL        PRIMARY KEY,
    mercado_id     BIGINT           NOT NULL REFERENCES mercado(id),
    nome           VARCHAR(255)     NOT NULL,
    endereco       VARCHAR(500),
    cidade         VARCHAR(120),
    uf             VARCHAR(2),
    cep            VARCHAR(8),
    latitude       DOUBLE PRECISION,
    longitude      DOUBLE PRECISION,
    codigo_externo VARCHAR(100)     NOT NULL,
    ativa          BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP        NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_loja_mercado_codigo UNIQUE (mercado_id, codigo_externo),
    CONSTRAINT chk_loja_latitude  CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
    CONSTRAINT chk_loja_longitude CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

-- ----------------------------------------------------------------
-- 2. preco_loja (vinculo preco x loja com vigencia)
--    vigente_ate NULL = vinculo corrente. Quando o valor muda na loja, o vinculo antigo e
--    fechado e nasce outro; o preco antigo continua no historico.
--    disponivel e confirmado_em sao por loja (o preco e compartilhado, a disponibilidade nao).
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS preco_loja (
    id            BIGSERIAL  PRIMARY KEY,
    preco_id      BIGINT     NOT NULL REFERENCES preco(id) ON DELETE CASCADE,
    loja_id       BIGINT     NOT NULL REFERENCES loja(id)  ON DELETE CASCADE,
    disponivel    BOOLEAN    NOT NULL DEFAULT TRUE,
    vigente_desde TIMESTAMP  NOT NULL,
    vigente_ate   TIMESTAMP,
    confirmado_em TIMESTAMP  NOT NULL,
    created_at    TIMESTAMP  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_preco_loja_vigencia CHECK (vigente_ate IS NULL OR vigente_ate >= vigente_desde)
);

-- ----------------------------------------------------------------
-- 3. usuario: localizacao opcional (LGPD: o usuario pode editar e excluir)
-- ----------------------------------------------------------------
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS cep VARCHAR(8) CHECK (cep IS NULL OR LENGTH(cep) = 8);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS cidade VARCHAR(120);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS uf VARCHAR(2);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS loja_preferida_id BIGINT REFERENCES loja(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------
-- 4. promocao: loja opcional (NULL = vale para a rede toda)
-- ----------------------------------------------------------------
ALTER TABLE promocao ADD COLUMN IF NOT EXISTS loja_id BIGINT REFERENCES loja(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------
-- 5. indices
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_loja_mercado            ON loja(mercado_id);
CREATE INDEX IF NOT EXISTS idx_loja_lat_long           ON loja(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_preco_loja_loja_vigente ON preco_loja(loja_id, vigente_ate);
CREATE INDEX IF NOT EXISTS idx_preco_loja_preco        ON preco_loja(preco_id);
CREATE INDEX IF NOT EXISTS idx_promocao_loja           ON promocao(loja_id);
CREATE INDEX IF NOT EXISTS idx_usuario_loja_preferida  ON usuario(loja_preferida_id);
CREATE INDEX IF NOT EXISTS idx_produto_codigo_barras   ON produto(codigo_barras);

-- ----------------------------------------------------------------
-- 6a. loja "padrao": uma por mercado que ainda nao tem
-- ----------------------------------------------------------------
INSERT INTO loja (mercado_id, nome, endereco, codigo_externo)
SELECT m.id, m.nome, m.endereco, 'padrao'
FROM mercado m
WHERE NOT EXISTS (
    SELECT 1 FROM loja l WHERE l.mercado_id = m.id AND l.codigo_externo = 'padrao'
);

-- ----------------------------------------------------------------
-- 6b. vinculo dos precos existentes com a loja padrao do mercado
--     So entram precos que ainda nao tem NENHUM vinculo. A vigencia de cada um vai ate o
--     instante da coleta seguinte do mesmo produto no mesmo mercado; o mais recente fica
--     aberto (vigente_ate NULL). A disponibilidade e a do proprio preco.
-- ----------------------------------------------------------------
INSERT INTO preco_loja (preco_id, loja_id, disponivel, vigente_desde, vigente_ate, confirmado_em)
SELECT s.id, s.loja_id, s.disponivel, s.coletado_em, s.proximo, s.coletado_em
FROM (
    SELECT p.id, l.id AS loja_id, p.disponivel, p.coletado_em,
           LEAD(p.coletado_em) OVER (
               PARTITION BY p.produto_id, p.mercado_id
               ORDER BY p.coletado_em, p.id
           ) AS proximo
    FROM preco p
    JOIN loja l ON l.mercado_id = p.mercado_id AND l.codigo_externo = 'padrao'
    WHERE NOT EXISTS (SELECT 1 FROM preco_loja pl WHERE pl.preco_id = p.id)
) s;

-- ----------------------------------------------------------------
-- 6c. reexecucao: se chegaram precos legados novos depois da 1a execucao, o vinculo que era
--     o mais recente passa a ter um sucessor na loja padrao e precisa ser fechado.
--     Nunca fecha vinculo cujo sucessor pertence a outra loja.
-- ----------------------------------------------------------------
UPDATE preco_loja
SET vigente_ate = (
    SELECT MIN(p2.coletado_em)
    FROM preco p1
    JOIN preco p2 ON p2.produto_id = p1.produto_id AND p2.mercado_id = p1.mercado_id
                 AND (p2.coletado_em > p1.coletado_em
                      OR (p2.coletado_em = p1.coletado_em AND p2.id > p1.id))
    JOIN preco_loja pl2 ON pl2.preco_id = p2.id AND pl2.loja_id = preco_loja.loja_id
    WHERE p1.id = preco_loja.preco_id
)
WHERE vigente_ate IS NULL
  AND EXISTS (
    SELECT 1
    FROM preco p1
    JOIN preco p2 ON p2.produto_id = p1.produto_id AND p2.mercado_id = p1.mercado_id
                 AND (p2.coletado_em > p1.coletado_em
                      OR (p2.coletado_em = p1.coletado_em AND p2.id > p1.id))
    JOIN preco_loja pl2 ON pl2.preco_id = p2.id AND pl2.loja_id = preco_loja.loja_id
    WHERE p1.id = preco_loja.preco_id
);

COMMIT;
