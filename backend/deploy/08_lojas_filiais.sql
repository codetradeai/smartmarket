-- ============================================================
-- SmartMarket - Deploy Script 08: lojas (filiais) reais de Fort, Asun e Zaffari/Bourbon no RS
-- ============================================================
-- Gerado por scraper/gerar_sql_lojas.py em 2026-11-12 a partir de scraper/lojas/lojas.json.
-- NAO edite a mao: altere o JSON e gere de novo.
-- Lojas: 82 (fort 7, asun 36, zaffari 39).
--
-- Ordem: depois do 06 e do 07 (precisa das tabelas loja e preco_loja e da loja padrao).
-- Antes: branch do banco no Neon (ver backend/DEPLOY.md).
-- Idempotente: cada loja entra por ON CONFLICT (mercado_id, codigo_externo) e so atualiza
-- nome, endereco, cidade, uf, cep, latitude e longitude. Nunca apaga linha, nunca toca a loja
-- padrao (codigo_externo = 'padrao') e nunca muda o campo ativa de uma loja existente.
-- A pre-conferencia aborta tudo (RAISE EXCEPTION) se algum mercado_id usado nao existir ou
-- nao for a rede esperada.
-- Uso: execute manualmente no banco (console SQL do Neon), por ordem do responsavel.
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM mercado WHERE id = 1 AND nome ILIKE '%fort%') THEN
        RAISE EXCEPTION 'mercado 1 nao existe ou nao e fort: nada foi inserido';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM mercado WHERE id = 3 AND nome ILIKE '%asun%') THEN
        RAISE EXCEPTION 'mercado 3 nao existe ou nao e asun: nada foi inserido';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM mercado WHERE id = 6 AND nome ILIKE '%zaffari%') THEN
        RAISE EXCEPTION 'mercado 6 nao existe ou nao e zaffari: nada foi inserido';
    END IF;
END $$;

