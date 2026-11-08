# Limpeza do catálogo (`frontend/src/data.js`)

Relatório gerado por `scraper/limpar_catalogo.py` na execução que alterou o catálogo. Rodar o script de novo sobre o arquivo já limpo não altera nada (`python scraper/limpar_catalogo.py --verificar` sai com 0), por isso este texto é um registro da execução original e não é reescrito. Origem das correções: auditoria do catálogo e da coleta.

Os ids `p<N>` são estáveis: as linhas removidas deixam buracos na numeração e nenhuma foi renumerada (favoritos e o mescla com a API dependem deles).

## Resumo

- Linhas em `PRODUCTS`: **9406 -> 9277** (129 removidas).
- Cópias exatas removidas: **120**; linhas híbridas com preço simulado removidas: **9**.
- Categorias corrigidas: **680** itens (azeite_vinagre 7, bazar_casa 108, bazar_descartavel 3, higiene 101, limpeza 42, massa_fresca 49, massa_seca 236, pet 134).
- Unidades 1000x corrigidas: **13**; nomes com encoding quebrado corrigidos: **5**.

Linhas por rede de origem:

| Rede | Antes | Depois | Removidas |
|---|---|---|---|
| Asun Supermercados | 3367 | 3367 | 0 |
| Atacadão | 5 | 5 | 0 |
| Fort Atacadista | 5514 | 5514 | 0 |
| Master | 120 | 120 | 0 |
| Rissul | 88 | 80 | 8 |
| Stok Center | 237 | 118 | 119 |
| Zaffari | 75 | 73 | 2 |

## 1. Cópias exatas (mesma rede + idOrigem)

Critério para escolher a linha que fica, em ordem: (1) foto coerente com a origem (o arquivo local se chama `<idOrigem>_<hash>`); (2) tem foto; (3) primeira ocorrência. O catálogo não guarda data de coleta, então "preço mais recente" não é mensurável e nunca foi usado como critério.

| Removida | Mantida | Rede | Nome |
|---|---|---|---|
| p411 | p211 | Stok Center | Arroz Blue Ville Branco Tipo 1 5kg |
| p412 | p212 | Stok Center | Arroz Blue Ville Branco Tipo 1 1kg |
| p413 | p213 | Stok Center | Arroz Rozcato Branco Tipo 1 1kg |
| p414 | p214 | Stok Center | Arroz Tordilho Branco Tipo 1 5kg |
| p415 | p215 | Stok Center | Arroz Blue Ville Parboilizado Tipo1 5kg |
| p416 | p216 | Stok Center | Arroz Blue Ville Parboilizado Tipo1 1kg |
| p417 | p217 | Stok Center | Arroz Rei Arthur Para Cozinha Japonesa Grãos Curtos Tipo 1 1kg |
| p418 | p218 | Stok Center | Arroz Áurea Branco Tipo 1 5kg |
| p419 | p219 | Stok Center | Arroz Tordilho Branco Tipo 1 1kg |
| p420 | p220 | Stok Center | Arroz Rozcato Parboilizado Tipo 1 1kg |
| p421 | p221 | Stok Center | Feijão Fritz & Frida Preto Premium Tipo 1 1kg |
| p422 | p222 | Stok Center | Feijão Tordilho Preto Tipo 1 1kg |
| p423 | p223 | Stok Center | Feijão Fritz & Frida Vermelho Premium Tipo 1 500g |
| p424 | p224 | Stok Center | Feijão Arbaza Carioca Tipo 1 1kg |
| p425 | p225 | Stok Center | Feijão Big Bom Preto Tipo 1 1kg |
| p426 | p226 | Stok Center | Feijão Caldo Ouro Vermelho Tipo 1 1kg |
| p427 | p227 | Stok Center | Feijão Fritz & Frida Carioca Tipo 1 500g |
| p428 | p228 | Stok Center | Feijão Caldão Preto Tipo 1 1kg |
| p429 | p229 | Stok Center | Feijão Fritz & Frida Preto Tipo 1 500g |
| p430 | p230 | Stok Center | Feijão Arbaza Branco Tipo1 500g |
| p431 | p231 | Stok Center | Leite Elegê Uht Integral 1l |
| p434 | p234 | Stok Center | Leite Italac Uht Zero Lactose 1l |
| p435 | p235 | Stok Center | Leite Condensado Elegê Semidesnatado 395g |
| p436 | p236 | Stok Center | Leite Nestlé Ninho Uht Integral Forti+ 1l |
| p437 | p237 | Stok Center | Leite Elegê Uht Desnatado 1l |
| p438 | p238 | Stok Center | Leite Italac Uht Semidesnatado 1l |
| p439 | p239 | Stok Center | Leite Condensado Italac Semidesnatado 395g |
| p440 | p240 | Stok Center | Leite Condensado Bão De Minas Semidesnatado 395g |
| p441 | p241 | Stok Center | Café Melitta Torrado E Moído A Vácuo Tradicional 500g |
| p442 | p242 | Stok Center | Café Bom Jesus Vácuo Torrado E Moído Tradicional 500g |
| p443 | p243 | Stok Center | Café 3 Corações Vácuo Torrado Moído Tradicional 500g |
| p444 | p244 | Stok Center | Café Melitta Regiões Sul De Minas 250g |
| p445 | p245 | Stok Center | Café Melitta Torrado E Moído A Vacuo Extra Forte 500g |
| p446 | p246 | Stok Center | Café Melitta Torrado E Moído Sabor Da Fazenda Tradicional 500g |
| p447 | p247 | Stok Center | Café Iguaçu Solúvel Tradicional Leve 200g Pague 190g |
| p448 | p248 | Stok Center | Café Bom Jesus Solúvel Sachê 40g |
| p449 | p249 | Stok Center | Café Melitta Solúvel Tradicional 40g |
| p450 | p250 | Stok Center | Café Melitta Regiões Cerrado 250g |
| p451 | p251 | Stok Center | Açúcar Alto Alegre Refinado 1kg |
| p452 | p252 | Stok Center | Açúcar Gasparin Cristal 2kg |
| p453 | p253 | Stok Center | Açúcar Gasparin Cristal 1kg |
| p454 | p254 | Stok Center | Açúcar Caravelas Refinado 1kg |
| p455 | p255 | Stok Center | Açúcar União Naturale Demerara 1kg |
| p456 | p256 | Stok Center | Açúcar Gasparin Mascavo 500g |
| p457 | p257 | Stok Center | Açúcar Gasparin Mascavo 1kg |
| p458 | p258 | Stok Center | Açúcar Caravelas Refinado 5kg |
| p459 | p259 | Stok Center | Açúcar União Refinado 1kg |
| p460 | p260 | Stok Center | Açúcar Gasparin Demerara 1kg |
| p461 | p261 | Stok Center | Óleo De Soja Coamo Tipo 1 900ml |
| p462 | p262 | Stok Center | Oleo De Algodão Soya Tipo 1 Uso Profissional 14,5kg |
| p463 | p263 | Stok Center | Oleo Nivea Banho Relaxante 200ml |
| p464 | p264 | Stok Center | Óleo Olívia Composto De Soja E Oliva Tradicional 500ml |
| p465 | p265 | Stok Center | Óleo De Girassol Legítimo Tipo1 900ml |
| p466 | p266 | Stok Center | Óleo De Girassol Soya Tipo 1 900ml |
| p467 | p267 | Stok Center | Óleo De Coco Qualicoco Extra Virgem 200ml |
| p468 | p268 | Stok Center | Óleo De Soja Soya Tipo 1 900ml |
| p469 | p269 | Stok Center | Óleo De Algodão Saúde Tipo1 900ml |
| p470 | p270 | Stok Center | Óleo Canola Soya Tipo1 900ml |
| p471 | p271 | Stok Center | Farinha De Trigo Nordeste Tipo1 1kg |
| p472 | p272 | Stok Center | Farinha De Trigo Gardênia Tipo 2 1kg |
| p473 | p273 | Stok Center | Farinha De Trigo Panfácil Tradicional 5kg |
| p474 | p274 | Stok Center | Farinha De Trigo Gardênia Tipo 2 5kg |
| p475 | p275 | Stok Center | Farinha De Trigo Tordilho 1kg |
| p476 | p276 | Stok Center | Farinha De Trigo Biondina Tipo1 1kg |
| p477 | p277 | Stok Center | Farinha De Milho Tordilho Média 1kg |
| p478 | p278 | Stok Center | Farinha De Trigo Panfácil Tipo 1 1kg |
| p479 | p279 | Stok Center | Farinha De Milho Beatriz Média 1kg |
| p480 | p280 | Stok Center | Farinha De Mandioca Fritz & Frida Branca Fina Tipo 1 500g |
| p481 | p281 | Stok Center | Massa Monte Viso Com Ovos Parafuso 500g |
| p482 | p282 | Stok Center | Massa Isabela Sêmola Sem Ovos Espaguete 400g |
| p483 | p283 | Stok Center | Massa Isabela Sêmola Sem Ovos Parafuso 400g |
| p484 | p284 | Stok Center | Massa Monte Viso Com Ovos Espaguete 500g |
| p485 | p285 | Stok Center | Massa Orquídea De Sêmola Com Ovos Parafuso 500g |
| p486 | p286 | Stok Center | Massa Orquídea Sêmola Espaguete Com Ovos 500g |
| p487 | p287 | Stok Center | Massa Orquídea Sêmola Com Ovos Rigatone 500g |
| p488 | p288 | Stok Center | Massa Orquídea Sêmola Com Ovos Tortiglione 500g |
| p489 | p289 | Stok Center | Massa Orquídea Mais Molho Rigatone Riscado Com Ovo 400g |
| p490 | p290 | Stok Center | Massa Pilar Macarrão Semola Espaguete Fino 400g |
| p491 | p291 | Stok Center | Cerveja Proibida Pilsen 550ml |
| p492 | p292 | Stok Center | Cerveja Stella Artois Pure Gold Long Neck 330ml |
| p493 | p293 | Stok Center | Cerveja Heineken Ultimate Sem Glúten Long Neck 330ml |
| p494 | p294 | Stok Center | Cerveja Amstel Ultra Puro Malte Sem Glúten 473ml |
| p495 | p295 | Stok Center | Cerveja Budweiser 473ml |
| p496 | p296 | Stok Center | Cerveja Original 473ml |
| p497 | p297 | Stok Center | Cerveja Heineken Long Neck 250ml |
| p498 | p298 | Stok Center | Cerveja Província Lager Ultra Gold Sem Glúten 473ml |
| p499 | p299 | Stok Center | Cerveja Roleta Russa Ipa Easy Sem Glúten 473ml |
| p500 | p300 | Stok Center | Cerveja Spaten Puro Malte Munich Helles 473ml |
| p501 | p301 | Stok Center | Refrigerante Coca Cola Sem Açúcar 2l |
| p502 | p302 | Stok Center | Refrigerante Coca Cola 2l |
| p503 | p303 | Stok Center | Refrigerante Pepsi Black Sem Açúcar 2l |
| p504 | p304 | Stok Center | Refrigerante Fruki Guaraná Zero 200ml |
| p505 | p305 | Stok Center | Refrigerante Coca Cola 600ml |
| p506 | p306 | Stok Center | Refrigerante Fanta Laranja 2l |
| p507 | p307 | Stok Center | Refrigerante Coca Cola Zero Açúcar 350ml |
| p508 | p308 | Stok Center | Refrigerante Fruki Guaraná 3l |
| p509 | p309 | Stok Center | Refrigerante Coca Cola Zero Açucar 200ml |
| p510 | p310 | Stok Center | Refrigerante Coca Cola 200ml |
| p511 | p311 | Stok Center | Sabão Em Barra Ypê Glicerinado Neutro Original Com 5 Unidades De 160g |
| p512 | p312 | Stok Center | Sabão Em Barra Ypê Glicerinado Aloe Vera Com 5 Unidades De 160g |
| p513 | p313 | Stok Center | Sabão Em Barra Girando Sol Glicerina 400g |
| p514 | p314 | Stok Center | Sabão Em Barra Ypê Glicerinado Neutro Original 160g |
| p515 | p315 | Stok Center | Sabão Em Barra Girando Sol Limpeza Pesada Tradicional 900g Com 5 Unidades |
| p516 | p316 | Stok Center | Sabão Em Barra Assim Glicerinado Neutro Com 5 Unidades De 160g |
| p517 | p317 | Stok Center | Sabão Em Barra Assim Glicerinado De Coco Com 5 Unidades De 160g |
| p518 | p318 | Stok Center | Sabão Em Barra Ypê Perfumado Fresh Com 5 Unidades De 160g |
| p519 | p319 | Stok Center | Sabão Em Barra Girando Sol Ação Total 180g |
| p520 | p320 | Stok Center | Sabão Em Barra Assim Glicerinado Coco 160g |
| p521 | p321 | Stok Center | Carne Moída Nova Itaberaba Congelada 1kg |
| p522 | p322 | Stok Center | Carne Bovina Anselmi Moída Resfriada 300g |
| p523 | p323 | Stok Center | Carne Suína Costela Congelada Kg (aprox 1kg) |
| p524 | p324 | Stok Center | Carne Bovina Best Beef Moída 100% Bovina Resfriada 300g |
| p525 | p325 | Stok Center | Carne Bovina Best Beef Moída Patinho Resfriada 300g |
| p526 | p326 | Stok Center | Carne Bovina Best Beef Panela Acém Congelada 500g |
| p527 | p327 | Stok Center | Carne Moída Nova Itaberaba Congelada 500g |
| p528 | p328 | Stok Center | Carne Bovina Bordon Picanha Fatiada Congelada Kg (aprox 0,500g) |
| p529 | p329 | Stok Center | Carne Frango Ave Serra Moída Congelada 700g |
| p530 | p330 | Stok Center | Carne Bovina Maminha Congelada Kg (aprox 1,7kg) |
| p362 | p361 | Zaffari | Pão Cacetinho Pão Francês Zaffari |
| p363 | p361 | Zaffari | Pão Cacetinho Pão Francês Zaffari |

### Grupos com preço divergente entre as cópias

Decisão explícita para cada um: a linha mantida é a genuína da rede (foto e arquivo coerentes com o idOrigem); a removida é a híbrida, descrita na seção 2.

| Chave (rede, idOrigem) | Mantida | Critério | Preços por id |
|---|---|---|---|
| Rissul, 616461 | p131 | coerencia_com_a_origem | p131: rissul 3,29; p338: rissul 3,86 |
| Rissul, 2199634 | p154 | coerencia_com_a_origem | p154: rissul 5,39; p232: rissul 5,60; p432: rissul 5,60 |
| Rissul, 2174181 | p155 | coerencia_com_a_origem | p155: rissul 4,89; p233: rissul 4,84; p433: rissul 4,84 |
| Rissul, 20848 | p171 | coerencia_com_a_origem | p171: rissul 6,79; p393: rissul 5,09 |
| Rissul, 28899 | p178 | coerencia_com_a_origem | p178: rissul 15,98; p392: rissul 20,30 |
| Rissul, 26611 | p179 | coerencia_com_a_origem | p179: rissul 9,98; p396: rissul 10,18 |
| Stok Center, 26455 | p304 | coerencia_com_a_origem | p304: stok 1,75; p349: stok 1,65; p504: stok 1,75 |

## 2. Linhas híbridas com preço simulado e rede de origem trocada

Cada uma foi confirmada nos dados antes de sair: tem a mesma rede + idOrigem + URL de uma linha genuína que continua no catálogo, a foto é de OUTRA rede (nome de arquivo com outro id e CDN diferente) e o preço difere do da linha genuína (ex.: p392 custa R$ 20,30 sem promoção, com precoNormal 15,98). As linhas reais já existem em outros ids.

| Removida | Rede | Nome | Preço da híbrida | precoNormal da híbrida | Linha real mantida | Arquivo da foto (de outro id) | idOrigem |
|---|---|---|---|---|---|---|---|
| p338 | Rissul | Açúcar Refinado Caravelas 1kg | rissul 3,86 | 3,95 | p131: rissul 3,29 | 1014575_0eeeb1558fb4.jpg | 616461 |
| p232 | Rissul | Leite Elegê Uht Semidesnatado Zero Lactose 1l | rissul 5,60 | 5,39 | p154: rissul 5,39 | 22628_73ef24963b79.jpg | 2199634 |
| p432 | Rissul | Leite Elegê Uht Semidesnatado Zero Lactose 1l | rissul 5,60 | 5,39 | p154: rissul 5,39 | 22628_73ef24963b79.jpg | 2199634 |
| p233 | Rissul | Leite Italac Uht Integral 1l | rissul 4,84 | 4,89 | p155: rissul 4,89 | 6271_60f308dcda41.jpg | 2174181 |
| p433 | Rissul | Leite Italac Uht Integral 1l | rissul 4,84 | 4,89 | p155: rissul 4,89 | 6271_60f308dcda41.jpg | 2174181 |
| p393 | Rissul | Cenoura | rissul 5,09 | 6,79 | p171: rissul 6,79 | 1001878_0ec4717ea5d3.jpg | 20848 |
| p392 | Rissul | Tomate Italiano | rissul 20,30 | 15,98 | p178: rissul 15,98 | 1007601_f81b92b0bd31.jpg | 28899 |
| p396 | Rissul | Maçã Fuji | rissul 10,18 | 9,98 | p179: rissul 9,98 | 1001924_f498d7a43863.jpg | 26611 |
| p349 | Stok Center | Refrigerante Fruki Guaraná Zero 200ml | stok 1,65 | 1,75 | p304: stok 1,75 | 1087562_f56e7d53446f.jpg | 26455 |

