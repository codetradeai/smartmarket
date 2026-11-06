# Auditoria: preços fora da rede de origem que não eram simulados por fator

Commit de referência: `12a9edc` (data.js regenerado sem preço simulado). Fonte: `git show 12a9edc^:frontend/src/data.js`.

## Critério

Antes de `12a9edc`, cada produto tinha preço nas 8 redes. Para cada produto, os 7 preços fora da rede de origem (`supermercadoOrigem`) foram comparados com as duas tabelas de fatores removidas em `6dc390d`:
- **gerador:** zaffari ×1,05, rissul ×1,02, asun ×0,99, stok ×0,94, atacadao ×0,95, master ×1,03, fort ×0,96, carrefour ×1,04;
- **sincronizador:** como a do gerador, mas asun ×1,04 e carrefour ×1,02 quando a origem não é Asun.

A base é a mediana das bases implícitas dos 7 preços. Um preço é listado quando fica a mais de R$ 0,02 do esperado pela tabela que melhor explica o produto.
Esses preços **provavelmente foram coletados de verdade**: o sincronizador antigo (`sincronizar_catalogo_completo.py`) casava produtos por `idOrigem` ou por nome exato, sem EAN e sem olhar a rede, e gravava `prices[rede]`. Como o casamento não é confiável, eles saíram junto com os simulados. Ficam aqui caso alguém queira recuperá-los por vínculo de EAN.

## Resumo

- **113 preços** em **111 produtos**.
- Por rede removida: fort 87, asun 17, zaffari 5, stok 4.
- Por origem → rede removida: asun → fort: 73, fort → asun: 10, master → fort: 4, rissul → fort: 4, rissul → stok: 4, rissul → zaffari: 4, master → asun: 3, stok → fort: 3, rissul → asun: 2, zaffari → fort: 2, atacadao → fort: 1, zaffari → asun: 1, stok → zaffari: 1, stok → asun: 1.

## Lista

