# Proposta: cesta de demonstração com preço em 2+ redes

Data: 03/11/2026. **Nenhuma coleta foi feita.** Aguarda aprovação.

## Objetivo

Ter de 100 a 200 produtos do catálogo com preço real em 2 ou mais redes, casados por EAN, para a demonstração do comparador. As redes usadas são Atacadão, Master e Stok, que aceitam busca por EAN. Zaffari, Rissul e Carrefour ficam de fora: não têm busca por EAN permitida, e Zaffari e Rissul bloqueiam `/api` no robots.txt. Asun e Fort não expõem EAN.

## Candidatos

São 240 produtos que já estão no `data.js`, com os mesmos ids. Todos foram coletados em uma das três redes (Stok 156, Master 81, Atacadão 3).

Como foram escolhidos:

- dos 362 produtos do catálogo com origem em Master, Stok ou Atacadão, ficaram os 347 embalados, com medida no nome e sem granel, kg aproximado, fatiado ou resfriado;
- os 240 foram tirados por prioridade de cesta básica: mercearia 86, graos 79, cafe 27, leites 26, oleos 13, limpeza 9.

Na amostra do relatório de casamento (`docs/casamento-produtos.md`), 47 de 75 EANs (63%) apareceram em 2 ou mais redes na busca cruzada. Com essa taxa, os 240 candidatos devem render **cerca de 150 produtos** em 2+ redes, dentro da faixa pedida. A taxa vem de uma amostra pequena, então o número real pode ficar abaixo de 100. Nesse caso, eu paro e trago o resultado antes de ampliar.

## Método (depois da aprovação)

1. **EAN na rede de origem:** busca pelo nome na API da rede de origem (VipCommerce `buscas/produtos/termo` para Master e Stok, VTEX para Atacadão), aceitando só o resultado com o mesmo `idOrigem`. Em seguida, validação com `ean.validar_ean`.
2. **Busca cruzada pelo EAN** nas outras duas redes: Atacadão com `fq=alternateIds_Ean:<ean>` e Master/Stok com `buscas/produtos/termo/<ean>`. O preço vem na própria resposta, sem requisição extra.
3. **Vínculo:** o mesmo EAN com a mesma embalagem vira `confirmado`. Embalagem diferente vira `revisar` (regra de `casamento.py`) e fica fora da cesta.
4. **Saída:** um JSON com produto, EAN e preço por rede. Ele só entra no `data.js` ou no banco com uma nova aprovação.

## Estimativa de requisições e tempo (2 s por host)

| Host | Requisições | Tempo mínimo a 2 s |
|---|---|---|
| `services.vipcommerce.com.br` (Master **e** Stok, mesmo host) | 482 (2 login + 2 por candidato) | 964 s ≈ 16 min |
| `www.atacadao.com.br` | 240 (1 por candidato) | 480 s ≈ 8 min |
| **Total** | **722** | os hosts rodam em paralelo; o VipCommerce limita: **≈ 16 min**, ou 20 a 25 min contando o tempo de resposta |

## O que precisa mudar antes de coletar

- **User-Agent:** `scraper/relatorio_casamento.py:24` tem o e-mail pessoal no contato. Trocar por um contato do projeto (ex.: URL do repositório) antes de qualquer requisição.
- **Pausa por host:** em `consultar_eans`, Master e Stok rodam em threads separadas, cada uma com o seu `_Pausa`, mas usam o mesmo host. Na prática, o host recebe 1 requisição por segundo. O limitador precisa ser compartilhado por host.
- **Limite de 20 por rede:** vale para os testes ao vivo. Esta coleta passa disso de propósito (240 consultas por rede) e depende da sua aprovação.
- Parar no primeiro 403/429 ou bloqueio, sem tentar contornar.

## Lista dos 240 candidatos