## 3. Categoria por palavra inteira

Regras com palavra inteira (`\b`), texto sem acento e prioridade por TIPO: higiene, limpeza, pet e bazar vencem azeite/vinagre e massas; dentro do grupo vale a palavra-tipo que aparece primeiro no nome. Só usa categorias que já existem; item que já está numa categoria aceita pela regra não é mexido. Pet não tem categoria própria e foi para `bazar` (fora da categoria alimentar); criar `pet` é decisão do grupo.

| Regra | Destino | Itens |
|---|---|---|
| pet | bazar | 134 |
| higiene | higiene | 101 |
| limpeza | limpeza | 42 |
| bazar_casa | bazar | 108 |
| bazar_descartavel | bazar | 3 |
| azeite_vinagre | oleos | 7 |
| massa_fresca | congelados | 49 |
| massa_seca | mercearia | 236 |

Antes e depois de cada item:

| Id | Nome | Antes | Depois | Regra |
|---|---|---|---|---|
| p701 | Coador de pano para café Stolf | cafe | bazar | bazar_casa |
| p702 | Suporte Plástico para Filtro de Café Tamanho 102 | cafe | bazar | bazar_casa |
| p1481 | Arroz Realengo Para Cães 5kg | graos | bazar | pet |
| p1589 | Esmalte Risqué cappuccino 8ml | cafe | higiene | higiene |
| p1617 | Esmalte Risqué Cappuccino Cremoso 8ml | cafe | higiene | higiene |
| p1633 | Cafeteira Cadence Desperta 18 Cafés 220V | cafe | bazar | bazar_casa |
| p1634 | Sabonete Palmolive 85g Café Óleo Amendoas | cafe | higiene | higiene |
| p1635 | Sabonete Palmolive 150g Café Óleo Amendoas | cafe | higiene | higiene |
| p1720 | Oxford Xicara Chá 200ml C/pires Chá das 5 | cafe | bazar | bazar_casa |
| p1721 | Colher de chá polyood vermelho | cafe | bazar | bazar_casa |
| p1722 | Colher para chá Ipanema vermelho | cafe | bazar | bazar_casa |
| p1724 | Oxford Xicara Chá 200ml C/pires White | cafe | bazar | bazar_casa |
| p1725 | Colher de chá polyood castanho Tramontina | cafe | bazar | bazar_casa |
| p1726 | Limpador Concentrado Chá Branco Coala 120ml | cafe | limpeza | limpeza |
| p1727 | Oxford Prato Raso 26cm Chá das 5 | cafe | bazar | bazar_casa |
| p1728 | Oxford Prato Fundo 21,5cm Chá das 5 | cafe | bazar | bazar_casa |
| p1729 | Oxford Prato Sobremesa 18cm Chá das 5 | cafe | bazar | bazar_casa |
| p1733 | Varal De Chão Mor Slim sem abas | mercearia | bazar | bazar_casa |
| p1738 | Ração Para Cão Champ Sabor Frango 85g | carnes | bazar | pet |
| p1739 | Papel Sulfite A4 Chamequinho Com 100 Unidades | mercearia | bazar | bazar_casa |
| p1746 | Taça para champagne Nadir Figueiredo Bistrô 186ml | mercearia | bazar | bazar_casa |
| p1749 | Ração Para Cão Filhote Champ Sabor Frango 85g | carnes | bazar | pet |
| p1752 | Ração Úmida Champ para Cães Adultos Sabor Caseiro Carne 85g | carnes | bazar | pet |
| p1754 | Alimento para Cães Filhotes Carne & Cereal Champ Sabor de Casa Pacote 900g | carnes | bazar | pet |
| p1755 | Alimento para Cães Adultos Carne & Cereal Champ Sabor de Casa Pacote 900g | carnes | bazar | pet |
| p1803 | Petisco Para Cães Pedigree Tasty Bites Leite 80g | leites | bazar | pet |
| p1804 | Bifinho Para Cães Keldog Mini Bites Carne & Leite 50g | leites | bazar | pet |
| p1863 | Ração para Gatos Whiskas Filhotes Carne e Leite 900g | leites | bazar | pet |
| p1866 | Desodorante Roll-On Dove Fresh Care Pêssego e Leite 50ml Unidade | leites | higiene | higiene |
| p1868 | Ração para Cães Purina Alpo Filhotes Carne, Leite e Cereais 10,1kg | leites | bazar | pet |
| p1869 | Ração Alpo Cães Filhotes Carne, Frango, Cereais, Vegetais e Leite 1kg | leites | bazar | pet |
| p1870 | Ração Seca para Cães Filhotes Buzz Sabor Carne e Leite Saco 1kg | leites | bazar | pet |
| p1871 | Ração Úmida para Cães Filhotes Dog Chow Carne e Leite Sachê 85g | leites | bazar | pet |
| p1872 | Ração para Cães Pedigree Adulto +9 Nutrição Essencial Carne ao Leite 10,1kg | leites | bazar | pet |
| p1876 | Panela Fervedor/Leiteira Panelux Polido 1,6L | leites | bazar | bazar_casa |
| p1981 | Shampoo Infantil Huggies Chá de Camomila 200ml | cafe | higiene | higiene |
| p1991 | Sabonete Líquido Infantil Huggies Chá de Camomila 200ml | cafe | higiene | higiene |
| p1994 | Sabonete em Barra Infantil Huggies Chá de Camomila 75g | cafe | higiene | higiene |
| p1998 | Ração para Cães Champ Sachê Carne 85g | carnes | bazar | pet |
| p1999 | Ração para Cães Champ Sachê Frango 85g | carnes | bazar | pet |
| p2002 | Vela Junco Chá Revelação Azul | cafe | bazar | bazar_casa |
| p2003 | Vela Junco Chá Revelação Rosa | cafe | bazar | bazar_casa |
| p2004 | Desumidificador Chá Branco Secar 180g | cafe | limpeza | limpeza |
| p2005 | Peneira para Chá Plasvale Média Unidade | cafe | bazar | bazar_casa |
| p2006 | Limpador Perfumado Secar Chá Branco 120ml | cafe | limpeza | limpeza |
| p2007 | Difusor de Aromas Coala Chá Branco 100ml | cafe | limpeza | limpeza |
| p2008 | Difusor de Aromas Secar Chá Branco 100ml | cafe | limpeza | limpeza |
| p2009 | Difusor de Aromas Glade 100ml Chá Branco | cafe | limpeza | limpeza |
| p2010 | Sabonete Orgânica Chá Branco e Gengibre 90g | cafe | higiene | higiene |
| p2011 | Purificador de Ambiente Secar Chá Branco 360ml | cafe | limpeza | limpeza |
| p2012 | Aromatizante de Ambiente Coala Chá Branco 120ml Frasco | cafe | limpeza | limpeza |
| p2013 | Aromatizador de Ambiente Glade Chá Branco Borrifador 265ml | cafe | limpeza | limpeza |
| p2014 | Purificador de Ar Chá Branco Puro Ar 600ml Aerossol | cafe | limpeza | limpeza |
| p2015 | Limpador Perfumado UAU Chá Branco 1,8L Frasco Leve Mais Pague Menos | cafe | limpeza | limpeza |
| p2016 | DIF.SECAR 100ML CHA VDE. | cafe | limpeza | limpeza |
| p2017 | Colher Descartável Strawplast Café, Chá e Doces Cristal Com 200 Unidades | cafe | bazar | bazar_casa |
| p2018 | DESUMIDIF.SECAR 180G CHA VDE | cafe | limpeza | limpeza |
| p2019 | Brinquedo Conjunto Chá com Biscoito Doce Cozinha Cardoso Unidade | cafe | bazar | bazar_casa |
| p2035 | Taça de Champanhe Bohemia Xtra em Cristal 210ml | mercearia | bazar | bazar_casa |
| p2043 | Taça Vidro Nadir Figueiredo Windsor Champagne 210ml | mercearia | bazar | bazar_casa |
| p2052 | Ração para Cães Champ Adultos Carne e Cereal 18kg | carnes | bazar | pet |
| p2054 | Taça para Espumante e Champanhe de Cristal Pasabahce 220ml | mercearia | bazar | bazar_casa |
| p2917 | Abridor de lata Q-Util | mercearia | bazar | bazar_casa |
| p2934 | Pomada Preventiva de Assaduras Original Hipoglós Caixa 40g | mercearia | higiene | higiene |
| p3113 | Cafeteira Elétrica Britânia BCF19A 18 Xícaras 220V | cafe | bazar | bazar_casa |
| p3122 | Chinelo Havaianas Café 39/40 Top | cafe | bazar | bazar_casa |
| p3123 | Chinelo Havaianas Café 41/42 Top | cafe | bazar | bazar_casa |
| p3125 | Prato Veneza West Garden 12cm Café | cafe | bazar | bazar_casa |
| p3126 | Prato Veneza West Garden 18cm Café | cafe | bazar | bazar_casa |
| p3127 | Vaso Veneza West Garden 20x17cm Café | cafe | bazar | bazar_casa |
| p3128 | Vaso Veneza West Garden 15x15cm Café | cafe | bazar | bazar_casa |
| p3129 | Tintura Beauty Color 5.7 Chocolate Café | cafe | higiene | higiene |
| p3130 | Chinelo Havaianas 39/40 Café Slim Animals | cafe | bazar | bazar_casa |
| p3131 | Chinelo Havaianas 35/36 Café Slim Animals | cafe | bazar | bazar_casa |
| p3132 | Chinelo Havaianas 37/38 Café Slim Animals | cafe | bazar | bazar_casa |
| p3135 | Sabonete Líquido Bello Flor de Café 850ml Refil | cafe | higiene | higiene |
| p3160 | Sabonete em Barra Palmolive Naturals Café e Óleo de Amêndoas 150g | cafe | higiene | higiene |
| p3161 | Sabonete em Barra Palmolive Naturals Café e Óleo de Amêndoas 85g | cafe | higiene | higiene |
| p3163 | Kit Café Prático Unitermi com Garrafa Térmica e Suporte para Filtro | cafe | bazar | bazar_casa |
| p3174 | Jogo de Xícaras de Café Casa Tem Morocc Honey 90ml Caixa com 6 Unidades | cafe | bazar | bazar_casa |
| p3176 | Chinelo Havaianas Café 37/38 Top | cafe | bazar | bazar_casa |
| p3178 | Jogo de Xícaras para Café Brasília 90ml com 5 unidades | cafe | bazar | bazar_casa |
| p3198 | Papel Manteiga Royalpack Manteiguinha 30cm X 4m | leites | bazar | bazar_descartavel |
| p3199 | Sabonete Palmolive Jasmim e Manteiga de Cacau 150g | leites | higiene | higiene |
| p3237 | Papel Manteiga Wyda 29x7,5M | leites | bazar | bazar_descartavel |
| p3238 | Papel Manteiga Wyda 29X50cm | leites | bazar | bazar_descartavel |
| p3240 | Sabonete Dove Manteiga Karité 90g com 8 Unidades | leites | higiene | higiene |
| p3245 | Sabonete Nivea em Barra Manteiga de Cacau e Jasmim 80g | leites | higiene | higiene |
| p3275 | Caixa de Som Amplificada Philco PCX3800 Bivolt | mercearia | bazar | bazar_casa |
| p3282 | Caixa de Isopor Knauf Térmica com Alça 17L | mercearia | bazar | bazar_casa |
| p3295 | Jogo de Copos de Vidro Durax 420ml Caixa com 6 Unidades | mercearia | bazar | bazar_casa |
| p3296 | Jogo de Copos de Vidro Durax 350ml Caixa com 6 Unidades | mercearia | bazar | bazar_casa |
| p3297 | Lasanha Renata Massa de Sêmola com Ovos Caixa 500g | leites | congelados | massa_fresca |
| p3298 | Caixa para Cesta de Natal Pequena Impresso Modelo SDB | leites | bazar | bazar_casa |
| p3299 | Caixa para Cesta de Natal Grande Impresso Modelo SDB | leites | bazar | bazar_casa |
| p3301 | Jogo de Copos de Vidro Durax Geo 420ml Caixa com 6 Unidades | mercearia | bazar | bazar_casa |
| p3302 | Jogo de Taças de Vidro Turim Lótus 230ml Caixa com 6 Unidades | mercearia | bazar | bazar_casa |
| p3313 | Jogo de Colheres de Mesa em Aço Inox Casa Tem Caixa com 6 Unidades | mercearia | bazar | bazar_casa |
| p3314 | Jogo de Potes de Vidro com Tampa Inox Casa Tem Caixa com 4 Unidades | mercearia | bazar | bazar_casa |
| p3316 | Jogo de Copos de Vidro Casa Tem Clear Diamond 300ml Caixa com 6 Unidades | mercearia | bazar | bazar_casa |
| p3318 | Alimento para Gatos Whiskas Patê de Carne Adulto Lata 290g | carnes | bazar | pet |
| p3319 | Jogo de Garfos de Mesa em Aço Inox Em Casa Tem Silver Caixa com 6 Unidades | mercearia | bazar | bazar_casa |
| p3320 | Jogo de Facas de Mesa em Aço Inox Em Casa Tem Silver Caixa com 6 Unidades | mercearia | bazar | bazar_casa |
| p3328 | Creme de Tratamento Skala Morango e Creme de Leite 1000g | leites | higiene | higiene |
| p3623 | Macarrão Instantâneo Cup Noodles Queijo Nacho 68g | leites | mercearia | massa_seca |
| p3624 | Lasanha De Presunto E Queijo Ao Sugo Kg | leites | congelados | massa_fresca |
| p3633 | Lasanha Seara 4 Queijos 600g | leites | congelados | massa_fresca |
| p3634 | Lasanha Sadia 4 Queijos 600g | leites | congelados | massa_fresca |
| p3636 | Lasanha Mamma D´alva Quatro Queijos 600g | leites | congelados | massa_fresca |
| p3671 | Vinagre Arroz Prinz 750mL | graos | oleos | azeite_vinagre |
| p3673 | Vinagre Rosani Arroz 500ml | graos | oleos | azeite_vinagre |
| p3694 | Socador de feijão Stolf com suporte 28cm | graos | bazar | bazar_casa |
| p3703 | Vinagre Karui Arroz 750ml | graos | oleos | azeite_vinagre |
| p3704 | Vinagre Castelo Arroz 750ml | graos | oleos | azeite_vinagre |
| p3706 | Vinagre Almaroni Orgânico Arroz 400ml | graos | oleos | azeite_vinagre |
| p3800 | Desodorante Corporal Monange Hidratação Intensiva Aveia Frasco 400ml | graos | higiene | higiene |
| p3825 | Loção Hidratação Essencial Monange Aveia 200ml | graos | higiene | higiene |
| p3862 | Sabonete Líquido Lux Botanicals Gardênia e Óleo de Amêndoas Refil Econômico 250mL | oleos | higiene | higiene |
| p3864 | Esmalte Risqué óleo secante 8ml | oleos | higiene | higiene |
| p3869 | Sabonete Palmolive Argila e Óleo 150g | oleos | higiene | higiene |
| p3874 | Sabonete Barra Sensação Purificante Argila Preta e Óleo de Eucalipto Palmolive Naturals Envoltório 85g | oleos | higiene | higiene |
| p3875 | Multi-Inseticida Aerossol à Base de Água Óleo de Eucalipto SBP Frasco 380ml Spray Embalagem Econômica | oleos | limpeza | limpeza |
| p3876 | Condicionador Dove Nutrição Tri Óleos 370ml | oleos | higiene | higiene |
| p3877 | Kit Shampoo Condicionador Dove Nutrição Tri-Óleos 175ml | oleos | higiene | higiene |
| p3878 | Shampoo Dove Nutrição + Tri-Óleos 370ml | oleos | higiene | higiene |
| p3995 | Azeite de Oliva Renata Superiore Extra Virgem Vidro 500ml | leites | oleos | azeite_vinagre |
| p4008 | Azeite de Oliva Renata Extra Virgem Orgânico Vidro 500ml | leites | oleos | azeite_vinagre |
| p4024 | Macarrão Instantâneo Nissin Cup Noodles Legumes com Azeite 67g | oleos | mercearia | massa_seca |
| p4065 | Toalha Umedecida Parentex Eu Sou Óleo de Girassol Com 40 Unidades | oleos | higiene | higiene |
| p4066 | Creme de Tratamento Skala Óleo de Coco 1kg Pote | oleos | higiene | higiene |
| p4067 | Sabonete Lux Botanicals Gardênia e Óleo de Amêndoas 85g | oleos | higiene | higiene |
| p4068 | Sabonete Líquido Lux Gardênia e Óleo de Amêndoas 250ml | oleos | higiene | higiene |
| p4069 | Creme para Pentear Seda Boom Definição Óleo de Coco 1kg Pote | oleos | higiene | higiene |
| p4070 | Loção Hidratante Paixão Tentadora com Óleo de Amêndoas 400ml | oleos | higiene | higiene |
| p4071 | Sabonete Líquido Lux Gardênia e Óleo de Amêndoas Refil Econômico 200ml | oleos | higiene | higiene |
| p4084 | Shampoo Elseve Óleo Extaordinário Nutrição 400ml | oleos | higiene | higiene |
| p4085 | Sabonete Líquido Palmolive Óleo Nutritivo 650ml | oleos | higiene | higiene |
| p4090 | Condicionador Elseve Óleo Extraordinário Nutrição 400ml | oleos | higiene | higiene |
| p4091 | Sabonete Líquido Dove Óleo de Banho 240ml | oleos | higiene | higiene |
| p4095 | Sabonete Líquido Palmolive Óleo Nutritivo Refil 900ml | oleos | higiene | higiene |
| p4096 | Sabonete Líquido Palmolive Naturals Óleo Nutritivo 250ml | oleos | higiene | higiene |
| p4097 | Sabonete Líquido Óleo de Banho Nivea 200ml Frasco | oleos | higiene | higiene |
| p4099 | Sabonete em Barra Palmolive Naturals Óleo Nutritivo 150g | oleos | higiene | higiene |
| p4103 | Creme para Tratamento Hedera Óleo de Argan Refil 500g | oleos | higiene | higiene |
| p4105 | Fritadeira sem Óleo Air Fryer Chic Lar 5 Litros 220V | oleos | bazar | bazar_casa |
| p4106 | Creme para Tratamento Elseve Óleo Extraordinário Nutrição Intensa 300g | oleos | higiene | higiene |
| p4107 | Creme para Pentear Elseve Óleo Extraordinário Nutrição Intensa 250ml | oleos | higiene | higiene |
| p4108 | Sérum Óleo de Tratamento Seda Toque de Seda 4% Amino-Silk 60ml | oleos | higiene | higiene |
| p4109 | Creme para Pentear Niely Gold Óleo de Argan Pós Química 250ml | oleos | higiene | higiene |
| p4110 | Kit Skala Abacate e Óleo de Rícino Shampoo 325ml+ Condicionador 200ml | oleos | higiene | higiene |
| p4111 | Purificador de Ar Bom Ar Óleo Perfumado Life Scents Jardim Místico 16ml | oleos | limpeza | limpeza |
| p4112 | Desodorante Aerossol Nivea Extrato de Pérolas e Óleo de Abacate 200ml Econômico | oleos | higiene | higiene |
| p4113 | Kit Niely Gold Óleo de Argan Pós Química Shampoo 300ml + Condicionador 200ml | oleos | higiene | higiene |
| p4114 | Sabonete Barra Vegetal Óleo de Abacate & Camomila Nivea Nutrição da Natureza 80g | oleos | higiene | higiene |
| p4115 | Shampoo Neutrox Nutrição Óleos 300ml | oleos | higiene | higiene |
| p4116 | Shampoo Dove Nutrição com Tri-Óleos 370ml | oleos | higiene | higiene |
| p4117 | Sabonete em Barra Nivea Lavanda e Óleos 85g | oleos | higiene | higiene |
| p4118 | Máscara Nutrição Neutrox Nutre Óleos 300g | oleos | higiene | higiene |
| p4119 | Gel de Limpeza Facial Nivea Visage Pele Oleosa 145g | oleos | higiene | higiene |
| p4120 | Sabonete em Barra Nivea Erva Doce e Óleos 85g | oleos | higiene | higiene |
| p4121 | Sérum Capilar TRESemmé Blend de Óleos 170ml | oleos | higiene | higiene |
| p4122 | Condicionador Dove Nutrição + Tri-Óleos 370ml | oleos | higiene | higiene |
| p4123 | Creme Facial Nivea 7 em 1 Sensível Não Oleoso 100g Pote | oleos | higiene | higiene |
| p4124 | Condicionador Neutrox Nutrição com Óleos 300ml | oleos | higiene | higiene |
| p4125 | Máscara Eudora Siàge Nutri Óleos Poderosos 250g | oleos | higiene | higiene |
| p4126 | Kit Dove Nutrição + Tri-Óleos Shampoo e Condicionador | oleos | higiene | higiene |
| p4127 | Sérum de Tratamento Dove Reconstrução + Tri-Óleos 110ml | oleos | higiene | higiene |
| p4128 | Kit Neutrox Shampoo 300ml + Condicionador 200ml Nutre Óleos | oleos | higiene | higiene |
| p4129 | Purificador de Ar Secar Sensações Sensual Óleos Essenciais Afrodisíacos 100ml | oleos | limpeza | limpeza |
| p4365 | Lasanha Forno de Minas 4 Queijos Congelada 600g | leites | congelados | massa_fresca |
| p4391 | Espátula Cortadora de Queijo Chic Lar Inox | leites | bazar | bazar_casa |
| p4393 | Ravioli D'itália com Recheio de Queijo 300g | leites | congelados | massa_fresca |
| p4398 | Lasanha Congelada Seara Presunto e Queijo 600g | leites | congelados | massa_fresca |
| p4402 | Macarrão Instantâneo Cup Noodles 68g Queijo Nacho | leites | mercearia | massa_seca |
| p4405 | Porta Queijo Chic Lar com Tampa 19cm Unidade | leites | bazar | bazar_casa |
| p4406 | Plaina para Queijo Brinox em Aço Inox Unidade | leites | bazar | bazar_casa |
| p4414 | Fettuccine Perdigão à Bolonhesa com Queijo Ralado 300g | leites | congelados | massa_fresca |
| p4415 | Macarrão Instantâneo Nissin Cup Noodles Queijo Cheddar 69g | leites | mercearia | massa_seca |
| p4425 | Lasanha Congelada Sadia 4 Queijos 600g | leites | congelados | massa_fresca |
| p4426 | Lasanha Congelada Seara 4 Queijos 600g | leites | congelados | massa_fresca |
| p4427 | Massa Tortellini Capricci 4 Queijos 250g | leites | congelados | massa_fresca |
| p4428 | Lasanha Seara 4 Queijos para Air Fryer 300g | leites | congelados | massa_fresca |
| p4429 | Ravioli Quatro Queijos Tia Nora Congelado Pacote 400g | leites | congelados | massa_fresca |
| p4431 | Macarrão Orquidea Semola Espaguete Integral Pa 500g | hortifruti | mercearia | massa_seca |
| p4432 | Macarrão Integral Parafuso Orquídea Pacote 500g | hortifruti | mercearia | massa_seca |
| p4433 | Macarrão Instantâneo Nissin Espaguete 500g Pronto Em 5 Min. | hortifruti | mercearia | massa_seca |
| p4434 | Macarrão De Sêmola De Trigo Grano Duro Penne Orquídea Pacote 500g | hortifruti | mercearia | massa_seca |
| p4435 | Macarrão Isabela Sêmola Espaguete 400g | hortifruti | mercearia | massa_seca |
| p4436 | Macarrão Orquidea Semola Penne Pá 500g | hortifruti | mercearia | massa_seca |
| p4437 | Macarrão Espaguete Sem Ovos Orquídea 500g | hortifruti | mercearia | massa_seca |
| p4438 | Macarrão Espaguete com Ovos Orquídea 500g | hortifruti | mercearia | massa_seca |
| p4439 | Macarrão Penne Com Ovos Orquídea 500g | hortifruti | mercearia | massa_seca |
| p4440 | Macarrão Espaguete Ninho Com Ovos Orquídea 500g | hortifruti | mercearia | massa_seca |
| p4441 | Macarrão Com Ovos Espaguete Nordeste Pacote 500g | hortifruti | mercearia | massa_seca |
| p4443 | Macarrão Parafuso Com Ovos Orquídea 500g | hortifruti | mercearia | massa_seca |
| p4444 | Macarrão Sem Ovos Parafuso Orquídea 500g | hortifruti | mercearia | massa_seca |
| p4445 | Macarrão de Sêmola com Ovos Espaguete Isabela 500g | hortifruti | mercearia | massa_seca |
| p4446 | Macarrão de Sêmola com Ovos Penne Isabela 500g | hortifruti | mercearia | massa_seca |
| p4447 | Macarrão com Ovos Parafuso Barilla Pacote 500g | hortifruti | mercearia | massa_seca |
| p4448 | Macarrão Instantânio Nissin Espaguete 500g Pronto Em 3min. | hortifruti | mercearia | massa_seca |
| p4449 | Macarrão de Sêmola com Ovos Parafuso Isabela 500g | hortifruti | mercearia | massa_seca |
| p4450 | Macarrão De Sêmola Penne Isabela Bom Gosto Pacote 400g | hortifruti | mercearia | massa_seca |
| p4451 | Macarrão De Sêmola Parafuso Isabela Bom Gosto Pacote 400g | hortifruti | mercearia | massa_seca |
| p4452 | Macarrão Grano Duro Linguine 13 Barilla Caixa 500g | hortifruti | mercearia | massa_seca |
| p4453 | Macarrão Instantâneo Yakissoba Tomate Nissin U.F.O. Bandeja 95g | hortifruti | mercearia | massa_seca |
| p4454 | Macarrão Instantâneo Lámen Carne Isabela 75g | carnes | mercearia | massa_seca |
| p4455 | Macarrão Instantâneo Lámen Tomate Minions Isabela 75g | hortifruti | mercearia | massa_seca |
| p4456 | Macarrão Instantâneo Lámen Galinha Caipira Isabela 75g | hortifruti | mercearia | massa_seca |
| p4457 | Macarrão Instantâneo Nissin Lámen Hot Calabresa Picante 85g | hortifruti | mercearia | massa_seca |
| p4458 | Macarrão Instantâneo Lámen Galinha Suave Minions Isabela 75g | hortifruti | mercearia | massa_seca |
| p4459 | Macarrão Instantâneo Lámen Galinha Zero Fritura Isabela 75g | hortifruti | mercearia | massa_seca |
| p4460 | Macarrão Instantâneo Parmegiana de Carne Cup Noodles Copo 68g | carnes | mercearia | massa_seca |
| p4461 | Macarrão Instantâneo Nissin Yakissoba 500g Pronto Em 4 Min. | hortifruti | mercearia | massa_seca |
| p4462 | Macarrão Orquidea Semola Pena Integral Pá 500g | hortifruti | mercearia | massa_seca |
| p4463 | Macarrão Instantâneo Nissin Miojo Frango Assado Toque De Limão 85g | carnes | mercearia | massa_seca |
| p4464 | Macarrão Instantâneo Yakissoba Galinha Caipira Original Nissin U.F.O. Bandeja 93g | hortifruti | mercearia | massa_seca |
| p4465 | Macarrão Instantâneo Lámen Lombo Suíno com Toque de Limão Nissin Miojo Pacote 85g | hortifruti | mercearia | massa_seca |
| p4466 | Macarrão Instantâneo Carne com Batata Turma do Chico Bento Nissin Miojo Pacote 75g | carnes | mercearia | massa_seca |
| p4467 | Macarrão Instantâneo Lámen Tomate Suave Turma da Mônica Nissin Miojo Pacote 85g | hortifruti | mercearia | massa_seca |
| p4468 | Macarrão Instantâneo Galinha Caipira com Tomate Turma do Chico Bento Nissin Miojo Pacote 75g | hortifruti | mercearia | massa_seca |
| p4469 | Macarrão Romena Ravioli Frango Pá 250g | carnes | congelados | massa_fresca |
| p4470 | Macarrão Germani carne 60g | carnes | mercearia | massa_seca |
| p4471 | Macarrão Italiano Maggi 65g | hortifruti | mercearia | massa_seca |
| p4472 | Macarrão com Ovos Pai Nosso Barilla Pacote 500g | hortifruti | mercearia | massa_seca |
| p4473 | Macarrão Maggi Mac'n Cheese 65g | hortifruti | mercearia | massa_seca |
| p4475 | Macarrão Cup Noodles cheddar 69g | hortifruti | mercearia | massa_seca |
| p4478 | Macarrão Cabelo de Anjo Com Ovos Orquídea 500g | hortifruti | mercearia | massa_seca |
| p4479 | Macarrão Ninho Talharim com Ovos Caseira Orquídea 500g | hortifruti | mercearia | massa_seca |
| p4480 | Macarrão Cup Noodles galinha caipira picante 68g | hortifruti | mercearia | massa_seca |
| p4481 | Macarrão Nissin Miojo Turma Monica Carne 85g | carnes | mercearia | massa_seca |
| p4482 | Macarrão Miojo Nissin Lámen 85g Galinha | hortifruti | mercearia | massa_seca |
| p4483 | Macarrão Cup Noodles galinha caipira 69g | hortifruti | mercearia | massa_seca |
| p4484 | Macarrão Com Ovos Isabela Cabelo De Anjo 500g | hortifruti | mercearia | massa_seca |
| p4485 | Macarrão Isabela Minions carne suave 74,3g | carnes | mercearia | massa_seca |
| p4486 | Macarrão Cup Noodles carne defumada 69g | carnes | mercearia | massa_seca |
| p4487 | Macarrão com Ovos Linguine Barilla Pacote 500g | hortifruti | mercearia | massa_seca |
| p4488 | Macarrão Nissin Galinha Caipira Picante 85g | hortifruti | mercearia | massa_seca |
| p4489 | Macarrão Miojo Nissin Lámen 85g Carne | carnes | mercearia | massa_seca |
| p4490 | Macarrão De Sêmola Com Ovos Rigatoni Isabela 500g | hortifruti | mercearia | massa_seca |
| p4491 | Macarrão De Sêmola Com Ovos Alfabeto Isabela Pacote 500g | hortifruti | mercearia | massa_seca |
| p4492 | Macarrão De Sêmola Com Ovos Espaguetini Isabela Pacote 500g | hortifruti | mercearia | massa_seca |
| p4493 | Macarrão De Sêmola Rigatoni Isabela Bom Gosto Pacote 400g | hortifruti | mercearia | massa_seca |
| p4621 | Açucareiro Unitermi 350ml Sortido | mercearia | bazar | bazar_casa |
| p5166 | Espátula para Bolo Chic Lar Silver Unidade | padaria | bazar | bazar_casa |
| p5167 | Forma para Bolo e Pudim Chic Lar 22cm | padaria | bazar | bazar_casa |
| p5168 | Forma Chic Lar Lisa para Bolo e Pudim | padaria | bazar | bazar_casa |
| p5169 | Porta Bolo Chic Lar com Tampa 33cm Unidade | padaria | bazar | bazar_casa |
| p5170 | Prato de Vidro para Bolo Milan Casa Glass 29cm | padaria | bazar | bazar_casa |
| p5171 | Prato para Bolo de Vidro Clear Daisy 33cm Unidade | padaria | bazar | bazar_casa |
| p5172 | Lasanha Seara Bolonhesa 1kg | padaria | congelados | massa_fresca |
| p5173 | Lasanha Sadia Bolonhesa 600g | padaria | congelados | massa_fresca |
| p5174 | Lasanha Seara Bolonhesa 600g | padaria | congelados | massa_fresca |
| p5175 | Lasanha Perdigão Bolonhesa 1kg | padaria | congelados | massa_fresca |
| p5177 | Lasanha Perdigão Bolonhesa 600g | padaria | congelados | massa_fresca |
| p5178 | Nhoque Sadia Hot Bowls Bolonhesa 300g | padaria | congelados | massa_fresca |
| p5179 | Lasanha Seara Bolonhesa para Air Fryer 300g | padaria | congelados | massa_fresca |
| p5180 | Lasanha Congelada Forno de Minas Bolonhesa 600g | padaria | congelados | massa_fresca |
| p5185 | Macarrão Instantâneo Nissin Cup Noodles Bolonhesa 72g | padaria | mercearia | massa_seca |
| p5187 | Macarrão Instantâneo Nissin Talharim Bolonhesa Pacote 90g | padaria | mercearia | massa_seca |
| p5188 | Brinquedo Baby Land Cardoso Bolofante com Formas Geométricas | padaria | bazar | bazar_casa |
| p5189 | Kit para Decoração de Bolos Chic Lar com 9 peças | padaria | bazar | bazar_casa |
| p5649 | Coloração Cor & Ton Mini Kit 135g 6.7 Chocolate | biscoitos | higiene | higiene |
| p5769 | Forma para bolo Fuzipar com tubo n°24 | padaria | bazar | bazar_casa |
| p5770 | Forma para bolo Fuzipar com tubo N18 1,30L | padaria | bazar | bazar_casa |
| p5771 | Prato Plastico Minaplast Bolo 15cm Com 10 Unidades | padaria | bazar | bazar_casa |
| p5772 | Lasanha Seara Bolonhesa 350g | padaria | congelados | massa_fresca |
| p5773 | Lasanha Lebon bolonhesa 600g | padaria | congelados | massa_fresca |
| p5775 | Lasanha Mamma D´alva bolonhesa 600g | padaria | congelados | massa_fresca |
| p5776 | Lasanha Bão De Minas Bolonhesa 500g | padaria | congelados | massa_fresca |
| p5777 | Talharim Nissin Miojo Bolonhesa 99g | padaria | mercearia | massa_seca |
| p5778 | Lasanha Seara Air Fryer Bolonhesa 300g | padaria | congelados | massa_fresca |
| p5779 | Fettuccine Seara Gourmet Bolonhesa 350g | padaria | congelados | massa_fresca |
| p5782 | Nhoque de Batata ao Molho Bolonhesa Sadia Hot Bowls 300g | padaria | congelados | massa_fresca |
| p5784 | Macarrão Espaguete Integral Grano Duro Divella Spaghettini Pacote 500g | hortifruti | mercearia | massa_seca |
| p5785 | Macarrão Parafuso Integral Grano Duro Divella Fusilli n.40 Pacote 500g | hortifruti | mercearia | massa_seca |
| p5786 | Macarrão Galo Integral Espaguete 500g | hortifruti | mercearia | massa_seca |
| p5787 | Macarrão Galo Integral Parafuso 500g | hortifruti | mercearia | massa_seca |
| p5788 | Macarrão Parafuso Barilla Sem Glúten 500g | hortifruti | mercearia | massa_seca |
| p5790 | Macarrão Italiano Vecchio Pastifício Massa Grano Duro Penne Zite Rigate 500g | hortifruti | mercearia | massa_seca |
| p5791 | Macarrão Antico Molino Grano Duro Penne Rigate N°20 500g | hortifruti | mercearia | massa_seca |
| p5792 | Macarrão Divella Massa Grano Duro 27 Penne Ziti Rigate 500g | hortifruti | mercearia | massa_seca |
| p5793 | Macarrão Paganini Massa de Sêmola Grano Duro Penne Rigate 500g | hortifruti | mercearia | massa_seca |
| p5795 | Macarrão Italiano La Fabbrica Della Pasta Massa Grano Duro Penne Al Limone 500g | hortifruti | mercearia | massa_seca |
| p5796 | Macarrão Espaguete Fino Pilar 400g | hortifruti | mercearia | massa_seca |
| p5797 | Macarrão Parafuso Pilar 400g | hortifruti | mercearia | massa_seca |
| p5798 | Macarrão Espaguete Isabela Sêmola 1kg | hortifruti | mercearia | massa_seca |
| p5800 | Macarrão Todeschini Penne com Ovos 500g | hortifruti | mercearia | massa_seca |
| p5802 | Macarrão Barilla Massa Grano Duro Espaguete N°5 500g Leve 3 Pague 2 Unidades | hortifruti | mercearia | massa_seca |
| p5803 | Macarrão Dona Benta Sêmola Espaguete 500g | hortifruti | mercearia | massa_seca |
| p5804 | Macarrão Isabela Massa de Sêmola Penne 400g | hortifruti | mercearia | massa_seca |
| p5806 | Macarrão Isabela Massa de Sêmola Espaguete 400g | hortifruti | mercearia | massa_seca |
| p5807 | Macarrão Isabela Massa com Ovos Espaguete 500g | hortifruti | mercearia | massa_seca |
| p5808 | Macarrão Todeschini Parafuso com Ovos 500g | hortifruti | mercearia | massa_seca |
| p5809 | Macarrao Orquidea com ovos parafuso 500g | hortifruti | mercearia | massa_seca |
| p5810 | Macarrão com Ovos Flor de Lis Espaguete 500g | hortifruti | mercearia | massa_seca |
| p5811 | Macarrão Massa com Ovos Renata Espaguete 8 500g | leites | mercearia | massa_seca |
| p5812 | Macarrão Dona Benta Massa de Sêmola Penne 500g | hortifruti | mercearia | massa_seca |
| p5813 | Macarrão Casaredo Massa de Sêmola Espaguete 1kg | hortifruti | mercearia | massa_seca |
| p5814 | Macarrão Di Lusso Extra Penne Rigati N20 500g | hortifruti | mercearia | massa_seca |
| p5815 | Macarrão Galo Massa de Sêmola Espaguete 9 500g | hortifruti | mercearia | massa_seca |
| p5816 | Macarrão Massa com Ovos Renata Parafuso 500g | leites | mercearia | massa_seca |
| p5817 | Macarrão Isabela Massa com Ovos Parafuso 500g | hortifruti | mercearia | massa_seca |
| p5818 | Macarrão Galo Massa de Sêmola Espaguete 8 500g | hortifruti | mercearia | massa_seca |
| p5819 | Macarrão Barilla Massa com Ovos Penne Rigate 500g | hortifruti | mercearia | massa_seca |
| p5820 | Macarrão Barilla Collezione Massa Tricolore Mezze Penne 500g | hortifruti | mercearia | massa_seca |
| p5821 | Macarrão D'Itália Massa Caseira com Ovos Espaguete 2kg | hortifruti | mercearia | massa_seca |
| p5822 | Macarrão Germani Massa de Sêmola Espaguete Médio 500g | hortifruti | mercearia | massa_seca |
| p5823 | Macarrão Galo Massa de Sêmola Parafuso 500g | hortifruti | mercearia | massa_seca |
| p5824 | Macarrão D'Italia Massa Caseira com Ovos Espaguete 500g | hortifruti | mercearia | massa_seca |
| p5825 | Macarrão Isabela Massa com Ovos Linguine Espaguete 500g | hortifruti | mercearia | massa_seca |
| p5826 | Macarrão D'Itália Massa Caseira com Ovos Espaguete 1kg | hortifruti | mercearia | massa_seca |
| p5827 | Macarrão com Ovos Flor de Lis Parafuso 500g | hortifruti | mercearia | massa_seca |
| p5828 | Macarrão Casaredo Massa de Sêmola Espaguete Fino 500G | hortifruti | mercearia | massa_seca |
| p5829 | Macarrão Barilla Massa com Ovos Parafuso 500g | hortifruti | mercearia | massa_seca |
| p5830 | Macarrão Dona Benta Massa de Sêmola Parafuso 500g | hortifruti | mercearia | massa_seca |
| p5831 | Macarrão Casaredo Massa de Sêmola Parafuso 1kg | hortifruti | mercearia | massa_seca |
| p5832 | Macarrão Orquídea Massa de Sêmola com Ovos Espaguete 500g | hortifruti | mercearia | massa_seca |
| p5833 | Macarrão Casa Germani Massa de Sêmola Parafuso 500g | hortifruti | mercearia | massa_seca |
| p5834 | Macarrão Isabela Massa de Sêmola Parafuso 400g | hortifruti | mercearia | massa_seca |
| p5835 | Macarrão Casaredo Massa de Sêmola Parafuso 3kg | hortifruti | mercearia | massa_seca |
| p5836 | Macarrão Vecchio Pastifício Massa Grano Duro Caccavelle 125g | hortifruti | mercearia | massa_seca |
| p5837 | Macarrão Rigatone Grano Duro Barilla 500g | hortifruti | mercearia | massa_seca |
| p5838 | Macarrão Barilla Grano Duro Fusilli 500g | hortifruti | mercearia | massa_seca |
| p5839 | Macarrão Petybon Massa Grano Duro Fettuccine 500g | hortifruti | mercearia | massa_seca |
| p5840 | Macarrão Italiano Vecchio Pastifício Massa Grano Duro Spaghetti 500g | hortifruti | mercearia | massa_seca |
| p5841 | Macarrão Divella Massa Grano Duro 86 Orecchiette 500g | hortifruti | mercearia | massa_seca |
| p5842 | Macarrão Barilla Collezione Grano Duro Fettuccine 500g | hortifruti | mercearia | massa_seca |
| p5843 | Macarrão Paganini Massa Grano Duro Spaghetti 500g | hortifruti | mercearia | massa_seca |
| p5844 | Macarrão Italiano La Fabbrica Della Pasta Vaso Anfora Massa Grano Duro Vesuvio 1,2kg | hortifruti | mercearia | massa_seca |
| p5846 | Macarrão Divella Massa Grano Duro 6 Bucatini 500g | hortifruti | mercearia | massa_seca |
| p5847 | Macarrão Italiano Vecchio Pastifício Massa Grano Duro Fusilloni 500g | hortifruti | mercearia | massa_seca |
| p5848 | Macarrão Divella Massa Grano Duro 17 Rigatone 500g | hortifruti | mercearia | massa_seca |
| p5849 | Macarrão Instantâneo Apti Carne 70g | carnes | mercearia | massa_seca |
| p5850 | Macarrão Divella Massa Grano Duro Conchiglioni 87 500g | hortifruti | mercearia | massa_seca |
| p5851 | Macarrão Divella Massa Grano Duro 12 Fettucini 500g | hortifruti | mercearia | massa_seca |
| p5852 | Macarrão Italiano La Fabbrica Della Pasta Massa Grano Duro Tagliatelle 500g | hortifruti | mercearia | massa_seca |
| p5853 | Macarrão Barilla Collezione Massa Grano Duro Casarecce 500g | hortifruti | mercearia | massa_seca |
| p5854 | Macarrão Divella Massa Grano Duro Spaghetti N°8 185g | hortifruti | mercearia | massa_seca |
| p5855 | Macarrão Instantâneo Nissin Galinha 85g | hortifruti | mercearia | massa_seca |
| p5856 | Macarrão Spaghettini nº 3 Grano Duro Barilla 500g | hortifruti | mercearia | massa_seca |
| p5857 | Macarrão Instantâneo Nissin Talharim Frango 90g | carnes | mercearia | massa_seca |
| p5858 | Macarrão Paganini Massa de Sêmola Grano Duro Rigatoni 500g | hortifruti | mercearia | massa_seca |
| p5859 | Macarrão Instantâneo Apti Galinha Caipira 70g | hortifruti | mercearia | massa_seca |
| p5860 | Macarrão Antico Molino Massa Grano Duro Linguine 6 500g | hortifruti | mercearia | massa_seca |
| p5861 | Macarrão Instantâneo Nissin Lámen Picanha 85g | carnes | mercearia | massa_seca |
| p5862 | Macarrão Instantâneo U.F.O Yakissoba Curry 96g | hortifruti | mercearia | massa_seca |
| p5863 | Macarrão Instantâneo Apti Galinha 70g | hortifruti | mercearia | massa_seca |
| p5864 | Macarrão Antico Molino Massa Grano Duro Farfalle 66 500g | hortifruti | mercearia | massa_seca |
| p5865 | Macarrão Divella Massa de Sêmola Grano Duro Fetuccini N90 500g | hortifruti | mercearia | massa_seca |
| p5866 | Macarrão Barilla Massa Integral Fusilli 500g | hortifruti | mercearia | massa_seca |
| p5867 | Macarrão Antico Molino Massa Grano Duro Spaghetti 15 500g | hortifruti | mercearia | massa_seca |
| p5868 | Macarrão Instantâneo Nissin Yakissoba 4 Minutos 500g | hortifruti | mercearia | massa_seca |
| p5869 | Macarrão Paganini Massa de Sêmola Grano Duro Tagliatelle 500g | hortifruti | mercearia | massa_seca |
| p5870 | Macarrão Instantâneo Nissin Lámen Galinha Caipira 85g | hortifruti | mercearia | massa_seca |
| p5871 | Macarrão Instantâneo Nissin Lámen Carne Picante 85g | carnes | mercearia | massa_seca |
| p5872 | Macarrão Instantâneo Nissin Lámen Carne Pacote 85g | carnes | mercearia | massa_seca |
| p5873 | Macarrão Antico Molino Massa Grano Duro Farfalline N°68 500g | hortifruti | mercearia | massa_seca |
| p5874 | Macarrão Barilla Massa de Sêmola Grano Duro Capellini N1 500g | hortifruti | mercearia | massa_seca |
| p5875 | Macarrão Instantâneo Lámen Renata Express com Tempero Carne | leites | mercearia | massa_seca |
| p5876 | Macarrão Instantâneo Maggi Sabor Queijo Cheese com Tempero Pacote 65g | leites | mercearia | massa_seca |
| p5877 | Macarrão Instantâneo Lámen Renata Express com Tempero Galinha | leites | mercearia | massa_seca |
| p5878 | Macarrão Instantâneo Maggi Sabor Tomate Italiano com Tempero Pacote 65g | hortifruti | mercearia | massa_seca |
| p5879 | Macarrão Instantâneo U.F.O Yakissoba Galinha Caipira 93g | hortifruti | mercearia | massa_seca |
| p5880 | Macarrão Instantâneo Nissin Cup Noodles Frango Teriyaki 72g | carnes | mercearia | massa_seca |
| p5881 | Macarrão Instantâneo Nissin Cup Noodles Caipira Picante 68g | hortifruti | mercearia | massa_seca |
| p5882 | Macarrão Instantâneo Cup Noodles Parmegiana de Carne 68g | carnes | mercearia | massa_seca |
| p5883 | Macarrão Barilla Spaghetti sem Glúten 500g | hortifruti | mercearia | massa_seca |
| p5884 | Macarrão Italiano La Fabbrica Della Pasta Vaso Anfora Massa Tricolor Glúten 500g | hortifruti | mercearia | massa_seca |
| p5885 | Macarrão Instantâneo Nissin UFO Yakissoba de Carne 95g | carnes | mercearia | massa_seca |
| p5886 | Macarrão Instantâneo Nissin UFO Yakissoba de Legumes 95g | hortifruti | mercearia | massa_seca |
| p5887 | Macarrão Oriental Karui Sem Glúten 500g | hortifruti | mercearia | massa_seca |
| p5888 | Macarrão Instantâneo Lámen Renata Express com Tempero Galinha Caipira | leites | mercearia | massa_seca |
| p5889 | Macarrão Instantâneo Nissin Cup Noodles Carne Defumada 69g | carnes | mercearia | massa_seca |
| p5890 | Macarrão Instantâneo Nissin Cup Noodles Galinha Caipira 69g | hortifruti | mercearia | massa_seca |
| p5891 | Macarrão Instantâneo Nissin Lámen Turma da Mônica Carne 85g | carnes | mercearia | massa_seca |
| p5892 | Macarrão Instantâneo Nissin Turma do Chico Bento Carne com Batata 75g | carnes | mercearia | massa_seca |
| p5893 | Macarrão Instantâneo Nissin Turma da Mônica Tomate Pacote 85g | hortifruti | mercearia | massa_seca |
| p5894 | Macarrão Instantâneo Nissin Turma da Mônica Galinha Pacote 85g | hortifruti | mercearia | massa_seca |
| p5895 | Macarrão Instantâneo Nissin UFO Yakissoba Sabor Tomate Copo 95g | hortifruti | mercearia | massa_seca |
| p5896 | Macarrão Instantâneo Nissin Miojo Lámen Sabor Lombo Suíno com Limão Pacote 85g | hortifruti | mercearia | massa_seca |
| p5897 | Macarrão Italiana La Fabbrica Della Pasta Lasagna Cuki Taglia 500g | hortifruti | mercearia | massa_seca |
| p5898 | Macarrão Italiano La Fabbrica Della Pasta Vaso Anfora Italiani 1,1kg | hortifruti | mercearia | massa_seca |
| p5899 | Macarrão Italiano Vaso da Fortuna Massa Tricolor Spaghetti 500g | hortifruti | mercearia | massa_seca |
| p5900 | Macarrão Spaghetti Dalla Costa Al Nero Di Seppia 500g | hortifruti | mercearia | massa_seca |
| p5903 | Macarrão Galo Massa de Sêmola Aletria 500g | hortifruti | mercearia | massa_seca |
| p5904 | Macarrão Italiano Barilla Chifferi 500g | hortifruti | mercearia | massa_seca |
| p5905 | Macarrão Fettuccine Italiano Barilla 500g | hortifruti | mercearia | massa_seca |
| p5906 | Macarrão de Sêmola Risoni 26 Barilla 500g | hortifruti | mercearia | massa_seca |
| p5907 | Macarrão Italiano La Fabbrica Della Pasta Massa Tricolor Fusilloni 500g | hortifruti | mercearia | massa_seca |
| p5908 | Macarrão Italiano La Fabbrica Della Pasta Vaso Anfora Massa Tricolor Fusilloni 500g | hortifruti | mercearia | massa_seca |
| p5909 | Macarrão Italiano Barilla Snowfall 300g | hortifruti | mercearia | massa_seca |
| p5910 | Macarrão de Sêmola Pilar Pasta 400g | hortifruti | mercearia | massa_seca |
| p5911 | Macarrão Isabela Massa de Sêmola Rigatoni 400g | hortifruti | mercearia | massa_seca |
| p5912 | Macarrão Barilla Integrale Spaghetti 500g | hortifruti | mercearia | massa_seca |
| p5913 | Macarrão Divella Capelli D'Angelo 93 500g | hortifruti | mercearia | massa_seca |
| p5914 | Macarrão Casaredo Massa de Sêmola Rigatone 3kg | hortifruti | mercearia | massa_seca |
| p5915 | Macarrão Casa Germani Massa com Ovos Talharim Largo 500g | hortifruti | mercearia | massa_seca |
| p5916 | Macarrão Isabela Massa com Ovos Nhoque 500g | hortifruti | mercearia | massa_seca |
| p5917 | Macarrão Caseiro Venturelli Yakissoba 500g | hortifruti | mercearia | massa_seca |
| p5918 | Macarrão Isabela Massa com Ovos Pena 500g | hortifruti | mercearia | massa_seca |
| p5919 | Macarrão Massa com Ovos Renata Pena 500g | leites | mercearia | massa_seca |
| p5920 | Macarrão Semolado Anellini N°75 Divella 500g | hortifruti | mercearia | massa_seca |
| p5921 | Macarrão com Ovos Germani Cabelo de Anjo 500g | hortifruti | mercearia | massa_seca |
| p5922 | Macarrão Galo Massa de Sêmola Espaguetone 7 500g | hortifruti | mercearia | massa_seca |
| p5923 | Macarrão Divella Fusilli nº 40 - 500g | hortifruti | mercearia | massa_seca |
| p5924 | Macarrão Oriental Karui para Udon 500g | hortifruti | mercearia | massa_seca |
| p5925 | Macarrão com Ovos Todeschini Spaghetti Veneza Nº5 500g | hortifruti | mercearia | massa_seca |
| p5926 | Macarrão Oriental Karui Harusame 200g | hortifruti | mercearia | massa_seca |
| p5927 | Macarrão D'Italia Massa Caseira com Ovos Pappardelle 500g | hortifruti | mercearia | massa_seca |
| p5928 | Macarrão Oriental Karui para Somen 500g | hortifruti | mercearia | massa_seca |
| p5929 | Macarrão Barilla Massa Com Ovos Fettuccine 500g | hortifruti | mercearia | massa_seca |
| p5930 | Macarrão Isabela Massa com Ovos Alfabeto Animada 500g | hortifruti | mercearia | massa_seca |
| p5931 | Macarrão Casa Germani Massa de Sêmola Pene 500g | hortifruti | mercearia | massa_seca |
| p5932 | Macarrão Di Lusso Extra Rigatoni Divini N31 500g | hortifruti | mercearia | massa_seca |
| p5933 | Macarrão Divella Massa de Sêmola Linguine N°14 500g | hortifruti | mercearia | massa_seca |
| p5934 | Macarrão Barilla Massa com Ovos 9 Espaguetinho 500g | hortifruti | mercearia | massa_seca |
| p5935 | Macarrão Di Lusso Extra Rigatoni Mezz N32 500g | hortifruti | mercearia | massa_seca |
| p5936 | Macarrão Galo Massa de Sêmola Pena 500g | hortifruti | mercearia | massa_seca |
| p5937 | Macarrão D'Itália Massa Caseira com Ovos Fettuccine 1kg | hortifruti | mercearia | massa_seca |
| p5938 | Macarrão Casaredo Massa com Ovos Tipo Caseira 500g | hortifruti | mercearia | massa_seca |
| p5939 | Macarrão D'Italia Massa Caseira com Ovos Talharim 500g | hortifruti | mercearia | massa_seca |
| p5940 | Macarrão D'Italia Massa Caseira com Ovos Pappardelle 1kg | hortifruti | mercearia | massa_seca |
| p5941 | Macarrão D'Italia Massa Caseira com Ovos Talharim 1kg | hortifruti | mercearia | massa_seca |
| p5942 | Macarrão D'Italia Massa Caseira com Ovos Talharim 2kg | hortifruti | mercearia | massa_seca |
| p5943 | Macarrão Di Lusso Extra Linguine N6 500g | hortifruti | mercearia | massa_seca |
| p5944 | Macarrão Orquídea Massa de Sêmola com Ovos Pene 500g | hortifruti | mercearia | massa_seca |
| p5945 | Macarrão Oriental Karui para Yakissoba Fino 500g | hortifruti | mercearia | massa_seca |
| p5946 | Macarrão Oriental Karui para Yakissoba Largo 500g | hortifruti | mercearia | massa_seca |
| p5947 | Macarrão Antico Molino La Molisana Fusilli 28 500g | hortifruti | mercearia | massa_seca |
| p5948 | Macarrão Barilla Massa de Sêmola Bavette 500g | hortifruti | mercearia | massa_seca |
| p5949 | Macarrão Inst. Nissin Lámen Galinha Caipira Picante 85g | hortifruti | mercearia | massa_seca |
| p5950 | Macarrão Casaredo Massa de Sêmola Caracolinho 3kg | hortifruti | mercearia | massa_seca |
| p5951 | Macarrão Barilla Massa de Sêmola Spaghettoni 7 500g | hortifruti | mercearia | massa_seca |
| p5952 | Macarrão Barilla Massa de Sêmola Spaghetti 5 500g | hortifruti | mercearia | massa_seca |
| p5953 | Macarrão Galo Massa de Sêmola Ninho N3 500g | hortifruti | mercearia | massa_seca |
| p5955 | Macarrão La Molisana Pastifício Extra Di Lusso Spaguettoni N°14 500g | hortifruti | mercearia | massa_seca |
| p5956 | Macarrão La Molisana Pastificio Extra di Lusso Fettuccine Saporiti N°5 500g | hortifruti | mercearia | massa_seca |
| p5957 | Macarrão Italiano Extra di Lusso Pennoni Rigati n° 21 500g | hortifruti | mercearia | massa_seca |
| p5958 | Macarrão D'Italia Massa Caseira com Ovos Fettuccine 500g | hortifruti | mercearia | massa_seca |
| p5959 | Macarrão D'Italia Massa Caseira com Ovos Pappardelle 2kg | hortifruti | mercearia | massa_seca |
| p5960 | Macarrão D'Itália Massa Caseira com Ovos Fettuccine 2kg | hortifruti | mercearia | massa_seca |
| p5961 | Porta Macarrão Sanremo em Plástico Unidade | hortifruti | bazar | bazar_casa |
| p5964 | Tapete para Banheiro Macarrão Bene 38x58cm Cores Sortidas | hortifruti | bazar | bazar_casa |
| p6057 | Espátula Pão Duro Brinox Ultra 29cm | padaria | bazar | bazar_casa |
| p6059 | Faca Tramontina Profit para Pão Branca 7'' | padaria | bazar | bazar_casa |
| p6304 | Espremedor De suco Valencia Em Plastico | bebidas | bazar | bazar_casa |
| p6393 | Copo Munich Pilsen Cerveja Chopp 200ml | bebidas | bazar | bazar_casa |
| p6409 | Copo Cerveja Globim Habesha 340mL | bebidas | bazar | bazar_casa |
| p6410 | Copo de cerveja Nf munich 300ml | bebidas | bazar | bazar_casa |
| p6414 | Copo para chopp Minaplast branco 400ml | mercearia | bazar | bazar_casa |
| p6463 | Limpador Perfumado Veja Água de coco e melão 2l | bebidas | limpeza | limpeza |
| p6464 | Copo Cisper Stylo Água 260ml | bebidas | bazar | bazar_casa |
| p6465 | Taça Nadir Buffet Água 300ml | bebidas | bazar | bazar_casa |
| p6466 | Taca lirio nadir para água 365ml | bebidas | bazar | bazar_casa |
| p6467 | Inseticida Raid aerosol base de água 420ml | bebidas | limpeza | limpeza |
| p6468 | Limpador Perfumado Concentrado Água Marinha Veja Gotas de Perfume Frasco 100ml | bebidas | limpeza | limpeza |
| p6469 | Inseticida Aerossol Ação Magnética à Base de Água SBP Frasco Spray 360ml | bebidas | limpeza | limpeza |
| p6579 | Capeleti Carne Italiany 250g | carnes | congelados | massa_fresca |
| p6586 | Ração Cão Brix Pet Carne 7Kg | carnes | bazar | pet |
| p6590 | Tábua De Carne Stolf Madeira 22x40cm | carnes | bazar | bazar_casa |
| p6591 | Ração Pedigree carne e vegetais 900g | carnes | bazar | pet |
| p6592 | Petisco para Gatos Dreamies Carne 40g | carnes | bazar | pet |
| p6593 | Capeleti Zaccaron de carne congelado 400g | carnes | congelados | massa_fresca |
| p6594 | Ração para gatos Whiskas carne sachê 85g | carnes | bazar | pet |
| p6595 | Ração para gatos Leroy grille carne 1kg | carnes | bazar | pet |
| p6596 | Massa Recheada Zaccaron Carne de Panela 350g | carnes | congelados | massa_fresca |
| p6598 | Talharim Nissin Miojo Sabor Carne Com Tomate 90g | carnes | mercearia | massa_seca |
| p6601 | Petisco Para Cães Pedigree Tasty Bites Carne 40g | carnes | bazar | pet |
| p6602 | Ração para gatos Whiskas Carne filhote sachê 85g | carnes | bazar | pet |
| p6603 | Ração para gatos Friskies filhote carne sachê 85g | carnes | bazar | pet |
| p6604 | Ração para gatos Whiskas castrados carne sachê 85g | carnes | bazar | pet |
| p6605 | Ração para cães Frily Dog carne e cereais 1kg | carnes | bazar | pet |
| p6606 | Ração Cão Bolly Adulto Carne e Frango Premium 1Kg | carnes | bazar | pet |
| p6607 | Ração para cães Pedigree carne ao molho sachê 100g | carnes | bazar | pet |
| p6608 | Ração Pedigree Nutrição Essencial Carne para Cães Adultos 900g | carnes | bazar | pet |
| p6609 | Ração para cães Pedigree filhotes carne ao molho sachê 100g | carnes | bazar | pet |
| p6610 | Macarrão Instantâneo Yakissoba Carne com Molho Japonês Nissin U.F.O. Bandeja 97g | carnes | mercearia | massa_seca |
| p6616 | Ração Pedigree carne, frango e ceral 900g | carnes | bazar | pet |
| p6617 | Ração Premium para Cães Filhotes Pedigree Carne, Frango e Cereais 900g | carnes | bazar | pet |
| p6638 | Capeletti Famigliare de Carne 250g | carnes | congelados | massa_fresca |
| p6642 | Garfo Chic Lar para Carne Inox | carnes | bazar | bazar_casa |
| p6646 | Ração para Gatos Whiskas Carne 900g | carnes | bazar | pet |
| p6647 | Petisco para Gatos Carne Dreamies 80g | carnes | bazar | pet |
| p6653 | Ração para Cães Adultos Buzz Carne 1kg | carnes | bazar | pet |
| p6654 | Ração para Gatos Purina Gatsy Carne 1kg | carnes | bazar | pet |
| p6655 | Ravioli D'itália com Recheio de Carne 300g | carnes | congelados | massa_fresca |
| p6656 | Snack para Cães Sidekick Premium Carne 50g | carnes | bazar | pet |
| p6657 | Faca para Carne Tramontina Polywood Inox 8 | carnes | bazar | bazar_casa |
| p6659 | Massa Fresca Essasim Agnoline de Carne 500g | carnes | congelados | massa_fresca |
| p6660 | Faca para Carne Tramontina Profit Branca N8 | carnes | bazar | bazar_casa |
| p6661 | Ração Mandaí Cães Adultos Carne Classic 5kg | carnes | bazar | pet |
| p6662 | Ração para Cães Mandaí Dog Classic Carne 1kg | carnes | bazar | pet |
| p6663 | Ração para Cães Mandaí Dog Classic Carne 3kg | carnes | bazar | pet |
| p6665 | Ração para Gatos Kite Kat Carne Adultos 2,7kg | carnes | bazar | pet |
| p6666 | Ração para Gatos Whiskas Adultos 1+ Carne 2,7kg | carnes | bazar | pet |
| p6667 | Ração Seca para Gatos Friskies Mix Carne 850g | carnes | bazar | pet |
| p6668 | Ração para Cães Mandaí Dog Classic Carne 10,1kg | carnes | bazar | pet |
| p6669 | Ração Úmida para Gatos Kitekat Carne Sachê 70g | carnes | bazar | pet |
| p6670 | Ração Úmida para Cães Pedigree Carne Lata 280g | carnes | bazar | pet |
| p6672 | Petisco para Gatos Friskies Party Mix Carne 40g | carnes | bazar | pet |
| p6673 | Petisco para Cães Pedigree Tasty Bites Carne 80g | carnes | bazar | pet |
| p6674 | Ração Úmida para Gatos Sidekick Premium Carne 280g | carnes | bazar | pet |
| p6675 | Ração para Gatos Purina Gatsy Adultos Carne 10,1kg | carnes | bazar | pet |
| p6676 | Bifinho para Cães Pedigree Filezinho de Carne 60g | carnes | bazar | pet |
| p6677 | Petisco para Cães Petbrilho Bifinhos Sabor Carne 65g | carnes | bazar | pet |
| p6678 | Ração para Gatos Whiskas Carne Gatos Castrados 900g | carnes | bazar | pet |
| p6683 | Ração Úmida para Gatos Friskies Carne ao Molho 85g | carnes | bazar | pet |
| p6684 | Ração para Cães Mandaí Dog Pequeno Porte Carne 1kg | carnes | bazar | pet |
| p6685 | Ração para Cães Mandaí Dog Porte Pequeno Carne 3kg | carnes | bazar | pet |
| p6686 | Ração para Cães Mandaí Dog Porte Pequeno Carne 10,1kg | carnes | bazar | pet |
| p6687 | Ração para Cães Adultos Sabor Carne Buzz Pacote 10,1kg | carnes | bazar | pet |
| p6688 | Ração Seca para Gatos Castrados Friskies Mix Carne 2,5kg | carnes | bazar | pet |
| p6689 | Ração Úmida para Cães Sidekick Premium Adultos Carne 280g | carnes | bazar | pet |
| p6690 | Ração Úmida para Cães Pedigree Filhotes Carne Sachê 100g | carnes | bazar | pet |
| p6691 | Ração para Gatos Whiskas Carne para Gatos Castrados 2,7kg | carnes | bazar | pet |
| p6692 | Ração Úmida para Cães Sidekick Filhotes Patê de Carne 280g | carnes | bazar | pet |
| p6693 | Ração para Cães Purina Bonzo Adultos Carne e Cereais 18kg | carnes | bazar | pet |
| p6694 | Ração para Cães Purina Alpo Adulto Carne com Vegetais 1kg | carnes | bazar | pet |
| p6695 | Ração para Cães Purina Alpo Adulto Carne com Vegetais 10,1kg | carnes | bazar | pet |
| p6696 | Ração Úmida para Cães Pedigree Raças Pequenas Carne Sachê 100g | carnes | bazar | pet |
| p6698 | Ração Úmida para Cães Dog Chow Adulto Carne ao Molho 100g | carnes | bazar | pet |
| p6699 | Ração Úmida para Cães Pedigree + 7 Anos Carne Sachê 100gr | carnes | bazar | pet |
| p6700 | Ração Úmida para Cães Adultos Carne e Porco Dog Chow 85g | carnes | bazar | pet |
| p6701 | Ração Úmida para Gatos Fancy Feast Demi Glace com Carne 85g | carnes | bazar | pet |
| p6702 | Ração Seca para Cães Adultos Bonzo Carne e Cereais Saco 15kg | carnes | bazar | pet |
| p6703 | Ração Úmida para Gatos Whiskas Adulto Carne ao Molho Sachê 85g | carnes | bazar | pet |
| p6704 | Ração Úmida para Gatos Whiskas Filhote Carne ao Molho Sachê 85g | carnes | bazar | pet |
| p6706 | Ração Úmida para Cães Pedigree Filhotes Carne e Frango Lata 280g | carnes | bazar | pet |
| p6707 | Ração para Cães Adultos Raças Pequenas Carne e Vegetais Pedigree 7Kg | carnes | bazar | pet |
| p6708 | Ração Úmida para Cães Adultos Dog Chow Carne e Arroz Sachê 85g | graos | bazar | pet |
| p6709 | Ração para Cães Pedigree Nutrição Essencial Adultos Carne 10,1kg Grátis 1,1kg | carnes | bazar | pet |
| p6710 | Ração para Cães Filhotes Médios Carne Frango e Arroz Dog Chow 900g | graos | bazar | pet |
| p6712 | Ração para Cães Dog Chow Carne e Frango Adultos Médios e Grandes 900g | carnes | bazar | pet |
| p6713 | Ração Dog Chowpara Cães Adultos Minis e Pequenos Sabor Carne e Frango 900g | carnes | bazar | pet |
| p6714 | Ração Dog Chow para Cães Adultos Médios Grandes Sabor Carne e Frango 2,5kg | carnes | bazar | pet |
| p6715 | Ração Dog Chow para Cães Adultos Minis Pequenos Sabor Carne e Frango 2,5kg | carnes | bazar | pet |
| p6716 | Ração para Cães Pedigree Adultos Raças Minis e Pequenas Carne e Vegetais 900g | carnes | bazar | pet |
| p6717 | Ração para Cães Pedigree Adultos 12 Meses a 7 Anos Carne e Vegetais 2,7kg | carnes | bazar | pet |
| p6718 | ALIM.GATOS FANCY FEAST 75G.SUPREMO CARNE | carnes | bazar | pet |
| p6719 | Ração Seca para Cães Adultos de Porte Pequeno e Médio Buzz Sabor Carne Saco 1kg | carnes | bazar | pet |
| p6721 | Ração Úmida Sachê Pedigree Sabor Carne e Frango para Cães Adultos Pack Leve 9 Pague 7 | carnes | bazar | pet |
| p6722 | Ração Dog Chow para Cães Adultos Maiores de 7 anos Extralife Sabor Carne e Frango 900g | carnes | bazar | pet |
| p6723 | Ração Úmida Sachê Pedigree Sabor Frango, Cordeiro e Carne para Cães Adultos Pack Leve 9 Pague 7 | carnes | bazar | pet |
| p6724 | Ração Úmida Sachê Whiskas Sabor Carne e Peixe para Gatos Adultos Castrados Pack Leve 9 Pague 7 | carnes | bazar | pet |
| p6725 | Ração para Cães Pedigree Adultos 12 Meses a 7 Anos Raças Minis e Pequenas Carne e Vegetais 2,7kg | carnes | bazar | pet |
| p6728 | Ração para Gatos Kite Kat Mix de Carnes 900g | carnes | bazar | pet |
| p6730 | Ração Seca para Gatos Buzz Sabor Mix de Carnes Saco 1kg | carnes | bazar | pet |
| p6733 | Ração para Gatos Adultos Sabor Mix de Carnes Buzz Pacote 2,5kg | carnes | bazar | pet |
| p6734 | Ração Seca para Gatos Adultos Friskies Mix de Carnes Saco 2,5kg | carnes | bazar | pet |
| p6736 | Ração para Cães Pedigree Filhotes Carne, Frango e Cereais 900g | carnes | bazar | pet |
| p6737 | Ração para Cães Purina Dog Chow Extra Life Adultos Médios e Grandes Carne, Frango e Arroz 10,1kg | graos | bazar | pet |
| p6738 | Ração Nestlé Purina Dog Chow Extralife Adultos Minis e Pequenos Carne, Frango e Arroz 10,1kg | graos | bazar | pet |
| p6890 | Copo LAV para Cerveja 330ml | bebidas | bazar | bazar_casa |
| p6891 | Taça para Cerveja LAV 400ml | bebidas | bazar | bazar_casa |
| p6892 | Copo Nadir Figueiredo Munich para Cerveja 200ml | bebidas | bazar | bazar_casa |
| p6893 | Copo Nadir Figueiredo Munich para Cerveja 300ml | bebidas | bazar | bazar_casa |
| p6894 | Taça Nadir Figueiredo Floripa para Cerveja 300ml | bebidas | bazar | bazar_casa |
| p6897 | Caneca Chopp Durax Facetado 400ml | mercearia | bazar | bazar_casa |
| p6898 | Copo Descartável Copobras para Chopp Transparente 300ml Com 100 Unidades | mercearia | bazar | bazar_casa |
| p6982 | Creme para Pentear Niely Gold Água de Coco 250g | bebidas | higiene | higiene |
| p6983 | Creme para Tratamento Niely Gold Água de Coco 430g | bebidas | higiene | higiene |
| p6985 | Sabonete em Barra Francis Brasilidades Água de Coco 80g | bebidas | higiene | higiene |
| p6986 | Sabonete Líquido Francis Água de Coco 200ml Refil Sachê | bebidas | higiene | higiene |
| p6987 | Limpador Perfumado Veja Água de Coco e Melão 2 Litros | bebidas | limpeza | limpeza |
| p6988 | Kit Neutrox Shampoo 300ml + Condicionador 200ml Água de Coco | bebidas | higiene | higiene |
| p6990 | Kit Niely Gold Água de Coco Shampoo 300ml + Condicionador 200ml | bebidas | higiene | higiene |
| p6994 | Suporte para Galão de Água Unitermi Sortido Unidade | bebidas | bazar | bazar_casa |
| p6995 | Inseticida Raid Aerossol Multi Insetos Base Água 420ml | bebidas | limpeza | limpeza |
| p6997 | Taça Bohemia Cristal para Água e Vinho Branco 480ml | bebidas | bazar | bazar_casa |
| p6999 | Jogo de 6 Taças de Água LAV Fame Coloridas 395ml | bebidas | bazar | bazar_casa |
| p7000 | Copo de Água Descartavel Branco Copobras 180ml Com 100 Unidades | bebidas | bazar | bazar_casa |
| p7001 | Copo Descartável Copobras para Água Transparente 180ml Com 100 Unidades | bebidas | bazar | bazar_casa |
| p7002 | Inseticida SBP Aerossol Base Água Ultra Fresco 360ml Insetos Rasteiros | bebidas | limpeza | limpeza |
| p7003 | Limpador Perfumado Concentrado Água Marinha Veja Gotas de Perfume 100ml | bebidas | limpeza | limpeza |
| p7006 | Lança-água Mor Bichinhos Cor Sortida | bebidas | bazar | bazar_casa |
| p7010 | Biscoito Keldog+crock Integral Original 400g | biscoitos | bazar | pet |
| p7040 | Mesinha para Pizza LCPlast | congelados | bazar | bazar_casa |
| p7046 | Forma para Pizza Panelux Alumínio Polido 35cm | congelados | bazar | bazar_casa |
| p7047 | Cortador de Pizza Chic Lar Praticidade Unidade | congelados | bazar | bazar_casa |
| p7049 | Embalagem para Pizza Requinte 35cm Com 25 Unidades | congelados | bazar | bazar_casa |
| p7050 | Embalagem para Pizza Requinte 40cm Com 25 Unidades | congelados | bazar | bazar_casa |
| p7051 | Caixa para Pizza Requinte 45cm \| Com 25 Unidades | congelados | bazar | bazar_casa |
| p7052 | Caixa para Pizza Requinte 25cm \| Com 25 Unidades | congelados | bazar | bazar_casa |
| p7053 | Lasanha Seara Air Fryer Frango 300g | carnes | congelados | massa_fresca |
| p7055 | Lasanha Seara Frango 600g | carnes | congelados | massa_fresca |
| p7146 | Capeleti Frango Romena 250g | carnes | congelados | massa_fresca |
| p7150 | Talharim Nissin Miojo Frango 99g | carnes | mercearia | massa_seca |
| p7153 | Bifinho Keldog Frango Grelhado 250g | carnes | bazar | pet |
| p7168 | Ração Whiskas filhotes frango sachê 85g | carnes | bazar | pet |
| p7172 | Capeleti Zaccaron de frango congelado 400g | carnes | congelados | massa_fresca |
| p7177 | Bifinho Para Cães Keldog Frango Grelhado 60g | carnes | bazar | pet |
| p7180 | Ração para gatos Friskies ao molho frango sachê 85g | carnes | bazar | pet |
| p7181 | Ração para cães Pedigree frango ao molho sachê 100g | carnes | bazar | pet |
| p7183 | Ração para gato Monello sabor salmão, atum e frango 1Kg | carnes | bazar | pet |
| p7184 | Ração para cães Pedigree júnior frango ao molho sachê 100g | carnes | bazar | pet |
| p7211 | Forma Fuzipar para pizza nº35 | congelados | bazar | bazar_casa |
| p7340 | Capeletti Famigliare de Frango 250g | carnes | congelados | massa_fresca |
| p7358 | Tortellini Capricci Frango e Alecrim 250g | carnes | congelados | massa_fresca |
| p7362 | Biscoito Dog Chow Frango e Leite 500g | biscoitos | bazar | pet |
| p7365 | Ravioli D'itália com Recheio de Frango 300g | carnes | congelados | massa_fresca |
| p7368 | Massa Fresca Essasim Agnoline de Frango 500g | carnes | congelados | massa_fresca |
| p7369 | Massa Fresca Essasim Capeletti de Frango 500g | carnes | congelados | massa_fresca |
| p7370 | Petisco para Gatos Whiskas Dremies Frango 40g | carnes | bazar | pet |
| p7385 | Ração Úmida para Gatos Kitekat Frango Sachê 70g | carnes | bazar | pet |
| p7388 | Agnoline de Frango Tia Nora Congelado Pacote 400g | carnes | congelados | massa_fresca |
| p7389 | Alimento para Gatos Whiskas Sachê Frango Adulto 85g | carnes | bazar | pet |
| p7390 | Ração para Gatos Sidekick Premium Adulto Frango 1kg | carnes | bazar | pet |
| p7391 | Snacks para Cães Purina Doguitos Bifinho Frango 65g | carnes | bazar | pet |
| p7392 | Ração Seca para Gatos Filhotes Friskies Frango 850g | carnes | bazar | pet |
| p7394 | Ração para Gatos Sidekick Premium Castrados Frango 1kg | carnes | bazar | pet |
| p7399 | Ração Úmida para Gatos Friskies Frango ao Molho 85g | carnes | bazar | pet |
| p7401 | Ração para Cães Mandaí Dog Cães Adultos Frango 5kg | carnes | bazar | pet |
| p7402 | Petisco Cremoso para Gatos Sheba Frango e Peixe 48g | carnes | bazar | pet |
| p7406 | Saco para Assar Frango Poliéster Royalpack com 5 Unidades | carnes | bazar | bazar_casa |
| p7407 | Ração Úmida para Cães Sidekick Premium Adultos Frango 280g | carnes | bazar | pet |
| p7409 | Ração Úmida para Cães Dog Chow Frango ao Molho 100g | carnes | bazar | pet |
| p7413 | Ração para Gatos Mandaí Cat Mix de Frango e Peixe 3kg | carnes | bazar | pet |
| p7414 | Ração Úmida para Cães Pedigree Raças Pequenas Frango Sachê 100g | carnes | bazar | pet |
| p7417 | Ração para Gatos Mandaí Cat Mix de Frango e Peixe 500g | carnes | bazar | pet |
| p7418 | Ração Úmida para Gatos Fancy Feast Demi Glace com Frango 85g | carnes | bazar | pet |
| p7420 | Ração para Cães Sidekick Premium Especial Adultos Raças Pequenas Frango 1kg | carnes | bazar | pet |
| p7421 | Ração para Cães Sidekick Premium Especial Adultos Raças Pequenas Frango 3kg | carnes | bazar | pet |
| p7422 | Ração Úmida para Cães Adultos Dog Chow Frango e Arroz Sachê 85g | graos | bazar | pet |
| p7424 | Peitoral para Cães Sspets Tamanho P, M e G | mercearia | bazar | pet |
| p7425 | Peitoral para Cães SSPets Strong Reforçado até 30kg | mercearia | bazar | pet |
| p7426 | Bifinho para Cães Pedigree Filezinho de Churrasco 60g | carnes | bazar | pet |
| p7465 | Faca Para Tomates Tramontina 5 Polegadas Inox Plenus | hortifruti | bazar | bazar_casa |
| p7588 | Bifinho Para Cães Keldog Cenoura, Ervilha Batata Doce 60g | hortifruti | bazar | pet |
| p7594 | Ração para gatos Whiskas atum ao molho salsa sachê 85g | mercearia | bazar | pet |
| p7725 | Lava-Louças Líquido Maçã Ypê 500ml | hortifruti | limpeza | limpeza |
| p7739 | Lava Roupa Líquido Omo Coco 450ml | mercearia | limpeza | limpeza |
| p7781 | Amaciante De Roupa Concentrado Doces Sonhos Girando Sol Frasco 500ml | padaria | limpeza | limpeza |
| p7888 | Detergente Líquido Boltz Maçã 500ml | hortifruti | limpeza | limpeza |
| p7893 | Detergente Líquido Ypê Maçã 500ml | hortifruti | limpeza | limpeza |
| p7895 | Detergente Líquido Limpol Maçã 500ml | hortifruti | limpeza | limpeza |
| p7897 | Detergente Líquido Girando Sol Maçã 500ml | hortifruti | limpeza | limpeza |
| p7922 | Lava-Roupas Líquido Omo Bebê Squeeze 900ml | mercearia | limpeza | limpeza |
| p7937 | Lava Roupas Líquido Brilhante Limpeza Total 1,8 Litro | mercearia | limpeza | limpeza |
| p8051 | Nhoque Mezzani Batata 500g | hortifruti | congelados | massa_fresca |
| p8053 | Nhoque de Batata Famigliare 500g | hortifruti | congelados | massa_fresca |
| p8059 | Nhoque Santa Tavola Massa de Batata Integral 500g | hortifruti | congelados | massa_fresca |
| p8068 | Amassador de Batatas Brinox Inox 23cm | hortifruti | bazar | bazar_casa |
| p8094 | Pastilha adesiva Harpic 2 em 1 Pinho 9g leve 3 pague 2 | mercearia | limpeza | limpeza |
| p8105 | Papel Toalha Residence Picotada 2 Rolos | mercearia | limpeza | limpeza |
| p8137 | Papel Higiênico Neve Tecnologia Demacare 20 Metros Com 24 Unidades | hortifruti | higiene | higiene |
| p8138 | Papel Toalha Maxim Stylus 20,5x19cm 2 Rolos | mercearia | limpeza | limpeza |
| p8139 | Papel Toalha Snob Pack 3 Rolos 360 Folhas | mercearia | limpeza | limpeza |
| p8140 | Papel Toalha Mili 19X22cm \| Com 3 Rolos de 200 Folhas | mercearia | limpeza | limpeza |
| p8141 | Papel Toalha Mili Grand Chef \| Com 3 Rolos de 120 Folhas | mercearia | limpeza | limpeza |
| p8142 | Papel Toalha Kitchen Ultra Jumbo 360 Folhas Pacote com 3 Rolos de 120 Folhas | mercearia | limpeza | limpeza |
| p8184 | Amaciante para Roupas Girando Sol Concentrado Doces Sonhos 1,5 Litro | padaria | limpeza | limpeza |
| p8304 | DESINF.LYSOFORM 500ML TIRA-LIMO BORRIFADOR | mercearia | limpeza | limpeza |
| p8337 | Shampoo L'oréal Paris Elseve Liso dos Sonhos Frasco 200ml | padaria | higiene | higiene |
| p8365 | Shampoo Palmolive Maciez Prolongada Leite e Extrato de Coco 350ml | leites | higiene | higiene |
| p8388 | SH ELSEVE 400mL GLYCOLIC GLOSS | mercearia | higiene | higiene |
| p8613 | Sabonete líquido Seiva maçã verde 1l | hortifruti | higiene | higiene |
| p8617 | Sabonete Nivea Leite 85g | leites | higiene | higiene |
| p8640 | Sabonete Líquido de Aveia Hedera Refil 200ml | graos | higiene | higiene |
| p8645 | Sabonete Palmolive Leite E Petalas De Rosas 85g | leites | higiene | higiene |
| p8872 | Shampoo Elseve Cachos dos Sonhos 400ml | padaria | higiene | higiene |
| p8926 | Shampoo L'Oréal Paris Elseve Liso dos Sonhos Super Alinhador 400ml | padaria | higiene | higiene |
| p8962 | Kit Skala Amido de Milho Shampoo 325ml + Condicionador 200ml | graos | higiene | higiene |
| p8963 | Kit Elseve Longo dos Sonhos Shampoo 375ml + Condicionador 170ml | padaria | higiene | higiene |
| p8965 | Kit Elseve Cachos dos Sonhos Shampoo 375ml + Condicionador 170ml | padaria | higiene | higiene |
| p8976 | Kit L'Oréal Elseve Liso dos Sonhos Shampoo 375ml + Condicionador 170ml | padaria | higiene | higiene |
| p9151 | Sabonete Líquido Hedera Aveia Refil 370ml | graos | higiene | higiene |
| p9191 | Sabonete em Barra Biocrema Leite 90g | leites | higiene | higiene |
| p9213 | Sabonete em Barra Antibacteriano Protex Aveia 85g | graos | higiene | higiene |
| p9225 | Sabonete em Barra Antibacteriano Protex Macadâmia 85g | hortifruti | higiene | higiene |
| p9244 | Sabonete em Barra Nivea Aveia 85g | graos | higiene | higiene |
| p9247 | Sabonete em Barra Nivea Leite 85g | leites | higiene | higiene |
| p9258 | Sabonete Líquido Hedera Aveia 1 Litro | graos | higiene | higiene |
| p9321 | Sabonete Flor de Ypê Água de Coco e Alecrim 85g Unidade | bebidas | higiene | higiene |
| p9328 | Sabonete em Barra Siene Proteínas do Leite 85g Unidade | leites | higiene | higiene |
| p9365 | Sabonete em Barra Flor de Ypê Flor de Maçã e Framboesa 85g | hortifruti | higiene | higiene |
| p9369 | Sabonete Líquido Florde Ypê Flor de Maçã e Framboesa Refil Econômico 200ml | hortifruti | higiene | higiene |
| p9377 | Sabonete em Barra Vegetal Nivea Manteiga de Karité & Lima da Pérsia 80g | leites | higiene | higiene |
| p9380 | Sabonete Flor de Ypê Água de Coco e Aloe Vera 85g | bebidas | higiene | higiene |
| p9385 | Sabonete em Barra Nivea Hidratante Leite Promo 6 Unidades 85g | leites | higiene | higiene |
| p9395 | Sabonete em Barra Dove Delicious Care Leite de Coco 90g | leites | higiene | higiene |

