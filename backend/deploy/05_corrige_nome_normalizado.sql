-- ============================================================
-- SmartMarket - Deploy Script 05: corrige produto.nome_normalizado
-- ============================================================
-- Problema: a carga original (03_carga.sql) gravou nome_normalizado apenas em
-- minuscula, mantendo os acentos ('feijão preto ...'). A busca por nome do backend
-- (ProdutoSpecification) normaliza o termo digitado SEM acento e compara so com
-- nome_normalizado; entao 'feijao' e 'feijão' nunca casavam com esses produtos.
--
-- Regra aplicada (a mesma do Java, NormalizadorTexto.normalizar):
--   minuscula, sem marcas de acento, espacos repetidos colapsados e sem espacos nas pontas.
--   translate() cobre maiusculas e minusculas acentuadas (Latin-1) e lower() vem depois.
--
-- Idempotente: so toca em linhas cujo valor muda (IS DISTINCT FROM); rodar de novo
-- nao altera nada. Nao mexe em nome, preco nem em nenhuma outra coluna.
-- Uso: execute UMA vez no banco ja carregado (apos 03_carga.sql), por exemplo no console SQL do Neon.
--      Bancos novos: rode depois de 03_carga.sql (ou 03 -> 05 na mesma sessao).
-- ============================================================

BEGIN;

UPDATE produto
SET nome_normalizado = lower(trim(regexp_replace(
        translate(nome,
            'àáâãäåèéêëìíîïñòóôõöùúûüýÿçÀÁÂÃÄÅÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝÇ',
            'aaaaaaeeeeiiiinooooouuuuyycAAAAAAEEEEIIIINOOOOOUUUUYC'),
        '[ \t\n\r\f\v]+', ' ', 'g')))
WHERE nome IS NOT NULL
  AND nome_normalizado IS DISTINCT FROM lower(trim(regexp_replace(
        translate(nome,
            'àáâãäåèéêëìíîïñòóôõöùúûüýÿçÀÁÂÃÄÅÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝÇ',
            'aaaaaaeeeeiiiinooooouuuuyycAAAAAAEEEEIIIINOOOOOUUUUYC'),
        '[ \t\n\r\f\v]+', ' ', 'g')));

COMMIT;
