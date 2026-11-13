-- ============================================================
-- SmartMarket - Deploy Script 08: lojas (filiais) reais de Fort, Asun e Zaffari/Bourbon no RS
-- ============================================================
-- Gerado por scraper/gerar_sql_lojas.py em 2026-11-13 a partir de scraper/lojas/lojas.json.
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
    (1, 'Fort Atacadista Canoas', 'Av. Farroupilha, 4803 - Marechal Rondon', 'Canoas', 'RS', '92020475', -29.911571, -51.1635307, '545')
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
    (1, 'Fort Atacadista Caxias do Sul', 'Rua Tronca, 1370 - Exposição', 'Caxias do Sul', 'RS', '95010100', -29.17391, -51.173771, '345')
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
    (1, 'Fort Atacadista Gravataí', 'Av. Dorival Cândido Luz de Oliveira, 6845 - Bom Princípio', 'Gravataí', 'RS', '94070001', -29.9328268, -51.0582512, '945')
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
    (1, 'Fort Atacadista Porto Alegre', 'Av. Manoel Elias, 745 - Passo das Pedras', 'Porto Alegre', 'RS', '91240261', -30.0243435, -51.1201929, '845')
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
    (1, 'Fort Atacadista Novo Hamburgo', 'Rua Vinte e Quatro de Maio, 368 - Operário', 'Novo Hamburgo', 'RS', '93315138', -29.676491, -51.1384766, '445')
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
    (1, 'Fort Atacadista Santa Cruz do Sul', 'Av. Paul Harris, 291 - Centro', 'Santa Cruz do Sul', 'RS', '96810408', -29.7250559, -52.4334118, '885')
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
    (1, 'Fort Atacadista Viamão', 'Av. Senador Salgado Filho, 7131 - Jardim Krahe', 'Viamão', 'RS', '94450000', -30.0871864, -51.0553739, '370')
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
    (3, 'Asun Capão da Canoa', 'R. Peri, 4215 - Centro', 'Capão da Canoa', 'RS', '95555000', -29.769026, -50.0250234, '1543')
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
    (3, 'Asun Cidreira', 'Parque IX', 'Cidreira', 'RS', '95595000', -30.1474802, -50.1930475, '1542')
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
    (3, 'Asun Imbé', 'Av. Caxias do Sul, 1559 - Quadra 265 - Centro', 'Imbé', 'RS', '95625970', -29.9556511, -50.1308433, '1541')
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
    (3, 'Asun Magistério', 'R. Osvaldo Aranha, 251 - Magistério', 'Balneário Pinhal', 'RS', '95599000', -30.2900456, -50.2549724, 'asun-magisterio')
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
    (3, 'Asun Mariluz', 'Av. Paraguassú, 2474 - Balneário Mariluz', 'Imbé', 'RS', '95625000', -29.9485733, -50.1260328, 'asun-mariluz')
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
    (3, 'Asun Noiva do Mar', 'Av. Paraguassu, 801 - Centro', 'Xangri-lá', 'RS', '95588000', NULL, NULL, 'asun-noiva-do-mar')
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
    (3, 'Asun Nova Tramandaí', 'Av. Florianópolis, S/N - Nova Tramandaí', 'Tramandaí', 'RS', '95590000', -30.040186, -50.1572409, 'asun-nova-tramandai')
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
    (3, 'Asun Pinhal Centro', 'Av. Pampa, 400', 'Balneário Pinhal', 'RS', '95599000', -30.2519033, -50.2385065, 'asun-pinhal-centro')
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
    (3, 'Asun Quintão', 'Av. Esparta, 4717 - Quintão', 'Palmares do Sul', 'RS', '95548000', -30.3565012, -50.2767788, 'asun-quintao')
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
    (3, 'Asun Torres', 'Av. Castelo Branco, 1010 - Centro', 'Torres', 'RS', '95560000', -29.3217232, -49.7665912, 'asun-torres')
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
    (3, 'Asun Tramandaí', 'Av. Fernandes Bastos, 1201 - Centro', 'Tramandaí', 'RS', '95590000', -30.0030609, -50.171894, 'asun-tramandai')
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
    (3, 'Asun Xangri-lá 2', 'Av. Paraguassu, 55 - Centro', 'Xangri-lá', 'RS', '95588000', NULL, NULL, 'asun-xangri-la-2')
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
    (3, 'Asun Azenha', 'Av. Bento Gonçalves, 68 - Azenha', 'Porto Alegre', 'RS', '90650000', -30.0616946, -51.171191, 'asun-azenha')
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
    (3, 'Asun Cavalhada', 'Av. da Cavalhada, 2985 - Cavalhada', 'Porto Alegre', 'RS', '91740001', -30.1025756, -51.2311271, '1540')
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
    (3, 'Asun Conceição', 'Av. Francisco Trein, 687 - Cristo Redentor', 'Porto Alegre', 'RS', '91350200', -30.0171736, -51.1593984, 'asun-conceicao')
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
    (3, 'Asun Juca Batista', 'Av. Juca Batista, 7365', 'Porto Alegre', 'RS', '91770001', -30.1619985, -51.1838576, 'asun-juca-batista')
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
    (3, 'Asun Plínio', 'Av. Plínio Brasil Milano, 1609 - Higienópolis', 'Porto Alegre', 'RS', '90520002', -30.0210791, -51.1817435, 'asun-plinio')
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
    (3, 'Asun Pontal', 'Av. Padre Cacique, 2893 - Cristal', 'Porto Alegre', 'RS', '90810240', -30.0806659, -51.2476248, 'asun-pontal')
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
    (3, 'Asun República', 'R. da República, 500 - Cidade Baixa', 'Porto Alegre', 'RS', '90050320', -30.0383442, -51.2231435, 'asun-republica')
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
    (3, 'Asun Restinga', 'Estr. João Antônio da Silveira, 1134 - Restinga', 'Porto Alegre', 'RS', '91790512', -30.1584845, -51.1472022, 'asun-restinga')
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
    (3, 'Asun Santana', 'R. Gen. Jacinto Osório, 126 - Santana', 'Porto Alegre', 'RS', '90040290', -30.040837, -51.21169, 'asun-santana')
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
    (3, 'Asun Cachoeirinha', 'Av. Gen. Flores da Cunha, 952 - Centro', 'Cachoeirinha', 'RS', '94910001', -29.953001, -51.1039564, 'asun-cachoeirinha')
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
    (3, 'Asun Cachoeirinha Centro 2', 'Av. Gen. Flores da Cunha, 823 - Centro', 'Cachoeirinha', 'RS', '94910001', -29.9351103, -51.0795984, '1560')
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
    (3, 'Asun Canoas Fátima', 'R. Cairú, 1880 - Rio Branco', 'Canoas', 'RS', '92200021', -29.9407166, -51.1845732, 'asun-canoas-fatima')
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
    (3, 'Asun Canoas Florianópolis', 'R. Florianópolis, 1850 - Mathias Velho', 'Canoas', 'RS', '92330500', -29.9063397, -51.2106648, 'asun-canoas-florianopolis')
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
    (3, 'Asun Canoas Igara', 'Av. Boqueirão, 2100 - Igara', 'Canoas', 'RS', '92032420', -29.9047387, -51.1527247, 'asun-canoas-igara')
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
    (3, 'Asun Canoas Niterói', 'R. Júlio de Castilhos, 263 - Niterói', 'Canoas', 'RS', '92120030', -29.9559629, -51.1734978, 'asun-canoas-niteroi')
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
    (3, 'Asun Central Park', 'Av. Frederico Augusto Ritter, 3581 - City', 'Cachoeirinha', 'RS', '94931001', -29.8903621, -51.0905343, 'asun-central-park')
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
    (3, 'Asun Dois Irmãos', 'Av. Irineu Becker, 585 - Primavera', 'Dois Irmãos', 'RS', '93950000', -29.5789591, -51.0930541, 'asun-dois-irmaos')
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
    (3, 'Asun Eldorado', 'Estr. da Arrozeira, 10 - Centro', 'Eldorado do Sul', 'RS', '92990000', -30.0038861, -51.3121662, '1562')
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
    (3, 'Asun Estância Velha', 'R. Portão, 511 - Centro', 'Estância Velha', 'RS', '93600090', -29.6638075, -51.1965972, 'asun-estancia-velha')
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
    (3, 'Asun Gravataí Centro', 'R. Dr. Luiz Bastos do Prado, 1750 - Centro', 'Gravataí', 'RS', '94010020', -29.9399309, -50.9941085, 'asun-gravatai-centro')
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
    (3, 'Asun Montenegro', 'R. Cap. Porfírio, 1781 - Centro', 'Montenegro', 'RS', '92510305', -29.6869568, -51.4583443, 'asun-montenegro')
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
    (6, 'Zaffari Moinhos', 'Rua Olavo Barreto Viana, 18', 'Porto Alegre', 'RS', '90570070', -30.0234669, -51.2015662, 'zaffari-moinhos')
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
    (6, 'Zaffari Carlos Gomes', 'Av. Carlos Gomes, 707', 'Porto Alegre', 'RS', '90470133', -30.0282166, -51.1824915, 'zaffari-carlos-gomes')
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
    (6, 'Zaffari Lucas de Oliveira', 'Av. Coronel Lucas de Oliveira, 740', 'Porto Alegre', 'RS', '90460001', -30.029233, -51.1941365, 'zaffari-lucas-de-oliveira')
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
    (6, 'Zaffari Teresópolis', 'Av. Cel. Aparício Borges, 250', 'Porto Alegre', 'RS', '90680570', -30.0662346, -51.1868322, 'zaffari-teresopolis')
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
    (6, 'Zaffari Lindoia', 'Av. Panamericana, 240', 'Porto Alegre', 'RS', '91050000', -30.0080867, -51.1518349, 'zaffari-lindoia')
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
    (6, 'Hipermercado Zaffari ParkShopping Canoas', 'Av. Farroupilha, 4545 - ParkShopping Canoas', 'Canoas', 'RS', '92020475', -29.9153687, -51.1647989, 'hipermercado-zaffari-parkshopping-canoas')
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
    (6, 'Hipermercado Zaffari Wallig', 'Av. Assis Brasil, 2611', 'Porto Alegre', 'RS', '91010006', -30.0122608, -51.1607353, 'hipermercado-zaffari-wallig')
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
    (6, 'Zaffari Total', 'Av. Cristóvão Colombo, 545 - Prédio 6 - Shopping Total', 'Porto Alegre', 'RS', '90560000', -30.0262167, -51.2123437, 'zaffari-total')
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
    (6, 'Zaffari Protásio Alves', 'Av. Protásio Alves, 2700 - Petrópolis', 'Porto Alegre', 'RS', '90410006', -30.038876, -51.1226433, 'zaffari-protasio-alves')
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
    (6, 'Zaffari Passo Fundo', 'Rua Uruguai, 1483 - Vila Vergueiro', 'Passo Fundo', 'RS', NULL, -28.2611307, -52.41384, 'zaffari-passo-fundo')
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
    (6, 'Hipermercado Zaffari Otto Niemeyer', 'Rua Otto Niemeyer, 601 - Tristeza', 'Porto Alegre', 'RS', '91910001', NULL, NULL, 'hipermercado-zaffari-otto-niemeyer')
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
    (6, 'Zaffari Menino Deus', 'Rua Múcio Teixeira, 680 - Menino Deus', 'Porto Alegre', 'RS', '90150090', -30.0512052, -51.223768, 'zaffari-menino-deus')
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
    (6, 'Zaffari Marechal Floriano', 'Rua Marechal Floriano Peixoto, 333 - Centro', 'Porto Alegre', 'RS', '90020061', -30.0318508, -51.2271774, 'zaffari-marechal-floriano')
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
    (6, 'Zaffari Lima e Silva', 'Rua Lima e Silva, 606 - Cidade Baixa', 'Porto Alegre', 'RS', '90050100', -30.0381383, -51.2210932, 'zaffari-lima-e-silva')
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
    (6, 'Hipermercado Zaffari Ipiranga', 'Av. Ipiranga, 3000 - Santa Cecília', 'Porto Alegre', 'RS', '90610000', -30.0446407, -51.1977664, 'hipermercado-zaffari-ipiranga')
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
    (6, 'Zaffari Ipanema', 'Av. Juca Batista, 925 - Ipanema', 'Porto Alegre', 'RS', '91770001', NULL, NULL, 'zaffari-ipanema')
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
    (6, 'Hipermercado Zaffari Higienópolis', 'Av. Plínio Brasil Milano, 1000 - Higienópolis', 'Porto Alegre', 'RS', '90520900', -30.0200538, -51.1809551, 'hipermercado-zaffari-higienopolis')
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
    (6, 'Zaffari Fernando Machado', 'Rua Fernando Machado, 860 - Centro', 'Porto Alegre', 'RS', '90010320', NULL, NULL, 'zaffari-fernando-machado')
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
    (6, 'Zaffari Fernandes Vieira', 'Rua Fernandes Vieira, 401 - Bom Fim', 'Porto Alegre', 'RS', '90035091', -30.0327064, -51.2114037, 'zaffari-fernandes-vieira')
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
    (6, 'Hipermercado Zaffari Cristóvão Colombo', 'Av. Cristóvão Colombo, 1271 - Floresta', 'Porto Alegre', 'RS', '90560004', -30.0210305, -51.2069733, 'hipermercado-zaffari-cristovao-colombo')
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
    (6, 'Zaffari Caxias San Pellegrino', 'Av. Rio Branco, 425 - Loja 106 - São Pelegrino', 'Caxias do Sul', 'RS', '95010060', -29.1713894, -51.1912303, 'zaffari-caxias-san-pellegrino')
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
    (6, 'Hipermercado Zaffari Centerlar', 'Av. Sertório, 8000 - Sarandi', 'Porto Alegre', 'RS', '91130720', -29.9996531, -51.1313278, 'hipermercado-zaffari-centerlar')
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
    (6, 'Zaffari Caxias Sinimbu', 'Rua Sinimbu, 135 - Lourdes', 'Caxias do Sul', 'RS', '95020000', -29.1687605, -51.1759491, 'zaffari-caxias-sinimbu')
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
    (6, 'Zaffari Caxias Exposição', 'Rua Alfredo Chaves, 1332 - Exposição', 'Caxias do Sul', 'RS', '95020460', -29.1687775, -51.1759389, 'zaffari-caxias-exposicao')
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
    (6, 'Hipermercado Zaffari Caxias Centro', 'Rua Borges de Medeiros, 391 - Centro', 'Caxias do Sul', 'RS', '95020310', NULL, NULL, 'hipermercado-zaffari-caxias-centro')
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
    (6, 'Hipermercado Zaffari Cavalhada', 'Av. Cavalhada, 3621 - Cavalhada', 'Porto Alegre', 'RS', '91751830', -30.1084791, -51.228654, 'hipermercado-zaffari-cavalhada')
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
    (6, 'Zaffari Cabral', 'Rua Cabral, 600 - Rio Branco', 'Porto Alegre', 'RS', '90420121', -30.0339191, -51.2023107, 'zaffari-cabral')
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
    (6, 'Zaffari Boulevard', 'Av. Assis Brasil, 4320 - São Sebastião', 'Porto Alegre', 'RS', '91110000', -30.008942, -51.1443765, 'zaffari-boulevard')
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
    (6, 'Zaffari Bordini', 'Rua Cel. Bordini, 530 - Auxiliadora', 'Porto Alegre', 'RS', '90440002', -30.0222238, -51.196548, 'zaffari-bordini')
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
    (6, 'Zaffari Anita Garibaldi', 'Rua Anita Garibaldi, 536 - Mont''Serrat', 'Porto Alegre', 'RS', '90450000', -30.0266954, -51.1903298, 'zaffari-anita-garibaldi')
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
    (6, 'Zaffari Rua da Praia', 'Rua dos Andradas, 933 - Centro', 'Porto Alegre', 'RS', '90020005', -30.0308811, -51.2322914, 'zaffari-rua-da-praia')
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
    (6, 'Zaffari Hípica', 'Av. Juca Batista, 4255 - Hípica', 'Porto Alegre', 'RS', '91755000', NULL, NULL, 'zaffari-hipica')
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
    (6, 'Hipermercado Bourbon Assis Brasil', 'Av. Assis Brasil, 164', 'Porto Alegre', 'RS', '91010000', -30.0061148, -51.1844907, 'hipermercado-bourbon-assis-brasil')
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
    (6, 'Hipermercado Bourbon São Leopoldo', 'Av. Primeiro de Março, 821', 'São Leopoldo', 'RS', '93010210', -29.7692496, -51.1464348, 'hipermercado-bourbon-sao-leopoldo')
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
    (6, 'Hipermercado Bourbon Passo Fundo', 'Av. Brasil Leste, 200', 'Passo Fundo', 'RS', '99050000', -28.2535865, -52.3935258, 'hipermercado-bourbon-passo-fundo')
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
    (6, 'Hipermercado Bourbon Novo Hamburgo', 'Av. Primeiro de Março, 1111', 'Novo Hamburgo', 'RS', '93320010', -29.6937395, -51.1312526, 'hipermercado-bourbon-novo-hamburgo')
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
    (6, 'Hipermercado Bourbon Ipiranga', 'Av. Ipiranga, 5200', 'Porto Alegre', 'RS', '90610000', -30.0553096, -51.1869541, 'hipermercado-bourbon-ipiranga')
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
    (6, 'Hipermercado Bourbon Country', 'Av. Túlio de Rose, 100', 'Porto Alegre', 'RS', '91340110', -30.0228625, -51.1555463, 'hipermercado-bourbon-country')
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
    (6, 'Hipermercado Bourbon Canoas', 'Av. Getúlio Vargas, 5765', 'Canoas', 'RS', '92010011', -29.9150646, -51.1758369, 'hipermercado-bourbon-canoas')
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