## 4. Unidade em g/ml lida 1000x errada

Só foi corrigido o que a evidência torna inequívoco: `d,ddd g` / `d.ddd g` (um produto não pesa miligramas: é o milhar lido como decimal) e `d,dd ml` (mililitros com casas decimais é litro). Decimais legítimos como `100,8g`, `41,5g` e `112,5g` (o próprio nome traz o mesmo número) não foram tocados: a contagem de ~60 da auditoria incluía esses casos.

| Id | Nome | Antes | Depois |
|---|---|---|---|
| p328 | Carne Bovina Bordon Picanha Fatiada Congelada Kg (aprox 0,500g) | 0,500g | 500g |
| p877 | Bebida Láctea Carolina Frutas Vermelhas 1,250g | 1,250g | 1,25kg |
| p882 | Bebida Láctea Biolat Morango 1,150g | 1,150g | 1,15kg |
| p884 | Bebida Lactea Biolat Salada De Frutas Garrafa 1,150g | 1,150g | 1,15kg |
| p897 | Iogurte Líquido Nestlé Morango 1,250g | 1,250g | 1,25kg |
| p907 | Iogurte Líquido Danone Vitamina De Frutas 1,250g | 1,250g | 1,25kg |
| p908 | Iogurte Líquido Danone Morango 1,250g | 1,250g | 1,25kg |
| p909 | Iogurte Batavo Pense Morango Zero 1,150g | 1,150g | 1,15kg |
| p911 | Iogurte Líquido Nestlé Vitamina de Fruta 1,250g | 1,250g | 1,25kg |
| p929 | Iorgute Batavo Pense mamão zero 1,150g | 1,150g | 1,15kg |
| p977 | Leite fermentado Elegê 1,150g | 1,150g | 1,15kg |
| p5303 | Chocolate Kinder Bueno White 1.175g | 1.175g | 1,175kg |
| p6272 | Suco Integral De Uva Bebah Tinto Pet 1,35ml | 1,35ml | 1,35l |