-- Fort Atacadista Canoas
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (1, 'Fort Atacadista Canoas', 'Av. Farroupilha, 4803 - Marechal Rondon', 'Canoas', 'RS', '92020475', -29.91778, -51.18361, '545')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Fort Atacadista Caxias do Sul
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (1, 'Fort Atacadista Caxias do Sul', 'Rua Tronca, 1370 - Exposição', 'Caxias do Sul', 'RS', '95010100', -29.16806, -51.17944, '345')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Fort Atacadista Gravataí
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (1, 'Fort Atacadista Gravataí', 'Av. Dorival Cândido Luz de Oliveira, 6845 - Bom Princípio', 'Gravataí', 'RS', '94070001', -29.94218, -50.99278, '945')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Fort Atacadista Porto Alegre
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (1, 'Fort Atacadista Porto Alegre', 'Av. Manoel Elias, 745 - Passo das Pedras', 'Porto Alegre', 'RS', '91240261', -30.03283, -51.23019, '845')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Fort Atacadista Novo Hamburgo
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (1, 'Fort Atacadista Novo Hamburgo', 'Rua Vinte e Quatro de Maio, 368 - Operário', 'Novo Hamburgo', 'RS', '93315138', -29.67833, -51.13056, '445')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Fort Atacadista Santa Cruz do Sul
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (1, 'Fort Atacadista Santa Cruz do Sul', 'Av. Paul Harris, 291 - Centro', 'Santa Cruz do Sul', 'RS', '96810408', -29.7175, -52.42583, '885')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Fort Atacadista Viamão
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (1, 'Fort Atacadista Viamão', 'Av. Senador Salgado Filho, 7131 - Jardim Krahe', 'Viamão', 'RS', '94450000', -30.08111, -51.02333, '370')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Capão da Canoa
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Capão da Canoa', 'R. Peri, 4215 - Centro', 'Capão da Canoa', 'RS', '95555000', -29.74556, -50.00972, '1543')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Cidreira
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Cidreira', 'Parque IX', 'Cidreira', 'RS', '95595000', -30.18111, -50.20556, '1542')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Imbé
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Imbé', 'Av. Caxias do Sul, 1559 - Quadra 265 - Centro', 'Imbé', 'RS', '95625970', -29.93314, -50.1063, '1541')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Magistério
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Magistério', 'R. Osvaldo Aranha, 251 - Magistério', 'Balneário Pinhal', 'RS', '95599000', -30.25885, -50.23866, 'asun-magisterio')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Mariluz
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Mariluz', 'Av. Paraguassú, 2474 - Balneário Mariluz', 'Imbé', 'RS', '95625000', -29.93314, -50.1063, 'asun-mariluz')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Noiva do Mar
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Noiva do Mar', 'Av. Paraguassu, 801 - Centro', 'Xangri-lá', 'RS', '95588000', -29.80083, -50.04361, 'asun-noiva-do-mar')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Nova Tramandaí
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Nova Tramandaí', 'Av. Florianópolis, S/N - Nova Tramandaí', 'Tramandaí', 'RS', '95590000', -29.98472, -50.13361, 'asun-nova-tramandai')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Osório
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Osório', 'Rua Lateral da BR-101 - Centro', 'Osório', 'RS', '95520000', -29.88667, -50.26972, 'asun-osorio')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Pinhal Centro
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Pinhal Centro', 'Av. Pampa, 400', 'Balneário Pinhal', 'RS', '95599000', -30.25885, -50.23866, 'asun-pinhal-centro')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Quintão
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Quintão', 'Av. Esparta, 4717 - Quintão', 'Palmares do Sul', 'RS', '95548000', -30.25778, -50.50972, 'asun-quintao')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Torres
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Torres', 'Av. Castelo Branco, 1010 - Centro', 'Torres', 'RS', '95560000', -29.33528, -49.72694, 'asun-torres')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Tramandaí
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Tramandaí', 'Av. Fernandes Bastos, 1201 - Centro', 'Tramandaí', 'RS', '95590000', -29.98472, -50.13361, 'asun-tramandai')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Xangri-lá
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Xangri-lá', 'Rua Pedro Higino da Silveira, 1041 - Centro', 'Xangri-lá', 'RS', '95588000', -29.80083, -50.04361, 'asun-xangri-la')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Xangri-lá 2
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Xangri-lá 2', 'Av. Paraguassu, 55 - Centro', 'Xangri-lá', 'RS', '95588000', -29.80083, -50.04361, 'asun-xangri-la-2')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Azenha
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Azenha', 'Av. Bento Gonçalves, 68 - Azenha', 'Porto Alegre', 'RS', '90650000', -30.03283, -51.23019, 'asun-azenha')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Cavalhada
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Cavalhada', 'Av. da Cavalhada, 2985 - Cavalhada', 'Porto Alegre', 'RS', '91740001', -30.1026, -51.2312, '1540')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Conceição
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Conceição', 'Av. Francisco Trein, 687 - Cristo Redentor', 'Porto Alegre', 'RS', '91350200', -30.03283, -51.23019, 'asun-conceicao')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Juca Batista
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Juca Batista', 'Av. Juca Batista, 7365', 'Porto Alegre', 'RS', '91770001', -30.03283, -51.23019, 'asun-juca-batista')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Plínio
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Plínio', 'Av. Plínio Brasil Milano, 1609 - Higienópolis', 'Porto Alegre', 'RS', '90520002', -30.03283, -51.23019, 'asun-plinio')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Pontal
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Pontal', 'Av. Padre Cacique, 2893 - Cristal', 'Porto Alegre', 'RS', '90810240', -30.03283, -51.23019, 'asun-pontal')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun República
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun República', 'R. da República, 500 - Cidade Baixa', 'Porto Alegre', 'RS', '90050320', -30.03283, -51.23019, 'asun-republica')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Restinga
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Restinga', 'Estr. João Antônio da Silveira, 1134 - Restinga', 'Porto Alegre', 'RS', '91790512', -30.03283, -51.23019, 'asun-restinga')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Santana
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Santana', 'R. Gen. Jacinto Osório, 126 - Santana', 'Porto Alegre', 'RS', '90040290', -30.03283, -51.23019, 'asun-santana')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Cachoeirinha
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Cachoeirinha', 'Av. Gen. Flores da Cunha, 952 - Centro', 'Cachoeirinha', 'RS', '94910001', -29.95111, -51.09389, 'asun-cachoeirinha')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Cachoeirinha Centro 2
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Cachoeirinha Centro 2', 'Av. Gen. Flores da Cunha, 823 - Centro', 'Cachoeirinha', 'RS', '94910001', -29.95111, -51.09389, '1560')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Canoas Fátima
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Canoas Fátima', 'R. Cairú, 1880 - Rio Branco', 'Canoas', 'RS', '92200021', NULL, NULL, 'asun-canoas-fatima')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Canoas Florianópolis
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Canoas Florianópolis', 'R. Florianópolis, 1850 - Mathias Velho', 'Canoas', 'RS', '92330500', -29.91778, -51.18361, 'asun-canoas-florianopolis')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Canoas Igara
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Canoas Igara', 'Av. Boqueirão, 2100 - Igara', 'Canoas', 'RS', '92032420', -29.91778, -51.18361, 'asun-canoas-igara')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Canoas Niterói
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Canoas Niterói', 'R. Júlio de Castilhos, 263 - Niterói', 'Canoas', 'RS', '92120030', -29.91778, -51.18361, 'asun-canoas-niteroi')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Central Park
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Central Park', 'Av. Frederico Augusto Ritter, 3581 - City', 'Cachoeirinha', 'RS', '94931001', -29.95111, -51.09389, 'asun-central-park')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Dois Irmãos
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Dois Irmãos', 'Av. Irineu Becker, 585 - Primavera', 'Dois Irmãos', 'RS', '93950000', -29.58028, -51.08528, 'asun-dois-irmaos')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Eldorado
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Eldorado', 'Estr. da Arrozeira, 10 - Centro', 'Eldorado do Sul', 'RS', '92990000', -29.99932, -51.30822, '1562')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Estância Velha
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Estância Velha', 'R. Portão, 511 - Centro', 'Estância Velha', 'RS', '93600090', -29.64833, -51.17389, 'asun-estancia-velha')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Gravataí Centro
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Gravataí Centro', 'R. Dr. Luiz Bastos do Prado, 1750 - Centro', 'Gravataí', 'RS', '94010020', -29.94218, -50.99278, 'asun-gravatai-centro')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Guaíba
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Guaíba', 'Av. Adão Foques, 2813 - Jardim Iolanda', 'Guaíba', 'RS', NULL, NULL, NULL, 'asun-guaiba')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Asun Montenegro
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (3, 'Asun Montenegro', 'R. Cap. Porfírio, 1781 - Centro', 'Montenegro', 'RS', '92510305', -29.68861, -51.46111, 'asun-montenegro')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Moinhos
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Moinhos', 'Rua Olavo Barreto Viana, 18', 'Porto Alegre', 'RS', '90570070', -30.03283, -51.23019, 'zaffari-moinhos')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Carlos Gomes
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Carlos Gomes', 'Av. Carlos Gomes, 707', 'Porto Alegre', 'RS', '90470133', -30.03283, -51.23019, 'zaffari-carlos-gomes')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Lucas de Oliveira
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Lucas de Oliveira', 'Av. Coronel Lucas de Oliveira, 740', 'Porto Alegre', 'RS', '90460001', -30.03283, -51.23019, 'zaffari-lucas-de-oliveira')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Teresópolis
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Teresópolis', 'Av. Cel. Aparício Borges, 250', 'Porto Alegre', 'RS', '90680570', -30.03283, -51.23019, 'zaffari-teresopolis')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Lindoia
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Lindoia', 'Av. Panamericana, 240', 'Porto Alegre', 'RS', '91050000', -30.03283, -51.23019, 'zaffari-lindoia')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Zaffari ParkShopping Canoas
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Zaffari ParkShopping Canoas', 'Av. Farroupilha, 4545 - ParkShopping Canoas', 'Canoas', 'RS', '92020475', -29.91778, -51.18361, 'hipermercado-zaffari-parkshopping-canoas')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Zaffari Wallig
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Zaffari Wallig', 'Av. Assis Brasil, 2611', 'Porto Alegre', 'RS', '91010006', -30.03283, -51.23019, 'hipermercado-zaffari-wallig')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Total
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Total', 'Av. Cristóvão Colombo, 545 - Prédio 6 - Shopping Total', 'Porto Alegre', 'RS', '90560000', -30.03283, -51.23019, 'zaffari-total')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Protásio Alves
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Protásio Alves', 'Av. Protásio Alves, 2700 - Petrópolis', 'Porto Alegre', 'RS', '90410006', -30.03283, -51.23019, 'zaffari-protasio-alves')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Passo Fundo
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Passo Fundo', 'Rua Uruguai, 1483 - Vila Vergueiro', 'Passo Fundo', 'RS', NULL, NULL, NULL, 'zaffari-passo-fundo')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Zaffari Otto Niemeyer
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Zaffari Otto Niemeyer', 'Rua Otto Niemeyer, 601 - Tristeza', 'Porto Alegre', 'RS', '91910001', -30.03283, -51.23019, 'hipermercado-zaffari-otto-niemeyer')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Menino Deus
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Menino Deus', 'Rua Múcio Teixeira, 680 - Menino Deus', 'Porto Alegre', 'RS', '90150090', -30.03283, -51.23019, 'zaffari-menino-deus')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Marechal Floriano
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Marechal Floriano', 'Rua Marechal Floriano Peixoto, 333 - Centro', 'Porto Alegre', 'RS', '90020061', -30.03283, -51.23019, 'zaffari-marechal-floriano')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Lima e Silva
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Lima e Silva', 'Rua Lima e Silva, 606 - Cidade Baixa', 'Porto Alegre', 'RS', '90050100', -30.03283, -51.23019, 'zaffari-lima-e-silva')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Zaffari Ipiranga
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Zaffari Ipiranga', 'Av. Ipiranga, 3000 - Santa Cecília', 'Porto Alegre', 'RS', '90610000', -30.03283, -51.23019, 'hipermercado-zaffari-ipiranga')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Ipanema
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Ipanema', 'Av. Juca Batista, 925 - Ipanema', 'Porto Alegre', 'RS', '91770001', -30.03283, -51.23019, 'zaffari-ipanema')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Zaffari Higienópolis
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Zaffari Higienópolis', 'Av. Plínio Brasil Milano, 1000 - Higienópolis', 'Porto Alegre', 'RS', '90520900', -30.03283, -51.23019, 'hipermercado-zaffari-higienopolis')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Fernando Machado
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Fernando Machado', 'Rua Fernando Machado, 860 - Centro', 'Porto Alegre', 'RS', '90010320', -30.03283, -51.23019, 'zaffari-fernando-machado')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Fernandes Vieira
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Fernandes Vieira', 'Rua Fernandes Vieira, 401 - Bom Fim', 'Porto Alegre', 'RS', '90035091', -30.03283, -51.23019, 'zaffari-fernandes-vieira')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Zaffari Cristóvão Colombo
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Zaffari Cristóvão Colombo', 'Av. Cristóvão Colombo, 1271 - Floresta', 'Porto Alegre', 'RS', '90560004', -30.03283, -51.23019, 'hipermercado-zaffari-cristovao-colombo')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Caxias San Pellegrino
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Caxias San Pellegrino', 'Av. Rio Branco, 425 - Loja 106 - São Pelegrino', 'Caxias do Sul', 'RS', '95010060', -29.16806, -51.17944, 'zaffari-caxias-san-pellegrino')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Zaffari Centerlar
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Zaffari Centerlar', 'Av. Sertório, 8000 - Sarandi', 'Porto Alegre', 'RS', '91130720', -30.03283, -51.23019, 'hipermercado-zaffari-centerlar')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Caxias Sinimbu
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Caxias Sinimbu', 'Rua Sinimbu, 135 - Lourdes', 'Caxias do Sul', 'RS', '95020000', -29.16806, -51.17944, 'zaffari-caxias-sinimbu')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Caxias Exposição
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Caxias Exposição', 'Rua Alfredo Chaves, 1332 - Exposição', 'Caxias do Sul', 'RS', '95020460', -29.16806, -51.17944, 'zaffari-caxias-exposicao')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Zaffari Caxias Centro
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Zaffari Caxias Centro', 'Rua Borges de Medeiros, 391 - Centro', 'Caxias do Sul', 'RS', '95020310', -29.16806, -51.17944, 'hipermercado-zaffari-caxias-centro')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Zaffari Cavalhada
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Zaffari Cavalhada', 'Av. Cavalhada, 3621 - Cavalhada', 'Porto Alegre', 'RS', '91751830', -30.03283, -51.23019, 'hipermercado-zaffari-cavalhada')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Cabral
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Cabral', 'Rua Cabral, 600 - Rio Branco', 'Porto Alegre', 'RS', '90420121', -30.03283, -51.23019, 'zaffari-cabral')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Boulevard
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Boulevard', 'Av. Assis Brasil, 4320 - São Sebastião', 'Porto Alegre', 'RS', '91110000', -30.03283, -51.23019, 'zaffari-boulevard')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Bordini
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Bordini', 'Rua Cel. Bordini, 530 - Auxiliadora', 'Porto Alegre', 'RS', '90440002', -30.03283, -51.23019, 'zaffari-bordini')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Anita Garibaldi
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Anita Garibaldi', 'Rua Anita Garibaldi, 536 - Mont''Serrat', 'Porto Alegre', 'RS', '90450000', -30.03283, -51.23019, 'zaffari-anita-garibaldi')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Rua da Praia
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Rua da Praia', 'Rua dos Andradas, 933 - Centro', 'Porto Alegre', 'RS', '90020005', -30.03283, -51.23019, 'zaffari-rua-da-praia')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Zaffari Hípica
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Zaffari Hípica', 'Av. Juca Batista, 4255 - Hípica', 'Porto Alegre', 'RS', '91755000', -30.03283, -51.23019, 'zaffari-hipica')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Bourbon Assis Brasil
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Bourbon Assis Brasil', 'Av. Assis Brasil, 164', 'Porto Alegre', 'RS', '91010000', -30.03283, -51.23019, 'hipermercado-bourbon-assis-brasil')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Bourbon São Leopoldo
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Bourbon São Leopoldo', 'Av. Primeiro de Março, 821', 'São Leopoldo', 'RS', '93010210', -29.76028, -51.14722, 'hipermercado-bourbon-sao-leopoldo')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Bourbon Passo Fundo
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Bourbon Passo Fundo', 'Av. Brasil Leste, 200', 'Passo Fundo', 'RS', '99050000', NULL, NULL, 'hipermercado-bourbon-passo-fundo')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Bourbon Novo Hamburgo
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Bourbon Novo Hamburgo', 'Av. Primeiro de Março, 1111', 'Novo Hamburgo', 'RS', '93320010', NULL, NULL, 'hipermercado-bourbon-novo-hamburgo')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Bourbon Ipiranga
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Bourbon Ipiranga', 'Av. Ipiranga, 5200', 'Porto Alegre', 'RS', '90610000', -30.03283, -51.23019, 'hipermercado-bourbon-ipiranga')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Bourbon Country
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Bourbon Country', 'Av. Túlio de Rose, 100', 'Porto Alegre', 'RS', '91340110', -30.03283, -51.23019, 'hipermercado-bourbon-country')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

-- Hipermercado Bourbon Canoas
INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)
VALUES
    (6, 'Hipermercado Bourbon Canoas', 'Av. Getúlio Vargas, 5765', 'Canoas', 'RS', '92010011', -29.91778, -51.18361, 'hipermercado-bourbon-canoas')
ON CONFLICT (mercado_id, codigo_externo) DO UPDATE
    SET nome      = EXCLUDED.nome,
        endereco  = EXCLUDED.endereco,
        cidade    = EXCLUDED.cidade,
        uf        = EXCLUDED.uf,
        cep       = EXCLUDED.cep,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;

COMMIT;

-- Conferencia: lojas reais por mercado (a loja padrao fica de fora)
SELECT m.id AS mercado_id, m.nome AS mercado,
       COUNT(l.id) AS lojas,
       COUNT(l.id) FILTER (WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL) AS com_coordenadas,
       COUNT(l.id) FILTER (WHERE l.latitude IS NULL OR l.longitude IS NULL) AS sem_coordenadas
FROM mercado m
LEFT JOIN loja l ON l.mercado_id = m.id AND l.codigo_externo <> 'padrao'
WHERE m.id IN (1, 3, 6)
GROUP BY m.id, m.nome
ORDER BY m.id;