| # | id | Rede de origem | Produto | Categoria | Preço coletado |
|---|---|---|---|---|---|
| 1 | p11 | Master | Arroz Parbolizado Tio João Tp1 5kg | graos | R$ 28.99 |
| 2 | p12 | Master | Arroz Bco Blue Ville Tp1 1kg | graos | R$ 4.89 |
| 3 | p13 | Master | Arroz Camil Tipo 1 2kg | graos | R$ 9.59 |
| 4 | p14 | Master | Arroz Blue Ville Culinária Gaúcha 1kg | graos | R$ 13.29 |
| 5 | p15 | Master | Arroz Carreteiro Tio João 175g | graos | R$ 11.59 |
| 6 | p16 | Master | Arroz Parboilizado Bella Dica 2kg | graos | R$ 10.49 |
| 7 | p17 | Master | Arroz Tio João Cozinha Tailandesa 1kg | graos | R$ 19.39 |
| 8 | p18 | Master | Arroz Branco Bella Dica 2kg | graos | R$ 10.39 |
| 9 | p19 | Master | Arroz Blue Ville Espinafre 250g | graos | R$ 5.49 |
| 10 | p20 | Master | Arroz Tio João Galinha 175g | graos | R$ 15.69 |
| 11 | p21 | Master | Feijao Preto Caldo De Ouro 1kg | graos | R$ 9.69 |
| 12 | p22 | Master | Feijão Vermelho Arbaza Tipo 1 500g | graos | R$ 6.49 |
| 13 | p23 | Master | Feijão Branco Arbaza Tipo 1 500g | graos | R$ 6.49 |
| 14 | p24 | Master | Feijão Preto Gasparin Tipo 1 1kg | graos | R$ 6.69 |
| 15 | p25 | Master | Feijão Preto Gasparin Ypiranga 1kg | graos | R$ 6.99 |
| 16 | p26 | Master | Feijão Preto Ondão Tp1 1kg | graos | R$ 7.99 |
| 17 | p27 | Master | Feijao Preto Grãos Do Sul 1kg | graos | R$ 5.19 |
| 18 | p28 | Master | Feijao Carioca Caldo De Ouro 1kg | graos | R$ 12.59 |
| 19 | p29 | Master | Feijao Azuki Blue Ville 500g | graos | R$ 13.39 |
| 20 | p30 | Master | Feijão Preto Biju Tipo1 1kg | graos | R$ 8.89 |
| 21 | p71 | Master | Farinha Aveia Quaker 165g | graos | R$ 6.69 |
| 22 | p211 | Stok | Arroz Blue Ville Branco Tipo 1 5kg | graos | R$ 20.99 |
| 23 | p212 | Stok | Arroz Blue Ville Branco Tipo 1 1kg | graos | R$ 4.35 |
| 24 | p213 | Stok | Arroz Rozcato Branco Tipo 1 1kg | graos | R$ 3.59 |
| 25 | p214 | Stok | Arroz Tordilho Branco Tipo 1 5kg | graos | R$ 21.49 |
| 26 | p215 | Stok | Arroz Blue Ville Parboilizado Tipo1 5kg | graos | R$ 20.99 |
| 27 | p216 | Stok | Arroz Blue Ville Parboilizado Tipo1 1kg | graos | R$ 4.35 |
| 28 | p217 | Stok | Arroz Rei Arthur Para Cozinha Japonesa Grãos Curtos Tipo 1 1kg | graos | R$ 12.05 |
| 29 | p218 | Stok | Arroz Áurea Branco Tipo 1 5kg | graos | R$ 20.49 |
| 30 | p219 | Stok | Arroz Tordilho Branco Tipo 1 1kg | graos | R$ 4.25 |
| 31 | p220 | Stok | Arroz Rozcato Parboilizado Tipo 1 1kg | graos | R$ 3.59 |
| 32 | p221 | Stok | Feijão Fritz & Frida Preto Premium Tipo 1 1kg | graos | R$ 8.79 |
| 33 | p222 | Stok | Feijão Tordilho Preto Tipo 1 1kg | graos | R$ 7.35 |
| 34 | p223 | Stok | Feijão Fritz & Frida Vermelho Premium Tipo 1 500g | graos | R$ 9.35 |
| 35 | p224 | Stok | Feijão Arbaza Carioca Tipo 1 1kg | graos | R$ 11.39 |
| 36 | p225 | Stok | Feijão Big Bom Preto Tipo 1 1kg | graos | R$ 6.09 |
| 37 | p226 | Stok | Feijão Caldo Ouro Vermelho Tipo 1 1kg | graos | R$ 11.39 |
| 38 | p227 | Stok | Feijão Fritz & Frida Carioca Tipo 1 500g | graos | R$ 7.25 |
| 39 | p228 | Stok | Feijão Caldão Preto Tipo 1 1kg | graos | R$ 7.25 |
| 40 | p229 | Stok | Feijão Fritz & Frida Preto Tipo 1 500g | graos | R$ 4.65 |
| 41 | p230 | Stok | Feijão Arbaza Branco Tipo1 500g | graos | R$ 6.39 |
| 42 | p271 | Stok | Farinha De Trigo Nordeste Tipo1 1kg | graos | R$ 4.05 |
| 43 | p272 | Stok | Farinha De Trigo Gardênia Tipo 2 1kg | graos | R$ 2.69 |
| 44 | p273 | Stok | Farinha De Trigo Panfácil Tradicional 5kg | graos | R$ 19.99 |
| 45 | p274 | Stok | Farinha De Trigo Gardênia Tipo 2 5kg | graos | R$ 13.79 |
| 46 | p275 | Stok | Farinha De Trigo Tordilho 1kg | graos | R$ 4.89 |
| 47 | p276 | Stok | Farinha De Trigo Biondina Tipo1 1kg | graos | R$ 3.59 |
| 48 | p277 | Stok | Farinha De Milho Tordilho Média 1kg | graos | R$ 4.25 |
| 49 | p278 | Stok | Farinha De Trigo Panfácil Tipo 1 1kg | graos | R$ 4.15 |
| 50 | p279 | Stok | Farinha De Milho Beatriz Média 1kg | graos | R$ 4.65 |
| 51 | p411 | Stok | Arroz Blue Ville Branco Tipo 1 5kg | graos | R$ 20.99 |
| 52 | p412 | Stok | Arroz Blue Ville Branco Tipo 1 1kg | graos | R$ 4.35 |
| 53 | p413 | Stok | Arroz Rozcato Branco Tipo 1 1kg | graos | R$ 3.59 |
| 54 | p414 | Stok | Arroz Tordilho Branco Tipo 1 5kg | graos | R$ 21.49 |
| 55 | p415 | Stok | Arroz Blue Ville Parboilizado Tipo1 5kg | graos | R$ 20.99 |
| 56 | p416 | Stok | Arroz Blue Ville Parboilizado Tipo1 1kg | graos | R$ 4.35 |
| 57 | p417 | Stok | Arroz Rei Arthur Para Cozinha Japonesa Grãos Curtos Tipo 1 1kg | graos | R$ 12.05 |
| 58 | p418 | Stok | Arroz Áurea Branco Tipo 1 5kg | graos | R$ 20.49 |
| 59 | p419 | Stok | Arroz Tordilho Branco Tipo 1 1kg | graos | R$ 4.25 |
| 60 | p420 | Stok | Arroz Rozcato Parboilizado Tipo 1 1kg | graos | R$ 3.59 |
| 61 | p421 | Stok | Feijão Fritz & Frida Preto Premium Tipo 1 1kg | graos | R$ 8.79 |
| 62 | p422 | Stok | Feijão Tordilho Preto Tipo 1 1kg | graos | R$ 7.35 |
| 63 | p423 | Stok | Feijão Fritz & Frida Vermelho Premium Tipo 1 500g | graos | R$ 9.35 |
| 64 | p424 | Stok | Feijão Arbaza Carioca Tipo 1 1kg | graos | R$ 11.39 |
| 65 | p425 | Stok | Feijão Big Bom Preto Tipo 1 1kg | graos | R$ 6.09 |
| 66 | p426 | Stok | Feijão Caldo Ouro Vermelho Tipo 1 1kg | graos | R$ 11.39 |
| 67 | p427 | Stok | Feijão Fritz & Frida Carioca Tipo 1 500g | graos | R$ 7.25 |
| 68 | p428 | Stok | Feijão Caldão Preto Tipo 1 1kg | graos | R$ 7.25 |
| 69 | p429 | Stok | Feijão Fritz & Frida Preto Tipo 1 500g | graos | R$ 4.65 |
| 70 | p430 | Stok | Feijão Arbaza Branco Tipo1 500g | graos | R$ 6.39 |
| 71 | p471 | Stok | Farinha De Trigo Nordeste Tipo1 1kg | graos | R$ 4.05 |
| 72 | p472 | Stok | Farinha De Trigo Gardênia Tipo 2 1kg | graos | R$ 2.69 |
| 73 | p473 | Stok | Farinha De Trigo Panfácil Tradicional 5kg | graos | R$ 19.99 |
| 74 | p474 | Stok | Farinha De Trigo Gardênia Tipo 2 5kg | graos | R$ 13.79 |
| 75 | p475 | Stok | Farinha De Trigo Tordilho 1kg | graos | R$ 4.89 |
| 76 | p476 | Stok | Farinha De Trigo Biondina Tipo1 1kg | graos | R$ 3.59 |
| 77 | p477 | Stok | Farinha De Milho Tordilho Média 1kg | graos | R$ 4.25 |
| 78 | p478 | Stok | Farinha De Trigo Panfácil Tipo 1 1kg | graos | R$ 4.15 |
| 79 | p479 | Stok | Farinha De Milho Beatriz Média 1kg | graos | R$ 4.65 |
| 80 | p8 | Atacadão | Leite Condensado Moça Integral 15% Grátis 395g | leites | R$ 8.48 |
| 81 | p32 | Master | Leite Fermentado Polpa Activia 510g Mamao/cer. | leites | R$ 17.99 |
| 82 | p33 | Master | Leite Em Pó Nan Comfort N2 800g | leites | R$ 89.90 |
| 83 | p34 | Master | Leite Fermentado Polpa Activia 510g Mor. | leites | R$ 17.99 |
| 84 | p35 | Master | Leite Condensado Nestlé Moça Lata 395g Integral | leites | R$ 12.29 |
| 85 | p36 | Master | Leite De Côco Light Sococo 200ml | leites | R$ 9.99 |
| 86 | p37 | Master | Leite Santa Clara Integral 1l | leites | R$ 5.59 |
| 87 | p38 | Master | Leite Leitissimo 1l Uht Zero Lactose Integral | leites | R$ 12.49 |
| 88 | p39 | Master | Leite Molico Desnatado 1l | leites | R$ 4.99 |
| 89 | p40 | Master | Leite Fermentado Nestlé Chamyto 720g | leites | R$ 14.39 |
| 90 | p231 | Stok | Leite Elegê Uht Integral 1l | leites | R$ 4.65 |
| 91 | p234 | Stok | Leite Italac Uht Zero Lactose 1l | leites | R$ 5.49 |
| 92 | p235 | Stok | Leite Condensado Elegê Semidesnatado 395g | leites | R$ 3.99 |
| 93 | p236 | Stok | Leite Nestlé Ninho Uht Integral Forti+ 1l | leites | R$ 5.79 |
| 94 | p237 | Stok | Leite Elegê Uht Desnatado 1l | leites | R$ 4.55 |
| 95 | p238 | Stok | Leite Italac Uht Semidesnatado 1l | leites | R$ 4.65 |
| 96 | p239 | Stok | Leite Condensado Italac Semidesnatado 395g | leites | R$ 6.09 |
| 97 | p240 | Stok | Leite Condensado Bão De Minas Semidesnatado 395g | leites | R$ 4.55 |
| 98 | p431 | Stok | Leite Elegê Uht Integral 1l | leites | R$ 4.65 |
| 99 | p434 | Stok | Leite Italac Uht Zero Lactose 1l | leites | R$ 5.49 |
| 100 | p435 | Stok | Leite Condensado Elegê Semidesnatado 395g | leites | R$ 3.99 |
| 101 | p436 | Stok | Leite Nestlé Ninho Uht Integral Forti+ 1l | leites | R$ 5.79 |
| 102 | p437 | Stok | Leite Elegê Uht Desnatado 1l | leites | R$ 4.55 |
| 103 | p438 | Stok | Leite Italac Uht Semidesnatado 1l | leites | R$ 4.65 |
| 104 | p439 | Stok | Leite Condensado Italac Semidesnatado 395g | leites | R$ 6.09 |
| 105 | p440 | Stok | Leite Condensado Bão De Minas Semidesnatado 395g | leites | R$ 4.55 |
| 106 | p41 | Master | Café Torrado E Moído 3 Corações Peneirando Café 250g | cafe | R$ 32.90 |
| 107 | p42 | Master | Café 3 Corações Café/leite Cápsulas 90g | cafe | R$ 24.49 |
| 108 | p45 | Master | Café Moido Orgânico Native 250g | cafe | R$ 31.98 |
| 109 | p46 | Master | Café Torrado E Moído Melitta Tradicional 500g | cafe | R$ 28.99 |
| 110 | p47 | Master | Café Melitta Regiões Brasileiras Mogiana 250g | cafe | R$ 24.99 |
| 111 | p48 | Master | Café Liofilizado Orgânico Native 50g | cafe | R$ 24.98 |
| 112 | p49 | Master | Café Extra Forte Melitta 250g | cafe | R$ 16.99 |
| 113 | p241 | Stok | Café Melitta Torrado E Moído A Vácuo Tradicional 500g | cafe | R$ 26.99 |
| 114 | p242 | Stok | Café Bom Jesus Vácuo Torrado E Moído Tradicional 500g | cafe | R$ 23.49 |
| 115 | p243 | Stok | Café 3 Corações Vácuo Torrado Moído Tradicional 500g | cafe | R$ 21.99 |
| 116 | p244 | Stok | Café Melitta Regiões Sul De Minas 250g | cafe | R$ 23.49 |
| 117 | p245 | Stok | Café Melitta Torrado E Moído A Vacuo Extra Forte 500g | cafe | R$ 26.99 |
| 118 | p246 | Stok | Café Melitta Torrado E Moído Sabor Da Fazenda Tradicional 500g | cafe | R$ 29.49 |
| 119 | p247 | Stok | Café Iguaçu Solúvel Tradicional Leve 200g Pague 190g | cafe | R$ 21.90 |
| 120 | p248 | Stok | Café Bom Jesus Solúvel Sachê 40g | cafe | R$ 5.99 |
| 121 | p249 | Stok | Café Melitta Solúvel Tradicional 40g | cafe | R$ 6.65 |
| 122 | p250 | Stok | Café Melitta Regiões Cerrado 250g | cafe | R$ 23.49 |
| 123 | p441 | Stok | Café Melitta Torrado E Moído A Vácuo Tradicional 500g | cafe | R$ 26.99 |
| 124 | p442 | Stok | Café Bom Jesus Vácuo Torrado E Moído Tradicional 500g | cafe | R$ 23.49 |
| 125 | p443 | Stok | Café 3 Corações Vácuo Torrado Moído Tradicional 500g | cafe | R$ 21.99 |
| 126 | p444 | Stok | Café Melitta Regiões Sul De Minas 250g | cafe | R$ 23.49 |
| 127 | p445 | Stok | Café Melitta Torrado E Moído A Vacuo Extra Forte 500g | cafe | R$ 26.99 |
| 128 | p446 | Stok | Café Melitta Torrado E Moído Sabor Da Fazenda Tradicional 500g | cafe | R$ 29.49 |
| 129 | p447 | Stok | Café Iguaçu Solúvel Tradicional Leve 200g Pague 190g | cafe | R$ 21.90 |
| 130 | p448 | Stok | Café Bom Jesus Solúvel Sachê 40g | cafe | R$ 5.99 |
| 131 | p449 | Stok | Café Melitta Solúvel Tradicional 40g | cafe | R$ 6.65 |
| 132 | p450 | Stok | Café Melitta Regiões Cerrado 250g | cafe | R$ 23.49 |
| 133 | p62 | Master | Óleo Coco Qualicoco S/sabor 200ml | oleos | R$ 24.49 |
| 134 | p63 | Master | Óleo Côco Copra Spray 100ml Ext.virg. | oleos | R$ 51.90 |
| 135 | p65 | Master | Óleo Coco Copra S/sabor 200ml | oleos | R$ 27.98 |
| 136 | p67 | Master | Óleo Coco Coco Show Extra Virgem 500ml | oleos | R$ 49.90 |
| 137 | p70 | Master | Óleo Côco Sococo Ext.virg.200ml | oleos | R$ 19.99 |
| 138 | p261 | Stok | Óleo De Soja Coamo Tipo 1 900ml | oleos | R$ 8.09 |
| 139 | p265 | Stok | Óleo De Girassol Legítimo Tipo1 900ml | oleos | R$ 9.99 |
| 140 | p266 | Stok | Óleo De Girassol Soya Tipo 1 900ml | oleos | R$ 13.49 |
| 141 | p268 | Stok | Óleo De Soja Soya Tipo 1 900ml | oleos | R$ 8.29 |
| 142 | p461 | Stok | Óleo De Soja Coamo Tipo 1 900ml | oleos | R$ 8.09 |
| 143 | p465 | Stok | Óleo De Girassol Legítimo Tipo1 900ml | oleos | R$ 9.99 |
| 144 | p466 | Stok | Óleo De Girassol Soya Tipo 1 900ml | oleos | R$ 13.49 |
| 145 | p468 | Stok | Óleo De Soja Soya Tipo 1 900ml | oleos | R$ 8.29 |
| 146 | p9 | Atacadão | Molho de Tomate Quero Tradicional 240g | mercearia | R$ 1.89 |
| 147 | p10 | Atacadão | Açúcar Refinado Bulnez 1kg | mercearia | R$ 3.15 |
| 148 | p51 | Master | Açúcar Cristal Montare 5kg | mercearia | R$ 14.99 |
| 149 | p52 | Master | Açúcar Baunilha Monopol 500g | mercearia | R$ 16.29 |
| 150 | p53 | Master | Açúcar Demerara Caravelas 1kg | mercearia | R$ 5.89 |
| 151 | p54 | Master | Açúcar Refinado Caravelas 5kg | mercearia | R$ 19.90 |
| 152 | p55 | Master | Açúcar Mascavo Guimarães 500g | mercearia | R$ 7.99 |
| 153 | p56 | Master | Açúcar Cristal Colombo 1kg | mercearia | R$ 3.59 |
| 154 | p57 | Master | Açúcar Cristal Colombo 2kg | mercearia | R$ 8.29 |
| 155 | p58 | Master | Açúcar Orgânico Native Demerara 1kg | mercearia | R$ 10.99 |
| 156 | p59 | Master | Açúcar Baunilha Apti 100g | mercearia | R$ 3.49 |
| 157 | p60 | Master | Açúcar Refinado União 1kg | mercearia | R$ 4.69 |
| 158 | p64 | Master | Óleo Milho Soya 900ml | mercearia | R$ 15.99 |
| 159 | p72 | Master | Farinha Amendoim Geração Saude 500g | mercearia | R$ 21.49 |
| 160 | p73 | Master | Farinha Milho Yoki Kimilho 500g | mercearia | R$ 6.99 |
| 161 | p74 | Master | Farinha Berinjela Geração Saude 150g | mercearia | R$ 18.69 |
| 162 | p75 | Master | Farinha Kimilho Yoki Flocao 500g | mercearia | R$ 5.99 |
| 163 | p76 | Master | Farinha Yoki Kipolenta 500g | mercearia | R$ 7.39 |
| 164 | p77 | Master | Farinha Milho Beatriz Fina 1kg | mercearia | R$ 5.99 |
| 165 | p78 | Master | Farinha Neston Vitam.ban./pera/mor/400g | mercearia | R$ 18.99 |
| 166 | p79 | Master | Farinha Láctea Nestlé Sachê 210g | mercearia | R$ 12.99 |
| 167 | p80 | Master | Farinha Milho Yoki Amarela 500g | mercearia | R$ 8.99 |
| 168 | p81 | Master | Massa Fresca Romena Espaguete 500g | mercearia | R$ 7.99 |
| 169 | p82 | Master | Massa Ovos Sêmola Barilla 500g Linguine | mercearia | R$ 6.39 |
| 170 | p83 | Master | Massa Fresca Romena Penne 500g | mercearia | R$ 7.99 |
| 171 | p84 | Master | Massa P/pizza João Das Massas 200g | mercearia | R$ 6.29 |
| 172 | p85 | Master | Massa P/pastel Italiany 200g | mercearia | R$ 4.99 |
| 173 | p86 | Master | Massa P/pastel Italiany 1kg | mercearia | R$ 15.49 |
| 174 | p87 | Master | Massa Caseiro Germani Talharim Largo 500g | mercearia | R$ 8.19 |
| 175 | p88 | Master | Massa Paganini Rigatoni 500g | mercearia | R$ 12.89 |
| 176 | p89 | Master | Massa P/pastel Romena 500g | mercearia | R$ 5.99 |
| 177 | p90 | Master | Massa Caseiro P/pastel Italiany 650g | mercearia | R$ 10.79 |
| 178 | p251 | Stok | Açúcar Alto Alegre Refinado 1kg | mercearia | R$ 4.05 |
| 179 | p252 | Stok | Açúcar Gasparin Cristal 2kg | mercearia | R$ 6.65 |
| 180 | p253 | Stok | Açúcar Gasparin Cristal 1kg | mercearia | R$ 3.49 |
| 181 | p254 | Stok | Açúcar Caravelas Refinado 1kg | mercearia | R$ 4.15 |
| 182 | p255 | Stok | Açúcar União Naturale Demerara 1kg | mercearia | R$ 6.09 |
| 183 | p256 | Stok | Açúcar Gasparin Mascavo 500g | mercearia | R$ 5.89 |
| 184 | p257 | Stok | Açúcar Gasparin Mascavo 1kg | mercearia | R$ 12.05 |
| 185 | p258 | Stok | Açúcar Caravelas Refinado 5kg | mercearia | R$ 19.29 |
| 186 | p259 | Stok | Açúcar União Refinado 1kg | mercearia | R$ 4.55 |
| 187 | p260 | Stok | Açúcar Gasparin Demerara 1kg | mercearia | R$ 4.25 |
| 188 | p262 | Stok | Oleo De Algodão Soya Tipo 1 Uso Profissional 14,5kg | mercearia | R$ 207.99 |
| 189 | p263 | Stok | Oleo Nivea Banho Relaxante 200ml | mercearia | R$ 47.99 |
| 190 | p264 | Stok | Óleo Olívia Composto De Soja E Oliva Tradicional 500ml | mercearia | R$ 19.99 |
| 191 | p267 | Stok | Óleo De Coco Qualicoco Extra Virgem 200ml | mercearia | R$ 18.99 |
| 192 | p269 | Stok | Óleo De Algodão Saúde Tipo1 900ml | mercearia | R$ 11.39 |
| 193 | p270 | Stok | Óleo Canola Soya Tipo1 900ml | mercearia | R$ 13.09 |
| 194 | p280 | Stok | Farinha De Mandioca Fritz & Frida Branca Fina Tipo 1 500g | mercearia | R$ 4.09 |
| 195 | p281 | Stok | Massa Monte Viso Com Ovos Parafuso 500g | mercearia | R$ 3.09 |
| 196 | p282 | Stok | Massa Isabela Sêmola Sem Ovos Espaguete 400g | mercearia | R$ 3.39 |
| 197 | p283 | Stok | Massa Isabela Sêmola Sem Ovos Parafuso 400g | mercearia | R$ 3.39 |
| 198 | p284 | Stok | Massa Monte Viso Com Ovos Espaguete 500g | mercearia | R$ 3.09 |
| 199 | p285 | Stok | Massa Orquídea De Sêmola Com Ovos Parafuso 500g | mercearia | R$ 3.79 |
| 200 | p286 | Stok | Massa Orquídea Sêmola Espaguete Com Ovos 500g | mercearia | R$ 3.79 |
| 201 | p287 | Stok | Massa Orquídea Sêmola Com Ovos Rigatone 500g | mercearia | R$ 3.79 |
| 202 | p288 | Stok | Massa Orquídea Sêmola Com Ovos Tortiglione 500g | mercearia | R$ 3.79 |
| 203 | p289 | Stok | Massa Orquídea Mais Molho Rigatone Riscado Com Ovo 400g | mercearia | R$ 4.35 |
| 204 | p290 | Stok | Massa Pilar Macarrão Semola Espaguete Fino 400g | mercearia | R$ 2.39 |
| 205 | p451 | Stok | Açúcar Alto Alegre Refinado 1kg | mercearia | R$ 4.05 |
| 206 | p452 | Stok | Açúcar Gasparin Cristal 2kg | mercearia | R$ 6.65 |
| 207 | p453 | Stok | Açúcar Gasparin Cristal 1kg | mercearia | R$ 3.49 |
| 208 | p454 | Stok | Açúcar Caravelas Refinado 1kg | mercearia | R$ 4.15 |
| 209 | p455 | Stok | Açúcar União Naturale Demerara 1kg | mercearia | R$ 6.09 |
| 210 | p456 | Stok | Açúcar Gasparin Mascavo 500g | mercearia | R$ 5.89 |
| 211 | p457 | Stok | Açúcar Gasparin Mascavo 1kg | mercearia | R$ 12.05 |
| 212 | p458 | Stok | Açúcar Caravelas Refinado 5kg | mercearia | R$ 19.29 |
| 213 | p459 | Stok | Açúcar União Refinado 1kg | mercearia | R$ 4.55 |
| 214 | p460 | Stok | Açúcar Gasparin Demerara 1kg | mercearia | R$ 4.25 |
| 215 | p462 | Stok | Oleo De Algodão Soya Tipo 1 Uso Profissional 14,5kg | mercearia | R$ 207.99 |
| 216 | p463 | Stok | Oleo Nivea Banho Relaxante 200ml | mercearia | R$ 47.99 |
| 217 | p464 | Stok | Óleo Olívia Composto De Soja E Oliva Tradicional 500ml | mercearia | R$ 19.99 |
| 218 | p467 | Stok | Óleo De Coco Qualicoco Extra Virgem 200ml | mercearia | R$ 18.99 |
| 219 | p469 | Stok | Óleo De Algodão Saúde Tipo1 900ml | mercearia | R$ 11.39 |
| 220 | p470 | Stok | Óleo Canola Soya Tipo1 900ml | mercearia | R$ 13.09 |
| 221 | p480 | Stok | Farinha De Mandioca Fritz & Frida Branca Fina Tipo 1 500g | mercearia | R$ 4.09 |
| 222 | p481 | Stok | Massa Monte Viso Com Ovos Parafuso 500g | mercearia | R$ 3.09 |
| 223 | p482 | Stok | Massa Isabela Sêmola Sem Ovos Espaguete 400g | mercearia | R$ 3.39 |
| 224 | p483 | Stok | Massa Isabela Sêmola Sem Ovos Parafuso 400g | mercearia | R$ 3.39 |
| 225 | p484 | Stok | Massa Monte Viso Com Ovos Espaguete 500g | mercearia | R$ 3.09 |
| 226 | p485 | Stok | Massa Orquídea De Sêmola Com Ovos Parafuso 500g | mercearia | R$ 3.79 |
| 227 | p486 | Stok | Massa Orquídea Sêmola Espaguete Com Ovos 500g | mercearia | R$ 3.79 |
| 228 | p487 | Stok | Massa Orquídea Sêmola Com Ovos Rigatone 500g | mercearia | R$ 3.79 |
| 229 | p488 | Stok | Massa Orquídea Sêmola Com Ovos Tortiglione 500g | mercearia | R$ 3.79 |
| 230 | p489 | Stok | Massa Orquídea Mais Molho Rigatone Riscado Com Ovo 400g | mercearia | R$ 4.35 |
| 231 | p490 | Stok | Massa Pilar Macarrão Semola Espaguete Fino 400g | mercearia | R$ 2.39 |
| 232 | p61 | Master | Óleo Kalipto Eucalipto 120ml | limpeza | R$ 18.79 |
| 233 | p66 | Master | Óleo De Peroba King Restaurador Madeira Avermelhada 200ml | limpeza | R$ 26.49 |
| 234 | p69 | Master | Óleo Lubrificante King Multiuso 100ml | limpeza | R$ 7.99 |
| 235 | p111 | Master | Sabão Barra Font Glicerinado Jeans 200g | limpeza | R$ 3.49 |
| 236 | p112 | Master | Sabão Barra Ypê Neutro 180g | limpeza | R$ 4.99 |
| 237 | p113 | Master | Sabão Barra Girando Sol Glicerinado Glicerina 400g | limpeza | R$ 5.99 |
| 238 | p114 | Master | Sabão Barra Vanish Super 75g | limpeza | R$ 7.99 |
| 239 | p115 | Master | Sabão Barra Ypê Aloe Vera 5x180g | limpeza | R$ 18.99 |
| 240 | p116 | Master | Sabão Barra Ypê Neutro 5x180g | limpeza | R$ 18.99 |