Observados e não corrigidos (outro defeito, fora deste critério): p6003 (unidade `5,1g` vem de "5,1g de Proteína", o pacote é 270g); p662, p663, p664 (`5g` de uma cápsula, em caixa de 10).

## 5. Nomes com encoding quebrado

UTF-8 lido como Latin-1 (`LimÃ£o` -> `Limão`) e o apóstrofo que chegou como `¿` (`L¿OR` -> `L'OR`). Aplicado a nome, descrição e marca.

| Id | Campos | Antes | Depois |
|---|---|---|---|
| p2960 | name, descricao | Café L¿OR Gourmet Intenso Torrado e Moído Sachê 250g | Café L'OR Gourmet Intenso Torrado e Moído Sachê 250g |
| p2998 | name, descricao | Café L¿OR Solúvel Intense Liofilizado 40g | Café L'OR Solúvel Intense Liofilizado 40g |
| p4329 | name, descricao | Queijo ParmesÃ£o Ralado Gran Mestri 40g | Queijo Parmesão Ralado Gran Mestri 40g |
| p4725 | name, descricao | Refresco em Pó Zero Açucar Apti Sabor LimÃ£o 8g Envelope | Refresco em Pó Zero Açucar Apti Sabor Limão 8g Envelope |
| p7087 | name, descricao | Linguiça Suína D¿Talia Pernil Spaleta 600g | Linguiça Suína D'Talia Pernil Spaleta 600g |