| # | id | Produto | Origem | Preço na origem | Rede | Preço removido | Esperado pela tabela | Tabela |
|---|---|---|---|---|---|---|---|---|
| 1 | p7 | Biscoito Marilan Maizena 300g | atacadao | 4.49 | fort | 5.49 | 4.31 | gerador |
| 2 | p53 | Açúcar Demerara Caravelas 1kg | master | 5.89 | fort | 4.49 | 5.66 | gerador |
| 3 | p54 | Açúcar Refinado Caravelas 5kg | master | 19.90 | fort | 14.90 | 19.10 | gerador |
| 4 | p55 | Açúcar Mascavo Guimarães 500g | master | 7.99 | asun | 8.79 | 7.91 | gerador |
| 5 | p56 | Açúcar Cristal Colombo 1kg | master | 3.59 | fort | 3.19 | 3.44 | gerador |
| 6 | p60 | Açúcar Refinado União 1kg | master | 4.69 | asun | 4.79 | 4.64 | gerador |
| 7 | p103 | Refrigerante Fanta Laranja Pet 600ml | master | 4.99 | asun | 3.99 | 4.94 | gerador |
| 8 | p103 | Refrigerante Fanta Laranja Pet 600ml | master | 4.99 | fort | 4.69 | 4.79 | gerador |
| 9 | p133 | Óleo de Soja Coamo Pet 900ml | rissul | 7.29 | fort | 6.85 | 7.00 | gerador |
| 10 | p163 | Refrigerante Coca-Cola Pet 200ml | rissul | 1.69 | fort | 1.75 | 1.62 | gerador |
| 11 | p165 | Cerveja Heineken Long Neck 330ml | rissul | 6.99 | fort | 5.99 | 6.71 | gerador |
| 12 | p182 | Pão de Forma Farias 500g | rissul | 7.49 | asun | 6.99 | 7.41 | gerador |
| 13 | p184 | Pão de Forma Pullman Tradicional 480g | rissul | 8.69 | asun | 11.29 | 8.60 | gerador |
| 14 | p232 | Leite Elegê Uht Semidesnatado Zero Lactose 1l | rissul | 5.60 | stok | 5.49 | 5.16 | gerador |
| 15 | p233 | Leite Italac Uht Integral 1l | rissul | 4.84 | stok | 4.75 | 4.46 | gerador |
| 16 | p333 | Óleo de Soja Coamo 900ml | zaffari | 7.69 | asun | 7.49 | 7.61 | gerador |
| 17 | p335 | Leite Condensado Semidesnatado Piracanjuba 395g | zaffari | 5.98 | fort | 5.49 | 5.74 | gerador |
| 18 | p338 | Açúcar Refinado Caravelas 1kg | rissul | 3.86 | zaffari | 3.78 | 3.97 | gerador |
| 19 | p338 | Açúcar Refinado Caravelas 1kg | rissul | 3.86 | fort | 3.79 | 3.63 | gerador |
| 20 | p349 | Refrigerante Fruki Guaraná Zero 200ml | stok | 1.65 | zaffari | 1.75 | 1.83 | gerador |
| 21 | p392 | Tomate Italiano | rissul | 20.30 | zaffari | 19.90 | 20.89 | gerador |
| 22 | p393 | Cenoura | rissul | 5.09 | zaffari | 4.99 | 5.24 | gerador |
| 23 | p396 | Maçã Fuji | rissul | 10.18 | zaffari | 9.98 | 10.48 | gerador |
| 24 | p405 | Detergente Líquido Limpol Cristal 500ml | zaffari | 3.45 | fort | 2.89 | 3.31 | gerador |
| 25 | p432 | Leite Elegê Uht Semidesnatado Zero Lactose 1l | rissul | 5.60 | stok | 5.49 | 5.16 | gerador |
| 26 | p433 | Leite Italac Uht Integral 1l | rissul | 4.84 | stok | 4.75 | 4.46 | gerador |
| 27 | p439 | Leite Condensado Italac Semidesnatado 395g | stok | 6.09 | fort | 5.29 | 5.84 | gerador |
| 28 | p467 | Óleo De Coco Qualicoco Extra Virgem 200ml | stok | 18.99 | fort | 21.99 | 18.23 | gerador |
| 29 | p492 | Cerveja Stella Artois Pure Gold Long Neck 330ml | stok | 7.79 | asun | 7.29 | 7.71 | gerador |
| 30 | p504 | Refrigerante Fruki Guaraná Zero 200ml | stok | 1.75 | fort | 0.79 | 1.68 | gerador |
| 31 | p585 | Bebida Láctea Starbucks Frappuccino 280ml | fort | 9.98 | asun | 12.99 | 10.38 | sincronizador |
| 32 | p961 | Iogurte Grego Batavo Tradicional 100g | asun | 3.39 | fort | 3.19 | 3.25 | gerador |
| 33 | p962 | Iogurte Grego Batavo Morango 100g | asun | 3.39 | fort | 3.19 | 3.25 | gerador |
| 34 | p970 | Iogurte Grego Batavo Flocos 450g | asun | 16.39 | fort | 14.98 | 15.73 | gerador |
| 35 | p1032 | Achocolatado Em Pó Nescau Lata 350g | asun | 15.49 | fort | 16.99 | 14.87 | gerador |
| 36 | p1034 | Achocolatado líquido Toddynho 200ml | asun | 2.99 | fort | 2.98 | 2.87 | gerador |
| 37 | p1136 | Filé De Peito De Frango Lar 700g | asun | 18.79 | fort | 12.98 | 18.04 | gerador |
| 38 | p1275 | Linguiça Calabresa Pamplona Defumada 400g | asun | 15.79 | fort | 10.35 | 15.16 | gerador |
| 39 | p1731 | Chocolate Nestlé Charge 40g | asun | 4.99 | fort | 3.79 | 4.79 | gerador |
| 40 | p1792 | Pão de Leite Paderri 280g | asun | 15.90 | fort | 9.99 | 15.27 | gerador |
| 41 | p1794 | Pão de leite Seven Boys 450g | asun | 9.99 | fort | 6.99 | 9.59 | gerador |
| 42 | p2066 | Leite condensado Moça 395g | asun | 5.99 | fort | 11.99 | 5.75 | gerador |
| 43 | p2134 | Biscoito Zoo Cartoon Morango 85g | asun | 1.99 | fort | 2.39 | 1.91 | gerador |
| 44 | p2229 | Biscoito Passatempo Leite 150g | asun | 4.29 | fort | 4.39 | 4.12 | gerador |
| 45 | p2385 | Bala de Banana DaColônia 160g | asun | 8.49 | fort | 7.15 | 8.15 | gerador |
| 46 | p2453 | Batata Palha Yoki Tradicional 105g | asun | 10.99 | fort | 9.99 | 10.55 | gerador |
| 47 | p2480 | Salgadinho Doritos Queijo Nacho 75g | asun | 10.49 | fort | 7.99 | 10.07 | gerador |
| 48 | p2481 | Salgadinho Doritos Queijo Nacho 120g | asun | 16.98 | fort | 16.79 | 16.30 | gerador |
| 49 | p2564 | Salgadinho Doritos Queijo Nacho 32g | asun | 5.48 | fort | 5.99 | 5.26 | gerador |
| 50 | p2572 | Chocolate Neugebauer branco 80g | asun | 6.49 | fort | 7.49 | 6.23 | gerador |
| 51 | p2575 | Chocolate Neugebauer preto e branco 80g | asun | 6.49 | fort | 6.87 | 6.23 | gerador |
| 52 | p2576 | Chocolate Neugebauer ao leite 80g | asun | 6.49 | fort | 7.49 | 6.23 | gerador |
| 53 | p2578 | Chocolate Neugebauer meio amargo 80g | asun | 6.49 | fort | 6.87 | 6.23 | gerador |
| 54 | p2602 | Chocolate Neugebauer caramelo crocante 80g | asun | 6.49 | fort | 6.87 | 6.23 | gerador |
| 55 | p2672 | Chocolate Lacta Bis black 100,8g | asun | 7.49 | fort | 6.48 | 7.19 | gerador |
| 56 | p2674 | Chocolate Lacta Bis Oreo 100,8g | asun | 7.49 | fort | 6.48 | 7.19 | gerador |
| 57 | p2685 | Chocolate Bib's Ao Leite 40g | asun | 3.79 | fort | 3.89 | 3.64 | gerador |
| 58 | p2708 | Chocolate Nestlé Chokito 32g | asun | 4.99 | fort | 3.79 | 4.79 | gerador |
| 59 | p2709 | Chocolate Nestlé Prestígio 33g | asun | 4.99 | fort | 3.79 | 4.79 | gerador |
| 60 | p2711 | Chocolate Lacta 5 Star 40g | asun | 4.99 | fort | 3.69 | 4.79 | gerador |
| 61 | p2766 | Biscoito de arroz Camil integral 150g | asun | 12.49 | fort | 10.99 | 11.99 | gerador |
| 62 | p2902 | Creme de leite Italac 200g | asun | 3.49 | fort | 2.48 | 3.35 | gerador |
| 63 | p2903 | Creme de leite Piracanjuba zero lactose 200g | asun | 5.49 | fort | 4.09 | 5.27 | gerador |
| 64 | p2906 | Creme de leite Piracanjuba 200g | asun | 3.79 | fort | 2.69 | 3.64 | gerador |
| 65 | p3338 | Chocolate granulado Dori mesclado 120g | asun | 5.79 | fort | 4.99 | 5.56 | gerador |
| 66 | p3341 | Chocolate granulado Dori 120g | asun | 5.79 | fort | 4.99 | 5.56 | gerador |
| 67 | p3342 | Chocolate granulado Dori colorido 120g | asun | 5.79 | fort | 4.99 | 5.56 | gerador |
| 68 | p3370 | Mistura para bolo Italac chocolate 400g | asun | 4.99 | fort | 4.29 | 4.79 | gerador |
| 69 | p3570 | Queijo Mussarela Fatiado Zero Lactose Président 150g | asun | 11.99 | fort | 11.98 | 11.51 | gerador |
| 70 | p3748 | Farinha de aveia Quaker 165g | asun | 7.79 | fort | 5.59 | 7.48 | gerador |
| 71 | p3778 | Farelo de Aveia Quaker Oat Bran 165g | fort | 10.99 | asun | 12.99 | 11.43 | sincronizador |
| 72 | p4172 | Energético Tradicional Zero Açúcar Baly Lata 473ml | asun | 6.49 | fort | 6.99 | 6.23 | gerador |
| 73 | p4190 | Energético Ultra Peachy Keen Zero Açúcar Monster Lata 473ml | asun | 8.99 | fort | 9.39 | 8.63 | gerador |
| 74 | p4503 | Molho de Tomate Heinz Tradicional 240g | asun | 3.99 | fort | 3.99 | 3.83 | gerador |
| 75 | p4517 | Maionese Hellmann's Supreme Squeeze 330g | asun | 17.79 | fort | 14.99 | 17.08 | gerador |
| 76 | p4518 | Maionese Hellmann's Sachê 200g | asun | 3.99 | fort | 6.19 | 3.83 | gerador |
| 77 | p5117 | Mistura para Bolo Apti Coco 400g | fort | 4.79 | asun | 5.29 | 4.98 | sincronizador |
| 78 | p5128 | Mistura para Bolo Italac Laranja 400g | fort | 4.29 | asun | 4.99 | 4.47 | sincronizador |
| 79 | p5129 | Mistura para Bolo Italac Cenoura 400g | fort | 4.29 | asun | 4.99 | 4.47 | sincronizador |
| 80 | p5138 | Mistura para Bolo Fleischmann Laranja 390g | fort | 6.98 | asun | 9.79 | 7.26 | sincronizador |
| 81 | p5143 | Mistura para Bolo Fleischmann Chocomousse 400g | fort | 10.98 | asun | 11.98 | 11.42 | sincronizador |
| 82 | p5173 | Lasanha Sadia Bolonhesa 600g | fort | 9.98 | asun | 15.90 | 10.38 | sincronizador |
| 83 | p5177 | Lasanha Perdigão Bolonhesa 600g | fort | 12.89 | asun | 14.98 | 13.41 | sincronizador |
| 84 | p6065 | Refrigerante Guaraná Antarctica Zero Açúcar Lata 350ml | asun | 3.49 | fort | 3.49 | 3.35 | gerador |
| 85 | p6081 | Refrigerante Fanta Guaraná Lata 350ml | asun | 2.79 | fort | 3.49 | 2.68 | gerador |
| 86 | p6083 | Refrigerante Guaraná Antarctica Lata 350ml | asun | 3.49 | fort | 3.39 | 3.35 | gerador |
| 87 | p6097 | Refrigerante Coca-Cola Lata 220ml | asun | 3.29 | fort | 2.99 | 3.16 | gerador |
| 88 | p6105 | Refrigerante Fanta Uva Lata 350ml | asun | 2.99 | fort | 3.19 | 2.87 | gerador |
| 89 | p6111 | Refrigerante Fanta Maracujá Lata 350ml | asun | 2.99 | fort | 3.69 | 2.87 | gerador |
| 90 | p6144 | Refrigerante Sprite original 220ml | asun | 2.69 | fort | 3.25 | 2.58 | gerador |
| 91 | p6331 | Cerveja Export Lager Cerpa Garrafa 350ml | asun | 7.19 | fort | 9.98 | 6.90 | gerador |
| 92 | p6376 | Cerveja Stella Artois Puro Malte Garrafa 600ml | asun | 10.49 | fort | 9.89 | 10.07 | gerador |
| 93 | p6401 | Cerveja Sol Premium Long Neck 330ml | asun | 5.19 | fort | 5.89 | 4.98 | gerador |
| 94 | p6402 | Cerveja Stella Artois Puro Malte Long Neck 330ml | asun | 6.59 | fort | 6.29 | 6.32 | gerador |
| 95 | p6442 | Água De Coco Sococo 200ml | asun | 4.99 | fort | 2.99 | 4.79 | gerador |
| 96 | p6459 | Aguardente Velho Barreiro Gold 910ml | asun | 25.90 | fort | 22.99 | 24.87 | gerador |
| 97 | p6578 | Caldo Knorr Carne 57g | asun | 3.99 | fort | 3.59 | 3.83 | gerador |
| 98 | p6592 | Petisco para Gatos Dreamies Carne 40g | asun | 7.99 | fort | 7.29 | 7.67 | gerador |
| 99 | p7024 | Pizza Oliva Calabresa 410g | fort | 29.99 | asun | 33.90 | 31.19 | sincronizador |
| 100 | p7054 | Lasanha Sadia Peito De Peru 600g | asun | 15.90 | fort | 9.98 | 15.27 | gerador |
| 101 | p7448 | Extrato de tomate Elefante só tomate pote 300g | asun | 8.99 | fort | 6.79 | 8.63 | gerador |
| 102 | p7620 | Granola Vitalin sem glúten chia com banana 200g | asun | 19.49 | fort | 20.90 | 18.71 | gerador |
| 103 | p7754 | Lava-Roupas Líquido Brilhante Perfume e Cuidado Extraordinário Galão 3l | asun | 31.90 | fort | 24.90 | 30.63 | gerador |
| 104 | p8076 | Desinfetante Pinho Sol original 500ml | asun | 10.99 | fort | 8.29 | 10.55 | gerador |
| 105 | p8079 | Desinfetante Pinho Sol original leve 500ml pague 450ml | asun | 9.99 | fort | 7.49 | 9.59 | gerador |
| 106 | p8313 | Creme Dental Sensodyne Limpeza Profunda 90g | asun | 16.99 | fort | 11.90 | 16.31 | gerador |
| 107 | p8343 | Shampoo Pantene liso extremo 400ml | asun | 37.99 | fort | 32.90 | 36.47 | gerador |
| 108 | p8344 | Shampoo Seda pureza detox 325ml | asun | 17.99 | fort | 11.89 | 17.27 | gerador |
| 109 | p8353 | Shampoo Seda Mega Crescimento 300ml | asun | 17.99 | fort | 11.89 | 17.27 | gerador |
| 110 | p8354 | Shampoo Dove Umectação + Coco Antioxi 370ML | asun | 28.99 | fort | 26.90 | 27.83 | gerador |
| 111 | p8359 | Shampoo Monange hidrata com poder 325ml | asun | 11.79 | fort | 8.59 | 11.32 | gerador |
| 112 | p8621 | Sabonete Líquido Nivea Erva Doce Refil 200ml | asun | 13.49 | fort | 9.69 | 12.95 | gerador |
| 113 | p8632 | Sabonete Senador Corpo e Barba 130g | asun | 6.99 | fort | 9.99 | 6.71 | gerador |