## 6. Itens fora de supermercado (só listados, nenhum foi removido)

245 itens de pet e casa/eletro. A decisão de escopo (manter, criar categoria `pet`, filtrar na coleta) é do grupo. Todos continuam no catálogo, na categoria `bazar` ou na que já estavam.

| Id | Tipo | Rede | Categoria hoje | Nome |
|---|---|---|---|---|
| p701 | casa/eletro | Asun Supermercados | bazar | Coador de pano para café Stolf |
| p702 | casa/eletro | Asun Supermercados | bazar | Suporte Plástico para Filtro de Café Tamanho 102 |
| p1481 | pet | Fort Atacadista | bazar | Arroz Realengo Para Cães 5kg |
| p1633 | casa/eletro | Asun Supermercados | bazar | Cafeteira Cadence Desperta 18 Cafés 220V |
| p1720 | casa/eletro | Asun Supermercados | bazar | Oxford Xicara Chá 200ml C/pires Chá das 5 |
| p1721 | casa/eletro | Asun Supermercados | bazar | Colher de chá polyood vermelho |
| p1722 | casa/eletro | Asun Supermercados | bazar | Colher para chá Ipanema vermelho |
| p1724 | casa/eletro | Asun Supermercados | bazar | Oxford Xicara Chá 200ml C/pires White |
| p1725 | casa/eletro | Asun Supermercados | bazar | Colher de chá polyood castanho Tramontina |
| p1727 | casa/eletro | Asun Supermercados | bazar | Oxford Prato Raso 26cm Chá das 5 |
| p1728 | casa/eletro | Asun Supermercados | bazar | Oxford Prato Fundo 21,5cm Chá das 5 |
| p1729 | casa/eletro | Asun Supermercados | bazar | Oxford Prato Sobremesa 18cm Chá das 5 |
| p1733 | casa/eletro | Asun Supermercados | bazar | Varal De Chão Mor Slim sem abas |
| p1738 | pet | Asun Supermercados | bazar | Ração Para Cão Champ Sabor Frango 85g |
| p1739 | casa/eletro | Asun Supermercados | bazar | Papel Sulfite A4 Chamequinho Com 100 Unidades |
| p1746 | casa/eletro | Asun Supermercados | bazar | Taça para champagne Nadir Figueiredo Bistrô 186ml |
| p1749 | pet | Asun Supermercados | bazar | Ração Para Cão Filhote Champ Sabor Frango 85g |
| p1752 | pet | Asun Supermercados | bazar | Ração Úmida Champ para Cães Adultos Sabor Caseiro Carne 85g |
| p1754 | pet | Asun Supermercados | bazar | Alimento para Cães Filhotes Carne & Cereal Champ Sabor de Casa Pacote 900g |
| p1755 | pet | Asun Supermercados | bazar | Alimento para Cães Adultos Carne & Cereal Champ Sabor de Casa Pacote 900g |
| p1803 | pet | Asun Supermercados | bazar | Petisco Para Cães Pedigree Tasty Bites Leite 80g |
| p1804 | pet | Asun Supermercados | bazar | Bifinho Para Cães Keldog Mini Bites Carne & Leite 50g |
| p1863 | pet | Fort Atacadista | bazar | Ração para Gatos Whiskas Filhotes Carne e Leite 900g |
| p1868 | pet | Fort Atacadista | bazar | Ração para Cães Purina Alpo Filhotes Carne, Leite e Cereais 10,1kg |
| p1869 | pet | Fort Atacadista | bazar | Ração Alpo Cães Filhotes Carne, Frango, Cereais, Vegetais e Leite 1kg |
| p1870 | pet | Fort Atacadista | bazar | Ração Seca para Cães Filhotes Buzz Sabor Carne e Leite Saco 1kg |
| p1871 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Filhotes Dog Chow Carne e Leite Sachê 85g |
| p1872 | pet | Fort Atacadista | bazar | Ração para Cães Pedigree Adulto +9 Nutrição Essencial Carne ao Leite 10,1kg |
| p1876 | casa/eletro | Fort Atacadista | bazar | Panela Fervedor/Leiteira Panelux Polido 1,6L |
| p1998 | pet | Fort Atacadista | bazar | Ração para Cães Champ Sachê Carne 85g |
| p1999 | pet | Fort Atacadista | bazar | Ração para Cães Champ Sachê Frango 85g |
| p2002 | casa/eletro | Fort Atacadista | bazar | Vela Junco Chá Revelação Azul |
| p2003 | casa/eletro | Fort Atacadista | bazar | Vela Junco Chá Revelação Rosa |
| p2005 | casa/eletro | Fort Atacadista | bazar | Peneira para Chá Plasvale Média Unidade |
| p2017 | casa/eletro | Fort Atacadista | bazar | Colher Descartável Strawplast Café, Chá e Doces Cristal Com 200 Unidades |
| p2019 | casa/eletro | Fort Atacadista | bazar | Brinquedo Conjunto Chá com Biscoito Doce Cozinha Cardoso Unidade |
| p2035 | casa/eletro | Fort Atacadista | bazar | Taça de Champanhe Bohemia Xtra em Cristal 210ml |
| p2043 | casa/eletro | Fort Atacadista | bazar | Taça Vidro Nadir Figueiredo Windsor Champagne 210ml |
| p2044 | casa/eletro | Fort Atacadista | limpeza | Varal de Chão Mor Slim com Abas \| Ref:6105 |
| p2052 | pet | Fort Atacadista | bazar | Ração para Cães Champ Adultos Carne e Cereal 18kg |
| p2054 | casa/eletro | Fort Atacadista | bazar | Taça para Espumante e Champanhe de Cristal Pasabahce 220ml |
| p2917 | casa/eletro | Asun Supermercados | bazar | Abridor de lata Q-Util |
| p3113 | casa/eletro | Fort Atacadista | bazar | Cafeteira Elétrica Britânia BCF19A 18 Xícaras 220V |
| p3122 | casa/eletro | Fort Atacadista | bazar | Chinelo Havaianas Café 39/40 Top |
| p3123 | casa/eletro | Fort Atacadista | bazar | Chinelo Havaianas Café 41/42 Top |
| p3125 | casa/eletro | Fort Atacadista | bazar | Prato Veneza West Garden 12cm Café |
| p3126 | casa/eletro | Fort Atacadista | bazar | Prato Veneza West Garden 18cm Café |
| p3127 | casa/eletro | Fort Atacadista | bazar | Vaso Veneza West Garden 20x17cm Café |
| p3128 | casa/eletro | Fort Atacadista | bazar | Vaso Veneza West Garden 15x15cm Café |
| p3130 | casa/eletro | Fort Atacadista | bazar | Chinelo Havaianas 39/40 Café Slim Animals |
| p3131 | casa/eletro | Fort Atacadista | bazar | Chinelo Havaianas 35/36 Café Slim Animals |
| p3132 | casa/eletro | Fort Atacadista | bazar | Chinelo Havaianas 37/38 Café Slim Animals |
| p3163 | casa/eletro | Fort Atacadista | bazar | Kit Café Prático Unitermi com Garrafa Térmica e Suporte para Filtro |
| p3174 | casa/eletro | Fort Atacadista | bazar | Jogo de Xícaras de Café Casa Tem Morocc Honey 90ml Caixa com 6 Unidades |
| p3176 | casa/eletro | Fort Atacadista | bazar | Chinelo Havaianas Café 37/38 Top |
| p3178 | casa/eletro | Fort Atacadista | bazar | Jogo de Xícaras para Café Brasília 90ml com 5 unidades |
| p3275 | casa/eletro | Fort Atacadista | bazar | Caixa de Som Amplificada Philco PCX3800 Bivolt |
| p3282 | casa/eletro | Fort Atacadista | bazar | Caixa de Isopor Knauf Térmica com Alça 17L |
| p3295 | casa/eletro | Fort Atacadista | bazar | Jogo de Copos de Vidro Durax 420ml Caixa com 6 Unidades |
| p3296 | casa/eletro | Fort Atacadista | bazar | Jogo de Copos de Vidro Durax 350ml Caixa com 6 Unidades |
| p3298 | casa/eletro | Fort Atacadista | bazar | Caixa para Cesta de Natal Pequena Impresso Modelo SDB |
| p3299 | casa/eletro | Fort Atacadista | bazar | Caixa para Cesta de Natal Grande Impresso Modelo SDB |
| p3301 | casa/eletro | Fort Atacadista | bazar | Jogo de Copos de Vidro Durax Geo 420ml Caixa com 6 Unidades |
| p3302 | casa/eletro | Fort Atacadista | bazar | Jogo de Taças de Vidro Turim Lótus 230ml Caixa com 6 Unidades |
| p3313 | casa/eletro | Fort Atacadista | bazar | Jogo de Colheres de Mesa em Aço Inox Casa Tem Caixa com 6 Unidades |
| p3314 | casa/eletro | Fort Atacadista | bazar | Jogo de Potes de Vidro com Tampa Inox Casa Tem Caixa com 4 Unidades |
| p3316 | casa/eletro | Fort Atacadista | bazar | Jogo de Copos de Vidro Casa Tem Clear Diamond 300ml Caixa com 6 Unidades |
| p3318 | pet | Fort Atacadista | bazar | Alimento para Gatos Whiskas Patê de Carne Adulto Lata 290g |
| p3319 | casa/eletro | Fort Atacadista | bazar | Jogo de Garfos de Mesa em Aço Inox Em Casa Tem Silver Caixa com 6 Unidades |
| p3320 | casa/eletro | Fort Atacadista | bazar | Jogo de Facas de Mesa em Aço Inox Em Casa Tem Silver Caixa com 6 Unidades |
| p3694 | casa/eletro | Asun Supermercados | bazar | Socador de feijão Stolf com suporte 28cm |
| p4105 | casa/eletro | Fort Atacadista | bazar | Fritadeira sem Óleo Air Fryer Chic Lar 5 Litros 220V |
| p4391 | casa/eletro | Fort Atacadista | bazar | Espátula Cortadora de Queijo Chic Lar Inox |
| p4405 | casa/eletro | Fort Atacadista | bazar | Porta Queijo Chic Lar com Tampa 19cm Unidade |
| p4406 | casa/eletro | Fort Atacadista | bazar | Plaina para Queijo Brinox em Aço Inox Unidade |
| p4621 | casa/eletro | Fort Atacadista | bazar | Açucareiro Unitermi 350ml Sortido |
| p5166 | casa/eletro | Fort Atacadista | bazar | Espátula para Bolo Chic Lar Silver Unidade |
| p5167 | casa/eletro | Fort Atacadista | bazar | Forma para Bolo e Pudim Chic Lar 22cm |
| p5168 | casa/eletro | Fort Atacadista | bazar | Forma Chic Lar Lisa para Bolo e Pudim |
| p5169 | casa/eletro | Fort Atacadista | bazar | Porta Bolo Chic Lar com Tampa 33cm Unidade |
| p5170 | casa/eletro | Fort Atacadista | bazar | Prato de Vidro para Bolo Milan Casa Glass 29cm |
| p5171 | casa/eletro | Fort Atacadista | bazar | Prato para Bolo de Vidro Clear Daisy 33cm Unidade |
| p5188 | casa/eletro | Fort Atacadista | bazar | Brinquedo Baby Land Cardoso Bolofante com Formas Geométricas |
| p5189 | casa/eletro | Fort Atacadista | bazar | Kit para Decoração de Bolos Chic Lar com 9 peças |
| p5769 | casa/eletro | Asun Supermercados | bazar | Forma para bolo Fuzipar com tubo n°24 |
| p5770 | casa/eletro | Asun Supermercados | bazar | Forma para bolo Fuzipar com tubo N18 1,30L |
| p5771 | casa/eletro | Asun Supermercados | bazar | Prato Plastico Minaplast Bolo 15cm Com 10 Unidades |
| p5961 | casa/eletro | Fort Atacadista | bazar | Porta Macarrão Sanremo em Plástico Unidade |
| p5964 | casa/eletro | Fort Atacadista | bazar | Tapete para Banheiro Macarrão Bene 38x58cm Cores Sortidas |
| p6057 | casa/eletro | Fort Atacadista | bazar | Espátula Pão Duro Brinox Ultra 29cm |
| p6059 | casa/eletro | Fort Atacadista | bazar | Faca Tramontina Profit para Pão Branca 7'' |
| p6304 | casa/eletro | Asun Supermercados | bazar | Espremedor De suco Valencia Em Plastico |
| p6393 | casa/eletro | Asun Supermercados | bazar | Copo Munich Pilsen Cerveja Chopp 200ml |
| p6409 | casa/eletro | Asun Supermercados | bazar | Copo Cerveja Globim Habesha 340mL |
| p6410 | casa/eletro | Asun Supermercados | bazar | Copo de cerveja Nf munich 300ml |
| p6414 | casa/eletro | Asun Supermercados | bazar | Copo para chopp Minaplast branco 400ml |
| p6464 | casa/eletro | Asun Supermercados | bazar | Copo Cisper Stylo Água 260ml |
| p6465 | casa/eletro | Asun Supermercados | bazar | Taça Nadir Buffet Água 300ml |
| p6466 | casa/eletro | Asun Supermercados | bazar | Taca lirio nadir para água 365ml |
| p6586 | pet | Asun Supermercados | bazar | Ração Cão Brix Pet Carne 7Kg |
| p6590 | casa/eletro | Asun Supermercados | bazar | Tábua De Carne Stolf Madeira 22x40cm |
| p6591 | pet | Asun Supermercados | bazar | Ração Pedigree carne e vegetais 900g |
| p6592 | pet | Asun Supermercados | bazar | Petisco para Gatos Dreamies Carne 40g |
| p6594 | pet | Asun Supermercados | bazar | Ração para gatos Whiskas carne sachê 85g |
| p6595 | pet | Asun Supermercados | bazar | Ração para gatos Leroy grille carne 1kg |
| p6601 | pet | Asun Supermercados | bazar | Petisco Para Cães Pedigree Tasty Bites Carne 40g |
| p6602 | pet | Asun Supermercados | bazar | Ração para gatos Whiskas Carne filhote sachê 85g |
| p6603 | pet | Asun Supermercados | bazar | Ração para gatos Friskies filhote carne sachê 85g |
| p6604 | pet | Asun Supermercados | bazar | Ração para gatos Whiskas castrados carne sachê 85g |
| p6605 | pet | Asun Supermercados | bazar | Ração para cães Frily Dog carne e cereais 1kg |
| p6606 | pet | Asun Supermercados | bazar | Ração Cão Bolly Adulto Carne e Frango Premium 1Kg |
| p6607 | pet | Asun Supermercados | bazar | Ração para cães Pedigree carne ao molho sachê 100g |
| p6608 | pet | Asun Supermercados | bazar | Ração Pedigree Nutrição Essencial Carne para Cães Adultos 900g |
| p6609 | pet | Asun Supermercados | bazar | Ração para cães Pedigree filhotes carne ao molho sachê 100g |
| p6616 | pet | Asun Supermercados | bazar | Ração Pedigree carne, frango e ceral 900g |
| p6617 | pet | Asun Supermercados | bazar | Ração Premium para Cães Filhotes Pedigree Carne, Frango e Cereais 900g |
| p6642 | casa/eletro | Fort Atacadista | bazar | Garfo Chic Lar para Carne Inox |
| p6646 | pet | Fort Atacadista | bazar | Ração para Gatos Whiskas Carne 900g |
| p6647 | pet | Fort Atacadista | bazar | Petisco para Gatos Carne Dreamies 80g |
| p6653 | pet | Fort Atacadista | bazar | Ração para Cães Adultos Buzz Carne 1kg |
| p6654 | pet | Fort Atacadista | bazar | Ração para Gatos Purina Gatsy Carne 1kg |
| p6656 | pet | Fort Atacadista | bazar | Snack para Cães Sidekick Premium Carne 50g |
| p6657 | casa/eletro | Fort Atacadista | bazar | Faca para Carne Tramontina Polywood Inox 8 |
| p6660 | casa/eletro | Fort Atacadista | bazar | Faca para Carne Tramontina Profit Branca N8 |
| p6661 | pet | Fort Atacadista | bazar | Ração Mandaí Cães Adultos Carne Classic 5kg |
| p6662 | pet | Fort Atacadista | bazar | Ração para Cães Mandaí Dog Classic Carne 1kg |
| p6663 | pet | Fort Atacadista | bazar | Ração para Cães Mandaí Dog Classic Carne 3kg |
| p6665 | pet | Fort Atacadista | bazar | Ração para Gatos Kite Kat Carne Adultos 2,7kg |
| p6666 | pet | Fort Atacadista | bazar | Ração para Gatos Whiskas Adultos 1+ Carne 2,7kg |
| p6667 | pet | Fort Atacadista | bazar | Ração Seca para Gatos Friskies Mix Carne 850g |
| p6668 | pet | Fort Atacadista | bazar | Ração para Cães Mandaí Dog Classic Carne 10,1kg |
| p6669 | pet | Fort Atacadista | bazar | Ração Úmida para Gatos Kitekat Carne Sachê 70g |
| p6670 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Pedigree Carne Lata 280g |
| p6672 | pet | Fort Atacadista | bazar | Petisco para Gatos Friskies Party Mix Carne 40g |
| p6673 | pet | Fort Atacadista | bazar | Petisco para Cães Pedigree Tasty Bites Carne 80g |
| p6674 | pet | Fort Atacadista | bazar | Ração Úmida para Gatos Sidekick Premium Carne 280g |
| p6675 | pet | Fort Atacadista | bazar | Ração para Gatos Purina Gatsy Adultos Carne 10,1kg |
| p6676 | pet | Fort Atacadista | bazar | Bifinho para Cães Pedigree Filezinho de Carne 60g |
| p6677 | pet | Fort Atacadista | bazar | Petisco para Cães Petbrilho Bifinhos Sabor Carne 65g |
| p6678 | pet | Fort Atacadista | bazar | Ração para Gatos Whiskas Carne Gatos Castrados 900g |
| p6683 | pet | Fort Atacadista | bazar | Ração Úmida para Gatos Friskies Carne ao Molho 85g |
| p6684 | pet | Fort Atacadista | bazar | Ração para Cães Mandaí Dog Pequeno Porte Carne 1kg |
| p6685 | pet | Fort Atacadista | bazar | Ração para Cães Mandaí Dog Porte Pequeno Carne 3kg |
| p6686 | pet | Fort Atacadista | bazar | Ração para Cães Mandaí Dog Porte Pequeno Carne 10,1kg |
| p6687 | pet | Fort Atacadista | bazar | Ração para Cães Adultos Sabor Carne Buzz Pacote 10,1kg |
| p6688 | pet | Fort Atacadista | bazar | Ração Seca para Gatos Castrados Friskies Mix Carne 2,5kg |
| p6689 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Sidekick Premium Adultos Carne 280g |
| p6690 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Pedigree Filhotes Carne Sachê 100g |
| p6691 | pet | Fort Atacadista | bazar | Ração para Gatos Whiskas Carne para Gatos Castrados 2,7kg |
| p6692 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Sidekick Filhotes Patê de Carne 280g |
| p6693 | pet | Fort Atacadista | bazar | Ração para Cães Purina Bonzo Adultos Carne e Cereais 18kg |
| p6694 | pet | Fort Atacadista | bazar | Ração para Cães Purina Alpo Adulto Carne com Vegetais 1kg |
| p6695 | pet | Fort Atacadista | bazar | Ração para Cães Purina Alpo Adulto Carne com Vegetais 10,1kg |
| p6696 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Pedigree Raças Pequenas Carne Sachê 100g |
| p6698 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Dog Chow Adulto Carne ao Molho 100g |
| p6699 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Pedigree + 7 Anos Carne Sachê 100gr |
| p6700 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Adultos Carne e Porco Dog Chow 85g |
| p6701 | pet | Fort Atacadista | bazar | Ração Úmida para Gatos Fancy Feast Demi Glace com Carne 85g |
| p6702 | pet | Fort Atacadista | bazar | Ração Seca para Cães Adultos Bonzo Carne e Cereais Saco 15kg |
| p6703 | pet | Fort Atacadista | bazar | Ração Úmida para Gatos Whiskas Adulto Carne ao Molho Sachê 85g |
| p6704 | pet | Fort Atacadista | bazar | Ração Úmida para Gatos Whiskas Filhote Carne ao Molho Sachê 85g |
| p6706 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Pedigree Filhotes Carne e Frango Lata 280g |
| p6707 | pet | Fort Atacadista | bazar | Ração para Cães Adultos Raças Pequenas Carne e Vegetais Pedigree 7Kg |
| p6708 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Adultos Dog Chow Carne e Arroz Sachê 85g |
| p6709 | pet | Fort Atacadista | bazar | Ração para Cães Pedigree Nutrição Essencial Adultos Carne 10,1kg Grátis 1,1kg |
| p6710 | pet | Fort Atacadista | bazar | Ração para Cães Filhotes Médios Carne Frango e Arroz Dog Chow 900g |
| p6712 | pet | Fort Atacadista | bazar | Ração para Cães Dog Chow Carne e Frango Adultos Médios e Grandes 900g |
| p6713 | pet | Fort Atacadista | bazar | Ração Dog Chowpara Cães Adultos Minis e Pequenos Sabor Carne e Frango 900g |
| p6714 | pet | Fort Atacadista | bazar | Ração Dog Chow para Cães Adultos Médios Grandes Sabor Carne e Frango 2,5kg |
| p6715 | pet | Fort Atacadista | bazar | Ração Dog Chow para Cães Adultos Minis Pequenos Sabor Carne e Frango 2,5kg |
| p6716 | pet | Fort Atacadista | bazar | Ração para Cães Pedigree Adultos Raças Minis e Pequenas Carne e Vegetais 900g |
| p6717 | pet | Fort Atacadista | bazar | Ração para Cães Pedigree Adultos 12 Meses a 7 Anos Carne e Vegetais 2,7kg |
| p6718 | pet | Fort Atacadista | bazar | ALIM.GATOS FANCY FEAST 75G.SUPREMO CARNE |
| p6719 | pet | Fort Atacadista | bazar | Ração Seca para Cães Adultos de Porte Pequeno e Médio Buzz Sabor Carne Saco 1kg |
| p6721 | pet | Fort Atacadista | bazar | Ração Úmida Sachê Pedigree Sabor Carne e Frango para Cães Adultos Pack Leve 9 Pague 7 |
| p6722 | pet | Fort Atacadista | bazar | Ração Dog Chow para Cães Adultos Maiores de 7 anos Extralife Sabor Carne e Frango 900g |
| p6723 | pet | Fort Atacadista | bazar | Ração Úmida Sachê Pedigree Sabor Frango, Cordeiro e Carne para Cães Adultos Pack Leve 9 Pague 7 |
| p6724 | pet | Fort Atacadista | bazar | Ração Úmida Sachê Whiskas Sabor Carne e Peixe para Gatos Adultos Castrados Pack Leve 9 Pague 7 |
| p6725 | pet | Fort Atacadista | bazar | Ração para Cães Pedigree Adultos 12 Meses a 7 Anos Raças Minis e Pequenas Carne e Vegetais 2,7kg |
| p6728 | pet | Fort Atacadista | bazar | Ração para Gatos Kite Kat Mix de Carnes 900g |
| p6730 | pet | Fort Atacadista | bazar | Ração Seca para Gatos Buzz Sabor Mix de Carnes Saco 1kg |
| p6733 | pet | Fort Atacadista | bazar | Ração para Gatos Adultos Sabor Mix de Carnes Buzz Pacote 2,5kg |
| p6734 | pet | Fort Atacadista | bazar | Ração Seca para Gatos Adultos Friskies Mix de Carnes Saco 2,5kg |
| p6736 | pet | Fort Atacadista | bazar | Ração para Cães Pedigree Filhotes Carne, Frango e Cereais 900g |
| p6737 | pet | Fort Atacadista | bazar | Ração para Cães Purina Dog Chow Extra Life Adultos Médios e Grandes Carne, Frango e Arroz 10,1kg |
| p6738 | pet | Fort Atacadista | bazar | Ração Nestlé Purina Dog Chow Extralife Adultos Minis e Pequenos Carne, Frango e Arroz 10,1kg |
| p6890 | casa/eletro | Fort Atacadista | bazar | Copo LAV para Cerveja 330ml |
| p6891 | casa/eletro | Fort Atacadista | bazar | Taça para Cerveja LAV 400ml |
| p6892 | casa/eletro | Fort Atacadista | bazar | Copo Nadir Figueiredo Munich para Cerveja 200ml |
| p6893 | casa/eletro | Fort Atacadista | bazar | Copo Nadir Figueiredo Munich para Cerveja 300ml |
| p6894 | casa/eletro | Fort Atacadista | bazar | Taça Nadir Figueiredo Floripa para Cerveja 300ml |
| p6897 | casa/eletro | Fort Atacadista | bazar | Caneca Chopp Durax Facetado 400ml |
| p6898 | casa/eletro | Fort Atacadista | bazar | Copo Descartável Copobras para Chopp Transparente 300ml Com 100 Unidades |
| p6994 | casa/eletro | Fort Atacadista | bazar | Suporte para Galão de Água Unitermi Sortido Unidade |
| p6997 | casa/eletro | Fort Atacadista | bazar | Taça Bohemia Cristal para Água e Vinho Branco 480ml |
| p6999 | casa/eletro | Fort Atacadista | bazar | Jogo de 6 Taças de Água LAV Fame Coloridas 395ml |
| p7000 | casa/eletro | Fort Atacadista | bazar | Copo de Água Descartavel Branco Copobras 180ml Com 100 Unidades |
| p7001 | casa/eletro | Fort Atacadista | bazar | Copo Descartável Copobras para Água Transparente 180ml Com 100 Unidades |
| p7006 | casa/eletro | Fort Atacadista | bazar | Lança-água Mor Bichinhos Cor Sortida |
| p7010 | pet | Asun Supermercados | bazar | Biscoito Keldog+crock Integral Original 400g |
| p7040 | casa/eletro | Fort Atacadista | bazar | Mesinha para Pizza LCPlast |
| p7046 | casa/eletro | Fort Atacadista | bazar | Forma para Pizza Panelux Alumínio Polido 35cm |
| p7047 | casa/eletro | Fort Atacadista | bazar | Cortador de Pizza Chic Lar Praticidade Unidade |
| p7049 | casa/eletro | Fort Atacadista | bazar | Embalagem para Pizza Requinte 35cm Com 25 Unidades |
| p7050 | casa/eletro | Fort Atacadista | bazar | Embalagem para Pizza Requinte 40cm Com 25 Unidades |
| p7051 | casa/eletro | Fort Atacadista | bazar | Caixa para Pizza Requinte 45cm \| Com 25 Unidades |
| p7052 | casa/eletro | Fort Atacadista | bazar | Caixa para Pizza Requinte 25cm \| Com 25 Unidades |
| p7153 | pet | Asun Supermercados | bazar | Bifinho Keldog Frango Grelhado 250g |
| p7168 | pet | Asun Supermercados | bazar | Ração Whiskas filhotes frango sachê 85g |
| p7177 | pet | Asun Supermercados | bazar | Bifinho Para Cães Keldog Frango Grelhado 60g |
| p7180 | pet | Asun Supermercados | bazar | Ração para gatos Friskies ao molho frango sachê 85g |
| p7181 | pet | Asun Supermercados | bazar | Ração para cães Pedigree frango ao molho sachê 100g |
| p7183 | pet | Asun Supermercados | bazar | Ração para gato Monello sabor salmão, atum e frango 1Kg |
| p7184 | pet | Asun Supermercados | bazar | Ração para cães Pedigree júnior frango ao molho sachê 100g |
| p7211 | casa/eletro | Asun Supermercados | bazar | Forma Fuzipar para pizza nº35 |
| p7362 | pet | Fort Atacadista | bazar | Biscoito Dog Chow Frango e Leite 500g |
| p7370 | pet | Fort Atacadista | bazar | Petisco para Gatos Whiskas Dremies Frango 40g |
| p7385 | pet | Fort Atacadista | bazar | Ração Úmida para Gatos Kitekat Frango Sachê 70g |
| p7389 | pet | Fort Atacadista | bazar | Alimento para Gatos Whiskas Sachê Frango Adulto 85g |
| p7390 | pet | Fort Atacadista | bazar | Ração para Gatos Sidekick Premium Adulto Frango 1kg |
| p7391 | pet | Fort Atacadista | bazar | Snacks para Cães Purina Doguitos Bifinho Frango 65g |
| p7392 | pet | Fort Atacadista | bazar | Ração Seca para Gatos Filhotes Friskies Frango 850g |
| p7394 | pet | Fort Atacadista | bazar | Ração para Gatos Sidekick Premium Castrados Frango 1kg |
| p7399 | pet | Fort Atacadista | bazar | Ração Úmida para Gatos Friskies Frango ao Molho 85g |
| p7401 | pet | Fort Atacadista | bazar | Ração para Cães Mandaí Dog Cães Adultos Frango 5kg |
| p7402 | pet | Fort Atacadista | bazar | Petisco Cremoso para Gatos Sheba Frango e Peixe 48g |
| p7406 | casa/eletro | Fort Atacadista | bazar | Saco para Assar Frango Poliéster Royalpack com 5 Unidades |
| p7407 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Sidekick Premium Adultos Frango 280g |
| p7409 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Dog Chow Frango ao Molho 100g |
| p7413 | pet | Fort Atacadista | bazar | Ração para Gatos Mandaí Cat Mix de Frango e Peixe 3kg |
| p7414 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Pedigree Raças Pequenas Frango Sachê 100g |
| p7417 | pet | Fort Atacadista | bazar | Ração para Gatos Mandaí Cat Mix de Frango e Peixe 500g |
| p7418 | pet | Fort Atacadista | bazar | Ração Úmida para Gatos Fancy Feast Demi Glace com Frango 85g |
| p7420 | pet | Fort Atacadista | bazar | Ração para Cães Sidekick Premium Especial Adultos Raças Pequenas Frango 1kg |
| p7421 | pet | Fort Atacadista | bazar | Ração para Cães Sidekick Premium Especial Adultos Raças Pequenas Frango 3kg |
| p7422 | pet | Fort Atacadista | bazar | Ração Úmida para Cães Adultos Dog Chow Frango e Arroz Sachê 85g |
| p7424 | pet | Fort Atacadista | bazar | Peitoral para Cães Sspets Tamanho P, M e G |
| p7425 | pet | Fort Atacadista | bazar | Peitoral para Cães SSPets Strong Reforçado até 30kg |
| p7426 | pet | Fort Atacadista | bazar | Bifinho para Cães Pedigree Filezinho de Churrasco 60g |
| p7465 | casa/eletro | Asun Supermercados | bazar | Faca Para Tomates Tramontina 5 Polegadas Inox Plenus |
| p7588 | pet | Asun Supermercados | bazar | Bifinho Para Cães Keldog Cenoura, Ervilha Batata Doce 60g |
| p7594 | pet | Asun Supermercados | bazar | Ração para gatos Whiskas atum ao molho salsa sachê 85g |
| p8068 | casa/eletro | Fort Atacadista | bazar | Amassador de Batatas Brinox Inox 23cm |
| p8982 | pet | Fort Atacadista | higiene | Kit Sanol Dog Shampoo Neutro 500ml, Colônia 120ml Grátis Condicionador Revitalizante 500ml |
| p9397 | casa/eletro | Fort Atacadista | higiene | Porta Sabonete Líquido Coza 290ml Cinza Serene |
