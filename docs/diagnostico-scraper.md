# Diagnóstico do scraper — 8 redes

> Levantamento feito em **2026-11-02**, na branch `fix/scraper-precos-reais`. **Nenhum código foi alterado.**
> Os testes ao vivo rodaram com `--limite 3` por categoria (VTEX, Master e Stok) ou com os limites padrão do coletor (Fort e Carrefour, 20 por categoria). A saída foi gravada fora do repositório.
> Totais de catálogo são **estimativas** lidas dos cabeçalhos e campos de paginação das APIs; cada linha diz como o número foi obtido.

## 0. Resumo executivo

| Rede | Roda hoje? | API | Catálogo estimado | Captura promoção? | Imagens por produto | 3D/vídeo | Coleta permitida (robots) |
|---|---|---|---|---|---|---|---|
| Zaffari | Sim (24 produtos, exit 0) | VTEX | 15.422 | Sim (de/por), Clube parcial | 1–4 (média ≈ 1,4); só a 1ª é salva | Não | **Não: `Disallow: /api/*`** |
| Rissul | Sim (24 produtos, exit 0) | VTEX | 14.741 | Sim (de/por) | 1 | Não | **Não: `Disallow: /api/`** |
| Asun | Sim (15 produtos, exit 0) | OSuper | ≈ 5.654 | Sim | 1 + sequência 3D | **Sim, 3D (36 frames)** | Sim (`Allow: /`) |
| Stok | **Parcial: JSON gerado, mas exit 1 (crash no CSV)** | VipCommerce | ≥ 1.236 (limite inferior) | Sim | 1 | Não | Sim (sem bloqueio da API) |
| Atacadão | Sim (15 produtos, exit 0) | VTEX | 56.829 (nacional) | Sim (0 promoções na amostra de 150) | 1–7 (média ≈ 1,5); só a 1ª é salva | Não | Sim (só `/api/io/login` é bloqueado) |
| Master | **Parcial: JSON gerado, mas exit 1 (crash no CSV)** | VipCommerce | ≈ 21.950 (busca fuzzy) | Sim | 1 | Não | Sim (sem bloqueio da API) |
| Fort | Sim (40 produtos, exit 0), **sem imagem** | OSuper | ≥ 10.000 (teto da API) | Sim | 1 (não salva) + 3D | **Sim, 3D (1 de 10 na amostra)** | Parcial: `/busca` e `/search` bloqueados no site |
| Carrefour | Sim (40 produtos, exit 0), **nomes corrompidos** | SSR (HTML) | ≤ ≈ 43.000 (sitemap) | Sim | até 5 (não salva) | Não | Sim (`Disallow: *sort=*`) |

**Achados principais (detalhados nas seções 1 a 4):**
1. Dois coletores estão quebrados na prática. Master e Stok terminam com exit 1 porque o `CAMPOS` do CSV não tem `is_clube`/`clube_nome`.
2. O Carrefour grava nomes com mojibake (`CafÃ© em PÃ³`). O `requests` decodifica o HTML como ISO-8859-1.
3. **Só Asun e Fort têm preço real no catálogo do frontend.** Os outros 6 preços de cada produto são o preço real multiplicado por um fator fixo (seção 7).
4. Zaffari e Rissul expõem `Disallow: /api` no robots.txt, e os dois coletores usam exatamente `/api/catalog_system/...`.
5. Nenhum coletor captura imagens adicionais. Fort e Carrefour nem a imagem principal.
6. `sincronizar_catalogo_completo.py` usa `ThreadPoolExecutor(max_workers=8)` sem pausa, o que contraria o intervalo seguro (seção 6).

---

## 1. Zaffari — `coleta_zaffari.py`

| Item | Resultado |
|---|---|
| **1. Funciona hoje?** | Sim. `--limite 3` retornou 24 produtos (8 categorias × 3), exit 0, sem falhas. Os preços são reais, por exemplo Óleo de Soja Coamo 900ml a R$ 7,95. |
| **2. Tipo de API** | VTEX Catalog System. `GET https://www.zaffari.com.br/api/catalog_system/pub/products/search?fq=C:<id>&_from=N&_to=N+14`. Página de 15, no máximo 5 páginas por categoria, pausa de 1,0 s. As categorias `C:1001`…`C:1009` foram confirmadas (`C:1001` é Mercearia, 4.589 itens). |
| **3. Total exposto** | **15.422** (cabeçalho `resources: 0-0/15422` sem filtro). O coletor padrão pega no máximo ≈ 160 (20 × 8 categorias). A VTEX costuma limitar a paginação por `_from/_to` a ≈ 2.500 itens por consulta (limite conhecido da plataforma, **não testado aqui**), então cobrir tudo exige particionar por categoria ou marca. |
| **4. Promoção** | Em `items[0].sellers[0].commertialOffer`: `Price` (por), `ListPrice` (de), `spotPrice`, `PriceWithoutDiscount`, `Teasers`, `PriceValidUntil`. Na amostra de 150 produtos, 13 tinham `Price < ListPrice`. **O coletor captura** de/por (`preco`, `preco_normal`, `em_promocao`). **Lacunas:** não guarda `PriceValidUntil`; os `Teasers` observados têm nome numérico (`543768`) com desconto condicionado a forma de pagamento (`PaymentMethodId=401`), e a heurística de "Clube" só procura as palavras *clube/zaffari/bourbon*. |
| **5. Imagens / 3D** | 150 produtos amostrados: 112 com 1 imagem, 33 com 2, 2 com 3 e 3 com 4. Sem `videos` e sem 3D. O coletor guarda só `images[0]`. |
| **6. robots / termos** | `User-agent: *` tem **`Disallow: /api/*`**. O coletor usa `/api/catalog_system/...`, então **está fora do permitido**. `Allow: /*` vale para o resto. A sitemap existe (`/sitemap.xml`). Termos de uso não localizados automaticamente (a URL tentada deu 404): **revisão manual pendente**. |

**Bug latente:** `coleta_zaffari.py:209` usa `BASE_STORE_URL`, que não existe (o nome definido é `STOREFRONT_BASE_URL`). Só dispara se `link` vier vazio, mas daria `NameError`.

## 2. Rissul — `coleta_rissul.py`

| Item | Resultado |
|---|---|
| **1. Funciona hoje?** | Sim. `--limite 3` retornou 24 produtos, exit 0. |
| **2. Tipo de API** | VTEX, o mesmo endpoint do Zaffari em `www.rissul.com.br`. Categorias `C:7`, `C:8`, `C:10`, `C:11`, `C:1`, `C:9`, `C:12`, `C:2` (funcionam; `C:1001`, que é do Zaffari, retorna 400). Página de 15, no máximo 5 páginas, pausa de 1,0 s. |
| **3. Total exposto** | **14.741** (`resources: 0-1/14741`). |
| **4. Promoção** | Mesma estrutura VTEX. 12 de 150 com `Price < ListPrice` (ex.: Leite Italac 1L por 4,29, de 4,89). **Captura** de/por. Sem `Teasers` na amostra. `PriceValidUntil` não é guardado. |
| **5. Imagens / 3D** | 1 imagem em 150 de 150 produtos. Sem vídeo e sem 3D. |
| **6. robots / termos** | **`Disallow: /api/`**, além de `/busca/`, `/search/` e `/_v/`. O coletor também usa `/api/`, então **fora do permitido**. `/termos-de-uso` responde 200, mas minha busca por palavras como *robô*, *scraping* e *extração de dados* não achou nada (a página pode ser renderizada por JS): **revisão manual pendente**. |

**Bug latente:** `coleta_rissul.py:209` tem o mesmo `BASE_STORE_URL` indefinido.

## 3. Asun — `coleta_asun.py`

| Item | Resultado |
|---|---|
| **1. Funciona hoje?** | Sim. `--limite 3` retornou 15 produtos (5 categorias × 3), exit 0, 3 em promoção. |
| **2. Tipo de API** | OSuper (Sense). `GET https://sense.osuper.com.br/319/1560/category/<id>?sortField=sales_count&sortOrder=desc&size=10&from=N`. Empresa 319, filial 1560 (Cachoeirinha). A resposta traz `hits`, `total`, `hasNext`, `nextFrom`. O coletor pagina com `from` em múltiplos de 10, no máximo 10 páginas, pausa de 1,5 s. **Quirk:** com `size` ≥ ~50 a API ignora a categoria e devolve a listagem global (22.408 hits, `total` 89.632). |
| **3. Total exposto** | **≈ 5.654** (`/search?search=&size=20` devolve `total` 5654 para a loja). Categoria "Cafés" tem 83. O coletor padrão cobre 5 categorias × 20 = 100. |
| **4. Promoção** | `pricing.price`, `pricing.promotion` (bool), `pricing.promotionalPrice`, `pricing.discount` (%). Existem também `promotions`, `customerPromotion`, `cashbacks` e `paymentPromotions` (nulos na amostra). Exemplo: Café Melitta 500g por 24,90, de 26,90. **Captura** de/por e `promotion`. A heurística de Clube cobre `clubPrice`, `customerClubPrice` e `loyaltyPrice` e não foi observada na amostra. |
| **5. Imagens / 3D** | `image` é 1 URL (thumbor 400×400). `threeDimensionalImage` é uma lista de frames: 7 dos 10 produtos da amostra de café tinham **36 frames** (360°). Sem vídeo. **O coletor captura 3D** (`three_dimensional_images`). |
| **6. robots / termos** | `User-agent: *` com `Content-Signal: search=yes, ai-train=no, use=reference` e `Allow: /`. Há bloqueio nominal a crawlers de treino de IA (ClaudeBot, GPTBot etc.). Os sinais `ai-train=no` e `use=reference` valem como reserva de direitos: o uso para comparação de preços é, em tese, "referência", mas **vale registrar**. `sense.osuper.com.br` tem o mesmo robots. **Cloudflare:** um GET com User-Agent mínimo (`Mozilla/5.0`) levou 403. Só funciona com os cabeçalhos do coletor, e eu **não tentei contornar** o bloqueio. Termos de uso: revisão manual pendente. |

## 4. Stok — `coleta_stok.py`

| Item | Resultado |
|---|---|
| **1. Funciona hoje?** | **Parcial.** A coleta chega ao fim e grava `coleta_stok.json` (36 produtos), mas **o processo termina com exit 1 por `ValueError: dict contains fields not in fieldnames: 'is_clube', 'clube_nome'`** ao escrever o CSV. Efeitos: `produtos_coletados.csv` não é gerado e sobra um `tmp*` solto. |
| **2. Tipo de API** | VipCommerce. Autenticação por `POST https://services.vipcommerce.com.br/api-admin/v1/org/130/auth/loja/login`, depois `GET .../org/130/filial/1/centro_distribuicao/1/loja/buscas/produtos/termo/<termo>?page=N&session=<uuid>`. A paginação vem em `paginator` (`page`, `items_per_page`, `total_pages`, `total_items`). Pausa de 1,0 s. A chave de auth (`AUTH_KEY`) está **hardcoded** no código (é a chave pública da loja). |
| **3. Total exposto** | **Não dá para medir pela paginação.** O `paginator` devolve sempre `total_items: 80`, `items_per_page: 100` e a página 2 vem vazia, ou seja, cada termo retorna no máximo ≈ 80. Com 20 termos genéricos a união deu **1.236 produtos únicos**, que é só um limite inferior. A busca por `"a"` devolve 0. |
| **4. Promoção** | `preco` (string), `em_oferta`, `oferta{preco_antigo, preco_oferta, menor_preco, nome ("Clube"), tag, classe_oferta, quantidade_minima…}`. Na amostra, 3 de 36 em oferta (ex.: Açúcar Alto Alegre por 2,99, de 3,69). **Captura** de/por e marca Clube. **Risco:** ofertas com `quantidade_minima` > 1 (leve N) podem ser lidas como preço unitário. |
| **5. Imagens / 3D** | `imagem` é 1 hash, montado como URL 1000×1000 no CDN. Sem lista de imagens, 3D ou vídeo. |
| **6. robots / termos** | Sem bloqueio de API (a `services.vipcommerce.com.br` não tem robots.txt, retorna 404). O site da loja bloqueia `/busca`, `/buscas`, `/filtro`, carrinho e área do cliente; o coletor usa a API, não essas rotas. Termos de uso: revisão manual pendente. |

## 5. Atacadão — `coleta_atacadao.py`

| Item | Resultado |
|---|---|
| **1. Funciona hoje?** | Sim. `--limite 3` retornou 15 produtos (5 categorias × 3), exit 0. A categoria `Lacteos_Frios` não apareceu nos logs finais da amostra; não investiguei. |
| **2. Tipo de API** | VTEX. A URL do código (`/api/catalog_system/...`) responde **308 para `/io/api/catalog_system/...`** e o `requests` segue o redirect. Categorias `C:2`, `C:130`, `C:4`, `C:11`, `C:13`, `C:8`. Página de 15, no máximo 10 páginas, pausa de 1,5 s. |
| **3. Total exposto** | **56.829** (`resources: 0-1/56829`). **Atenção:** é o catálogo nacional, sem filtro de região ou loja. O preço do Atacadão varia por loja e CEP, e o coletor não define região, então o preço pode não ser o do RS. |
| **4. Promoção** | Mesma estrutura VTEX. **0 promoções em 150 produtos amostrados** (todos `Price == ListPrice`). A lógica de captura é a mesma do Zaffari; ela existe, mas não foi exercitada. |
| **5. Imagens / 3D** | 150 produtos: 122 com 1 imagem, 10 com 2, 6 com 3, 10 com 4, 1 com 5 e 1 com 7. Sem vídeo e sem 3D. Só `images[0]` é salva. |
| **6. robots / termos** | `Allow: /`; bloqueia `/checkout`, `/busca/*`, `/account`, `/api/io/login` etc. `/api/catalog_system` **não está bloqueado**. Termos de uso: a URL tentada deu 404, **revisão manual pendente**. |

## 6. Master — `coleta_master.py`

| Item | Resultado |
|---|---|
| **1. Funciona hoje?** | **Parcial.** Mesmo defeito do Stok: grava `coleta_master.json` (36 produtos, 12 termos × 3) e termina com **exit 1** no CSV (`is_clube`/`clube_nome` fora de `CAMPOS`). |
| **2. Tipo de API** | VipCommerce, organização 193. Mesmo fluxo de login e busca do Stok (`.../org/193/filial/1/centro_distribuicao/1/loja/buscas/produtos/termo/<termo>?page=N`). O coletor lista **12 termos fixos** (arroz, feijao, leite…) em vez de categorias. Página de 20, no máximo 5 páginas, pausa de 1,0 s. `AUTH_KEY` hardcoded. A **busca é difusa**: "leite" traz "Leite Hidratante Monange", e um termo sem sentido (`xyzqwerty`) devolve 7 itens. |
| **3. Total exposto** | **≈ 21.950** (`paginator.total_items` da busca por `"a"`, 1.098 páginas de 20). É uma estimativa por busca difusa: pode incluir itens irrelevantes ao termo. |
| **4. Promoção** | Igual ao Stok. Na amostra, 1 de 36 em oferta (Sabão Barra Font por 3,49, de 4,69). Exemplo de oferta real: "Oferta Exclusiva" (`classe_oferta: preco-vip`) com `preco_antigo` 9,99 e `preco_oferta` 8,99. **Captura.** |
| **5. Imagens / 3D** | 1 imagem (hash no CDN 1000×1000); 1 de 36 sem imagem. Sem 3D e sem vídeo. |
| **6. robots / termos** | O site bloqueia `/busca`, `/buscas`, `/filtro`, carrinho e área do cliente; a API não tem robots. O coletor usa a API. Termos: revisão manual pendente. |

## 7. Fort Atacadista — `coleta_fort_atacadista.py`

| Item | Resultado |
|---|---|
| **1. Funciona hoje?** | Sim, mas **sem imagem**. Rodou com o padrão (2 categorias × 20) e retornou 40 produtos, exit 0, 18 em promoção. |
| **2. Tipo de API** | OSuper (Sense), empresa 334, filial 1585. `GET https://sense.osuper.com.br/334/1585/category/<id>?size=10&from=N` (só 2 categorias ativas: `1815215` e `1815285`) e, com `--sem-limites`, `/search?search=<termo>&size=20&from=N` para 29 termos. O código tem um truque: `if dados.get("total") == 89632: break`, ou seja, trata o total da listagem global (a mesma resposta degenerada vista na Asun) como "fim". |
| **3. Total exposto** | **≥ 10.000.** `/search?search=` devolve `total: 10000`, que parece ser o teto da janela de resultados (não é o total real). Categoria "Grãos, Arrozes e Feijões" tem 233. |
| **4. Promoção** | Mesmo modelo da Asun: `pricing.price/promotion/promotionalPrice/discount`. **Captura** de/por. Existem também `wholesalePrice` (atacado) e `promotions`, que o código tenta ler como "Clube/Vuon". |
| **5. Imagens / 3D** | `image` (1 URL) e `threeDimensionalImage`: 1 de 10 produtos da amostra tinha 3D. **O coletor Fort não grava imagem, descrição, URL do produto nem 3D** (o `CAMPOS` não os contém). Quem lê 3D do Fort é `sincronizar_catalogo_completo.py`. |
| **6. robots / termos** | `deliveryfort.com.br` redireciona (301) para `fortatacadista.com.br`. O robots do site bloqueia `/busca`, `/search`, `/*?*` e `/lojas`. O docstring do coletor diz que evita `/search`, mas o modo `--sem-limites` usa o `/search` **da API OSuper** (`sense.osuper.com.br`, host diferente, com `Allow: /`). Esse uso é permitido pelo robots do host da API, mas contraria a intenção declarada no docstring. UA honesto (`SmartMarketBot/0.1 … contato`). Termos: revisão manual pendente. |

## 8. Carrefour — `coleta_carrefour.py`

| Item | Resultado |
|---|---|
| **1. Funciona hoje?** | Sim, **com nomes corrompidos**. Retornou 40 produtos, exit 0, 4 em promoção. Os nomes saem como `CafÃ© em PÃ³ a VÃ¡cuo Montana` porque o servidor não declara charset, o `requests` assume ISO-8859-1 e `resposta.text` decodifica errado (o `apparent_encoding` é UTF-8). Isso afeta a normalização e a casa de nomes entre redes. |
| **2. Tipo de API** | **SSR, sem API JSON.** `GET https://mercado.carrefour.com.br/categoria/<...>?page=N` devolve HTML (≈ 480 KB) com um stream do React Router em `streamController.enqueue(...)`, que o coletor desserializa. Só 2 categorias configuradas; 15 produtos por página; pausa de 1,5 s. Depende do formato interno do stream, então é a fonte mais frágil. |
| **3. Total exposto** | Por categoria, `totalCount` no stream: **288** (alimentos-basicos) e **83** (leites). Pelo sitemap, 43 arquivos `product-N.xml` de ≤ 1.000 URLs, ou **≤ ≈ 43.000** produtos. |
| **4. Promoção** | `Price`, `ListPrice` e `spotPrice` dentro de `commertialOffer`, como na VTEX. **Captura** de/por e "Meu Carrefour" (`spotPrice < Price` ou teaser). Na amostra, 4 de 40 em promoção. |
| **5. Imagens / 3D** | `items[0].images` traz até **5** imagens na amostra; sem vídeo e sem 3D. **O coletor não grava nenhuma** (`CAMPOS` sem `imagem_url`). |
| **6. robots / termos** | `Allow: /`; bloqueia `/account`, `/minha-conta`, `/login*`, `/checkout/*` e `*sort=*`. As URLs usadas (`/categoria/...?page=N`) **não** estão bloqueadas. A página `/institucional/termos-e-condicoes` respondeu 200, mas minha busca por palavras como *robô* e *scraping* não achou nada (pode ser renderizada por JS): **revisão manual pendente**. O preço depende de CEP e loja e o coletor não define região. |

---

## 9. Intervalo seguro entre requisições

Nenhum robots.txt lido declara `Crawl-delay`. Isso vale para o trecho que li de cada um; o do Zaffari eu só li até o fim das regras de `Disallow`. Durante os testes (≈ 20 requisições por rede, com pausas de 0,5 a 1,5 s) **não houve 429**, mas o único bloqueio observado foi o 403 da Cloudflare no OSuper com User-Agent mínimo.

| Rede | Pausa atual no código | Recomendação |
|---|---|---|
| Zaffari | 1,0 s | ≥ 2 s serial, **e só depois de resolver o `Disallow: /api`** |
| Rissul | 1,0 s | idem Zaffari |
| Atacadão | 1,5 s | ≥ 2 s serial |
| Asun / Fort (OSuper) | 1,5 s | ≥ 2 s serial; é Cloudflare, então evitar rajadas |
| Master / Stok (Vip) | 1,0 s | ≥ 1,5–2 s serial |
| Carrefour | 1,5 s | ≥ 3 s (cada página tem ≈ 480 KB) |

Regra geral: 1 requisição por vez por host, coleta fora do horário comercial (a rotina atual roda às 04:00 BRT) e retirada imediata em 429/403.

**Pontos que violam isso hoje:**
- `sincronizar_catalogo_completo.py:270` roda `ThreadPoolExecutor(max_workers=8)` sem pausa entre as requisições.
- `download_imagens.py:75` usa `max_workers=8` para baixar imagens.
- Master e Stok pegam o token de login a cada execução (`POST /auth/loja/login`). O token fica em cache em memória durante a execução, o que é correto.

## 10. Pontos onde o preço é calculado com fator fixo

### 10.1 `scraper/sincronizar_catalogo_completo.py`, linhas 359–372

Vale só para **produtos novos** (o `else` do `if prod_existente`). O preço real fica na rede de origem (`rede`, Asun ou Fort) e os demais são multiplicados:

| Rede | Fator |
|---|---|
| zaffari | × 1,05 |
| rissul | × 1,02 |
| stok | × 0,94 |
| atacadao | × 0,95 |
| master | × 1,03 |
| fort (quando a origem é Asun) | × 0,96 |
| carrefour (origem Asun) | × 1,04 |
| asun (quando a origem é Fort) | × 1,04 |
| carrefour (origem Fort) | × 1,02 |

O `menorPreco` e o `mercadoMenorPreco` são calculados a partir desses preços inventados (linha 374 em diante).

### 10.2 `scraper/gerar_catalogo_e_sql.py`, linhas 211–225

Dicionário `variacoes`, aplicado a **todo produto** de qualquer rede de origem, para cada rede ainda ausente em `prices_dict`:

| Rede | Fator |
|---|---|
| zaffari | × 1,05 |
| rissul | × 1,02 |
| asun | × 0,99 |
| stok | × 0,94 |
| atacadao | × 0,95 |
| master | × 1,03 |
| fort | × 0,96 |
| carrefour | × 1,04 |

Esses preços vão para `prices` em `data.js` (e daí para `menorPreco`/`mercadoMenorPreco`). **As linhas de INSERT no SQL usam só o preço real da rede de origem**, então o fator fixo afeta o frontend e não a carga SQL.

### 10.3 Outros valores fixos relacionados (não são multiplicadores, mas fabricam dados)

- `gerar_catalogo_e_sql.py:207`: toda promoção ganha `data_fim = CURRENT_TIMESTAMP + INTERVAL '7 days'`. A data real de validade (`PriceValidUntil` na VTEX, por exemplo) não é usada.
- `verificar_e_atualizar_precos.py:278`: o `INSERT INTO preco` usa `mercado_id = 1` fixo com `prices.get('asun', 0.0)`. No `MERCADOS_MAP` o id 1 é o **Fort** e o Asun é o 3, então o preço da Asun seria gravado como se fosse do Fort. Se `prices` não tiver `asun`, grava `0.0`.
- Esse mesmo arquivo só atualiza preços de **asun** e **fort**; as outras 6 redes nunca são atualizadas por ele.

## 11. O que isso significa para o problema "preços reais"

1. Os coletores das 6 redes restantes (Zaffari, Rissul, Atacadão, Master, Stok, Carrefour) funcionam e geram preços reais em seus próprios JSON, mas **o catálogo do frontend não os usa**. Ele casa produtos só por `idOrigem` ou nome da Asun/Fort e preenche o resto com fator fixo.
2. Não existe casamento de produtos entre redes (por EAN, nome normalizado ou marca+peso). Sem isso, não dá para pôr o preço real de uma rede ao lado do de outra no mesmo produto.
3. A cobertura real hoje é pequena (20 por categoria, 2 categorias no Fort e no Carrefour), perto do que as redes expõem (seção 0).

## 12. Verificações que não consegui fazer

- **Termos de uso/serviço:** não consegui confirmar o texto de nenhuma das 8 redes (URLs com 404 ou páginas renderizadas por JS). A análise acima é só de robots.txt, **que não substitui a leitura dos termos**.
- **`Crawl-delay`:** não vi nenhum, mas não li os arquivos de robots linha a linha até o fim em todos os casos.
- **Fort e Stok:** o total real do catálogo não é mensurável pela paginação (teto de 10.000 no Fort; 80 por termo no Stok).
- **Região:** não verifiquei se Zaffari, Rissul, Atacadão, Master, Stok e Carrefour devolvem preço específico de loja/CEP para o RS.
- **Master/Stok:** não rodei o fluxo completo depois do crash do CSV para ver se o orquestrador (`rotina_carga.py`) trata o exit 1.

---

## 13. Correções aplicadas — Fase B (2026-11-02)

Um commit por item, na branch `fix/scraper-precos-reais`. Suíte do scraper: `python -m unittest discover -s scraper/tests` passou de 126 para **144 testes**, todos verdes (27 ignorados, como antes).

| # | Problema (seção) | Correção | Commit |
|---|---|---|---|
| 1 | Fatores fixos de preço (§10.1 e §10.2) | `sincronizar_catalogo_completo.py` e `gerar_catalogo_e_sql.py` passaram a gravar `prices` só com a rede onde o produto foi coletado. As demais redes ficam **ausentes** (chave inexistente). O frontend já testa `prices[x] !== undefined`. Novo helper `montar_precos()`. | `247ecaa` |
| 2 | Validade fixa de 7 dias (§10.3) | Novo `sql_promocao()`: `data_fim` vem do campo `promocao_valida_ate` do item. Sem ele, grava `NULL`. Nenhum coletor preenche esse campo hoje. | `f90ae4c` |
| 3 | Master e Stok com exit 1 (§4 e §6) | `is_clube` e `clube_nome` adicionados a `CAMPOS`. Confirmado com `--limite 1` ao vivo: exit 0, CSV e JSON gerados nos dois. | `9f0786e` |
| 4 | Mojibake no Carrefour (§8) | `resposta.encoding = "utf-8"` antes de `.text`. Confirmado ao vivo com 5 produtos: "Leite em Pó Ninho Integral Lata 380g", "Leite Semidesnatado Piracanjuba 1 Litro" etc. | `c0f2b78` |
| 5 | `mercado_id` fixo em 1 (§10.3) | Novo `sql_atualizacao_preco()` usa o id do `MERCADOS_MAP` (Asun = 3, Fort = 1) e grava **o preço da rede alterada**, um INSERT por rede. Também escapa aspas no nome do produto (antes era interpolado cru). Não grava mais `0.0` quando falta o preço. | `f3b588a` |
| 6 | 8 threads sem pausa (§9) | Coleta sequencial (1 requisição por vez), `Limitador` com pausa mínima de 2,0 s entre requisições, e User-Agent `SmartMarketBot/0.1 (… contato …)`. Removidos os cabeçalhos `Origin`/`Referer` forjados do Fort. Confirmei com 1 requisição a cada API OSuper (Asun e Fort) que o UA identificável recebe 200. | `4e888df` |

**Testes que mudaram**
- **Novo:** `tests/test_precos_sem_simulacao.py` (15 testes): geração do catálogo sem fatores, `sql_promocao` com e sem validade, SQL sem `INTERVAL '7 days'`, produto novo do sincronizador com uma só rede, `mercado_id` de todas as redes do mapa, aspas no nome, UA identificável, `Limitador`, coleta sequencial e espera antes de cada GET.
- **Ajustado:** `tests/test_coleta_master.py` e `tests/test_coleta_stok.py` (+1 cada: CSV com `is_clube`/`clube_nome`), `tests/test_coleta_carrefour.py` (+1: decodificação UTF-8 sem charset declarado).

**Pontos em aberto depois da Fase B**
- **`data_fim` NULL × backend:** `Promocao.dataFim` está como `nullable = false` em `backend/.../model/Promocao.java:39` e `PromocaoRequest` exige `dataFim`. Se o SQL gerado for aplicado num banco com essa restrição, os INSERTs de promoção sem validade vão falhar. É preciso decidir entre tornar a coluna opcional no backend ou não gerar promoção sem validade.
- **Tempo de execução do sincronizador:** com 2 s entre requisições, a varredura completa (≈ 60 termos mais 7 categorias, com várias páginas cada) leva bastante mais do que antes.
- **Produtos sem preço por rede** (projeção sobre os 9.406 produtos atuais do `data.js`, antes de regenerá-lo): ver a resposta na conversa; o `data.js` **não foi regenerado**.

---

## 14. EAN/GTIN e casamento de produtos entre redes (levantamento de 2026-11-03)

Nenhum código foi alterado. Os scripts de sondagem ficaram fora do repositório. Todas as requisições respeitaram **2 s por host** e usaram o User-Agent `SmartMarketBot/0.1 (… contato …)`. Para Zaffari e Rissul (`Disallow: /api` no robots) **não usei a API**: li as páginas de produto (`…/p`), que o robots permite. Para o Carrefour, também li as páginas de produto, porque a listagem não traz EAN.

### 14.1 Quem expõe EAN, em qual campo, e se o coletor já guarda

| Rede | Fonte do EAN | Campo | Amostra com EAN (de 20) | GTIN válido (dígito verificador) | O coletor guarda hoje? |
|---|---|---|---|---|---|
| Zaffari | HTML da página de produto (estado embutido); a API VTEX também traz | `"ean"` / `items[0].ean` | **20/20** | 20 | Não |
| Rissul | idem Zaffari | `"ean"` / `items[0].ean` | **20/20** | 20 | Não |
| Atacadão | API VTEX | `items[0].ean` (também filtra por `fq=alternateIds_Ean:<ean>`) | **20/20** | 20 | Não |
| Master | API VipCommerce | `codigo_barras` | **20/20** preenchidos | 16 EAN-13 + 1 de 12 dígitos; **3 são códigos internos** (`364670001`, `49072`, `39870001`) | Não (só usa como ID de reserva) |
| Stok | API VipCommerce | `codigo_barras` | **20/20** | 20 | Não (idem Master) |
| Carrefour | Só na **página do produto**; a listagem (`items[0].ean`) vem vazia | `"ean"` | **19/20** | 19 | Não |
| Asun | **Não expõe** (nem na API, nem na página) | só `id` interno OSuper (7 dígitos) | **0/20** | — | — |
| Fort | **Não expõe** (idem Asun) | só `id` interno OSuper | **0/20** | — | — |

- A amostra foi de **4 produtos por termo** (arroz, feijão, leite, café, açúcar), preferindo marcas nacionais comuns. **Exceção:** a amostra do Zaffari são 20 URLs da coleta anterior, porque o sitemap do Zaffari não lista produtos. Ela é mais heterogênea, e a taxa de EAN não depende disso.
- O banco já tem `produto.codigo_barras` (`Produto.java:32`, `pipeline.py:179`), mas `normalizacao.py:43` grava sempre `None` e o `data.sql` diz que "o arquivo de coleta não traz EAN". **O EAN existe em 6 das 8 redes e hoje é descartado.**
- No Master, ~15% da amostra tinha `codigo_barras` que não é EAN (códigos internos de 5 a 9 dígitos). É preciso validar comprimento e dígito verificador antes de confiar no campo.

### 14.2 Sobreposição de EANs

A amostra de 20 por rede, comparada diretamente, quase não se cruza (4 EANs repetidos em 113): são 20 itens de catálogos com milhares de produtos. Por isso fiz uma segunda medição: peguei os **112 EANs únicos válidos** da amostra e procurei cada um por EAN em **Atacadão, Master e Stok**, as três redes cuja API deixa buscar por EAN (Atacadão por filtro, Master e Stok pela busca por termo). Zaffari, Rissul e Carrefour não têm busca por EAN permitida, então **só medem pares com essas três**.

**Origem → alvo: quantos EANs da amostra da origem foram achados no alvo**

| Origem (amostra) | no Master | no Stok | no Atacadão |
|---|---|---|---|
| Zaffari | 4/20 | 3/20 | 6/20 |
| Rissul | 6/20 | 7/20 | 10/20 |
| Carrefour | 7/19 | 4/19 | 14/19 |
| Stok | 12/20 | — | 16/20 |
| Atacadão | 7/20 | 4/20 | — |
| Master | — | 6/17 | 10/17 |

**Matriz de sobreposição** (EANs em comum, dos 112 sondados; `n/m` = não mensurável, sem busca por EAN)

| | Zaffari | Rissul | Carrefour | Stok | Atacadão | Master |
|---|---|---|---|---|---|---|
| **Zaffari** | — | n/m | n/m | 3 | 6 | 4 |
| **Rissul** | n/m | — | n/m | 7 | 10 | 6 |
| **Carrefour** | n/m | n/m | — | 4 | 14 | 7 |
| **Stok** | 3 | 7 | 4 | — | 35 | 27 |
| **Atacadão** | 6 | 10 | 14 | 35 | — | 39 |
| **Master** | 4 | 6 | 7 | 27 | 39 | — |

- **Maiores sobreposições:** Atacadão–Master (39), Atacadão–Stok (35) e Master–Stok (27). Depois vêm Atacadão–Carrefour (14) e Atacadão–Rissul (10). O Atacadão é o par mais forte de quase todas as redes.
- **Distribuição por EAN** (entre as 6 redes sondáveis): 49 de 112 estão em **uma** rede só, 27 em duas, 27 em três e 9 em quatro. Ou seja, **56% dos EANs da amostra aparecem em pelo menos duas redes**. Esse valor é um **piso**, porque Zaffari, Rissul e Carrefour só foram consultadas nos pares acima.
- **Viés da amostra:** são itens de marcas nacionais populares em 5 categorias de mercearia. Em hortifruti, açougue, padaria e marcas próprias a sobreposição tende a ser bem menor.
- Asun e Fort não entram na matriz por não terem EAN.

### 14.3 Produtos sem EAN (Asun e Fort): dá para casar por marca + nome + unidade?

Medi a heurística nos pares em que o EAN é a verdade: **116 pares** (mesmo EAN, redes diferentes). A chave usada foi: nome sem acentos e sem as palavras vazias ("de", "tipo", "uht"…), tokens ordenados, e unidade normalizada para g/ml (1 kg = 1000 g, 1 l = 1000 ml).

| Regra | Pares reais que casaram | Colisões entre produtos de EAN diferente (1.953 pares) |
|---|---|---|
| Chave **idêntica** | 25 de 116 (**22%**) | 0 |
| Mesma unidade + tokens com Jaccard ≥ 0,6 | 68 de 116 (**59%**) | **3** |

- **Falhas por abreviação e variação de nome:** "Arroz Bco Blue Ville Tp1 1kg" × "Arroz Blue Ville Branco Tipo 1 1kg"; "Café Melitta Regiões Mogiana 250g" × "…Brasileiras Mogiana 250g"; "Leite em Pó Nan Comfort N2 800g" × "Fórmula Infantil Nestlé Nan Comfor 2 800g".
- **As 3 colisões da regra tolerante são perigosas, porque mesma marca e mesma unidade não bastam:** "Leite Italac UHT Integral 1l" × "Leite **sem Lactose** Integral UHT Italac 1 Litro"; "Leite Condensado Italac **Semidesnatado** 395g" × "…**Integral** 395g"; "Café Melitta … Tradicional 500g" × "…**Sabor da Fazenda** Tradicional 500g".
- **Em nomes de Asun e Fort**, todos os 40 itens da amostra tinham unidade extraível e marca (campo `brandName`). Contra o pool de 112+ nomes com EAN, o casamento tolerante achou candidato **único** em 6 de 20 (Asun) e 3 de 20 (Fort), ambíguo em 2 e 0, e **nenhum** em 12 e 17. O pool é pequeno, então isso mostra pouco sobre cobertura e **nada sobre acerto**.
- **Conclusão para casar sem EAN:**
  - A chave marca + nome + unidade **não é segura sozinha**: perde cerca de 4 em cada 10 pares reais e, quando é frouxa, junta variantes diferentes da mesma marca.
  - Serve para **propor** pares, não para casar automaticamente. Uma regra segura seria: aceitar só chave idêntica, ou tolerante com revisão humana quando houver diferença de variante (sem lactose, integral/semi, sabor, tipo).
  - **Ponte por EAN:** casar Asun/Fort com uma rede que tem EAN (Atacadão, Master, Stok) por nome, e herdar o EAN daí, ainda exige confirmação humana. A melhor saída continua sendo achar uma fonte de EAN para Asun/Fort (o OSuper não tem; a página do produto também não).
- **Pares com o mesmo EAN e nomes muito diferentes** apareceram na medição (ex.: "Arroz Bco Blue Ville Tp1 1kg" no Master e "Arroz Blue Ville Agulhinha Tipo 1 1kg" para o mesmo EAN em outra rede). **Não verifiquei qual dos dois está certo**; pode haver EAN reaproveitado ou cadastrado errado em alguma rede.

### 14.4 Limitações

- Amostras pequenas (20 por rede) e enviesadas para marcas nacionais de mercearia. Os percentuais indicam ordem de grandeza e não são estimativas com intervalo de confiança.
- A sobreposição só foi medida contra Atacadão, Master e Stok. Zaffari, Rissul e Carrefour só aparecem como origem.
- Os preços não foram comparados. EAN igual não garante mesma embalagem ou gramatura em todas as redes.

---

## 15. Fase C1 — captura e uso de EAN (2026-11-03)

Um commit por item. A suíte do scraper passou de 144 para **212 testes**, todos verdes (27 ignorados, como antes). Os testes de integração com PostgreSQL continuam ignorados porque não há `SMARTMARKET_TEST_DSN` aqui: **o SQL de `carregar()` não foi executado contra um banco**. A lógica nova de EAN foi isolada em `sincronizar_codigo_barras()` e testada com um cursor falso. Dados do relatório: [casamento-produtos.md](casamento-produtos.md).

| # | O que mudou | Commits |
|---|---|---|
| 1 | Novo módulo `scraper/ean.py`: aceita só EAN-8, UPC-12, EAN-13 e GTIN-14 com dígito verificador correto; `ean_canonico()` devolve GTIN-14 para comparar UPC-12 com EAN-13 com zero à esquerda. Master e Stok recusam também EAN-8, porque os códigos internos curtos passam no dígito verificador por acaso (`39870001` passa). | `680c7e7` |
| 2 | Coletores gravam `codigo_barras` (coluna nova em `CAMPOS`, no fim): **Atacadão** (`items[0].ean`), **Master** e **Stok** (`codigo_barras`; os 3 códigos internos de 5 a 9 dígitos são descartados), **Zaffari** e **Rissul** (só pela página do produto, `"ean"` no estado da página, nunca pela API), **Carrefour** (página do produto, `"gtin"` do JSON-LD). Novo `scraper/ean_pagina.py`: 1 requisição por vez, pausa mínima de 2 s, User-Agent `SmartMarketBot/0.1 (… contato …)`, para no primeiro 403/429 e não aceita EAN-8. Opção `--sem-ean` desliga a consulta às páginas. | `66589d5`, `a7af982`, `345017d`, `3192008`, `75f1d60`, `4116c9b` |
| 3 | `normalizacao.py:43` agora grava o EAN validado em vez de `None`; EAN inválido ou interno vira `None` com a pendência `ean_invalido_descartado`. O hash do evento passa a incluir o EAN validado e, **sem EAN, o hash fica idêntico ao de antes** (carga antiga não muda). Em produto já existente, `codigo_barras` vazio é preenchido; EAN divergente do já gravado levanta `ean_divergente_exige_revisao`, sem sobrescrever. `source_signature` não mudou, então nenhuma carga antiga pede revisão. | `adf4205` |
| 4 | Novo `scraper/casamento.py`: primeiro por EAN canônico; depois, só pela chave **idêntica** (marca + palavras do nome sem a medida + quantidade e unidade-base). Não existe chave tolerante. Se a chave aponta para dois EANs diferentes, o item fica "ambíguo" e não é vinculado. Dois EANs diferentes nunca se fundem por nome. Cada vínculo traz `origem: "ean"` ou `"nome"`. | `b34c1d9` |
| 5 | Novo `scraper/relatorio_casamento.py` e o relatório [docs/casamento-produtos.md](casamento-produtos.md). | `cd5cdf7` |

**Custo da captura de EAN por página (Zaffari, Rissul, Carrefour):** cada produto passa a custar 1 requisição extra, de 300 KB a 1 MB, com pelo menos 2 s de pausa. Uma coleta padrão de 160 produtos leva mais ≈ 5,5 min e ≈ 160 MB de tráfego por rede. Para rodar sem isso: `--sem-ean`.

**Resultados da amostra ao vivo** (≤ 20 por rede, 131 produtos no total; detalhes no relatório):
- **EAN válido capturado:** Zaffari 16/16, Stok 12/12, Carrefour 19/20, Master 10/12, Rissul 12/16, Atacadão 10/15. Os que ficaram sem EAN são hortifruti, granel e pesáveis (carne moída, pão francês, cebola), cujo código de 8 dígitos ou menos é interno e foi descartado de propósito. Asun e Fort: 0.
- **EANs em 2 ou mais redes:** 4 de 75 só nos dados coletados e **47 de 75** com a consulta cruzada por EAN em Atacadão, Master e Stok. Esse é um piso, porque Zaffari, Rissul e Carrefour não têm busca por EAN.
- **Maiores sobreposições (consulta cruzada):** Atacadão–Master 27, Atacadão–Stok 24, Master–Stok 23, Atacadão–Carrefour 13, Master–Carrefour 10.
- **Casamento sobre a amostra:** 79 vínculos por EAN, **0 por nome**, 0 ambíguos, 52 itens sem vínculo. O casamento por nome ainda não ajuda, porque Asun e Fort (os únicos sem EAN) quase não têm produtos em comum com a amostra pequena das demais redes.

**Pares com o mesmo EAN e nomes muito diferentes (20 listados para revisão):** a maioria é só redação diferente do mesmo produto ("Pepsi Cola Zero" × "Pepsi Black Sem Açúcar"; "Bco Tp1" × "Agulhinha Tipo 1" no mesmo Blue Ville). **Os mais suspeitos de erro de cadastro são os de embalagem diferente:** a lã de aço Bombril 45g no Atacadão tem o mesmo EAN de "Esponja Aço Bombril Eco Com 6 Unidade" no Master e no Stok (similaridade 0,22). Esses casos precisam de revisão humana antes de qualquer fusão.

**Pontos em aberto**
- Zaffari e Rissul continuam **listando produtos pela API** (`Disallow: /api` no robots.txt), como apontado na seção 1 e na seção 2. A Fase C1 só garantiu que o EAN não vem de lá. Isso precisa de uma decisão sua.
- O vínculo com `origem` existe como saída do `casamento.py`, mas **não é gravado no banco**. `mapeamento` do `pipeline.py` continua sendo um dicionário `id externo → produto_id`, e criar uma tabela de vínculos exige alterar o schema da ingestão.
- Master e Stok ainda usam, nos coletores antigos, o User-Agent com `Mozilla/5.0 … (SmartMarket RS Bot)`. O código novo usa o User-Agent identificável completo; a troca nos coletores antigos não foi pedida.
- O `data.js` **não foi regenerado**.

---

## 16. Fase C2 — banco real, vínculos e `dataFim` opcional (2026-11-03)

Um commit por item. Relatório atualizado: [casamento-produtos.md](casamento-produtos.md).

| # | O que mudou | Commits |
|---|---|---|
| 1 | **Testes contra PostgreSQL real.** Subi o Postgres do `backend/docker-compose.yml` (porta 5436, imagem `postgres:16-alpine`) e rodei a suíte com `SMARTMARKET_TEST_DSN`. Dois defeitos escondidos pelo "ignorado": (a) os testes de integração e `preparar_banco_fixture.py` apontavam para `backend/smartmarket_ddl_updated.sql`, que não existe mais (agora é `backend/database/smartmarket_ddl_finalizado.sql`); (b) `executar_pipeline.py` importava `fcntl`, que só existe em Unix, o que derrubava 6 testes no Windows. O lock agora usa `fcntl` ou `msvcrt`. | `8f1500e`, `d0f138c` |
| 2 | Master e Stok usam o User-Agent `SmartMarketBot/0.1 (… contato …)` em vez de simular navegador. Conferido ao vivo com `--limite 1`: login e busca continuam funcionando (12 produtos em cada). | `c003fd1` |
| 3 | `casamento.py` agora gera `pares` com `status`. Mesmo EAN com medida ou número de unidades diferentes vira `revisar` (motivos `quantidade_diferente` e `embalagem_diferente`). Caso Bombril: lã de aço 45g (Atacadão) × esponja "Com 6 Unidade" (Master) e "45g Com 6 Unidades" (Stok) ficam em `revisar`; Master × Stok continua `confirmado`. Medida ausente num dos lados não gera `revisar`. | `3168c47` |
| 4 | **Tabela de vínculos.** `vinculo_produto(produto_a_id, produto_b_id, origem, status, motivo)` no DDL e em `migration_add_vinculo_produto.sql`, com `produto_a_id < produto_b_id`, `UNIQUE` no par e `CHECK` em `origem` e `status`. `scraper/vinculos.py` grava os pares do `casamento.py` (idempotente; `ean` nunca é rebaixado para `nome`; par sem produto carregado vai para `nao_resolvidos`). **Endpoint** `GET /api/precos/produto/{id}/vinculados`: preço mais recente por mercado do produto e dos vizinhos com vínculo `confirmado`; `revisar` nunca aparece. | `df4d930`, `cfff1bb` |
| 5 | **`Promocao.dataFim` opcional.** Coluna `data_fim` sem `NOT NULL` (DDL e `migration_promocao_data_fim_opcional.sql`), `@NotNull` removido do request, validação de período só quando há fim. Vigência passa a ser `data_inicio <= hoje AND (data_fim IS NULL OR data_fim >= hoje)`, ou seja, promoção sem fim vale até nova coleta. Listagem ordena por `dataFim` com nulos por último. | `2b15494` |
| 6 | Relatório com pares em revisão, coluna de status de embalagem e seção de uso dos vínculos. | `38096be` e este |

**Resultados dos testes**
- **Scraper, contra o PostgreSQL real:** 229 testes, 0 falhas, **0 ignorados**. Sem o DSN, 32 desses ficam ignorados, portanto **32 testes rodaram contra o banco real** (27 que já existiam e 5 novos de `vinculo_produto`).
- **Backend (Maven, H2):** 215 testes, 0 falhas. Novos: `VinculoProdutoServiceTest` (5), `PrecosVinculadosIntegrationTest` (4, inclui o caso Bombril), `PromocaoVigenciaIntegrationTest` (5), `PromocaoServiceTest` (+2) e `FavoritoAlertaAdminIntegrationTest` (+1, promoção sem `dataFim`). Neste computador o `mvnw test` só roda com `-Djacoco.skip=true`: o `&` no nome da pasta do usuário (`Davi_Preta&Bernardo`) quebra a linha de comando do agente do JaCoCo. Não é problema do código, e o CI não foi executado.
- **Migrações:** aplicadas duas vezes, em ordem, sobre o DDL anterior (`f4313f3`) num banco descartável: idempotentes, `data_fim` passou a aceitar `NULL` e a promoção sem fim foi gravada. Não foram aplicadas em nenhum banco persistente.

### O que ficou de fora

1. **O frontend não usa o endpoint novo**, e o `data.js` não foi tocado. O comparador da tela continua igual.
2. **Os vínculos só são gravados quando alguém roda `vinculos.py`.** Nenhuma rotina (`rotina_carga.py`, cron, workflow) o chama ainda. Ele supõe que `source` = chave da rede (`atacadao`, `master`…) e recusa o par se o id externo existir em mais de uma loja da mesma rede.
3. **Só os pares da própria coleta são gravados.** Os EANs achados pela consulta cruzada (Atacadão, Master, Stok) entram no relatório, mas não geram vínculo.
4. **Vizinhos diretos, sem transitividade.** Se A–B e B–C estão confirmados e A–C não existe, A não enxerga C. Dentro de um mesmo EAN todos os pares são gerados, então isso só aparece com vínculos por nome.
5. **Não há tela nem endpoint para um humano confirmar ou rejeitar um vínculo `revisar`.** Hoje só dá para mudar no banco. Regravar o par com `vinculos.py` volta o status para o que o `casamento.py` calcula.
6. **`data_fim` nulo = vigente para sempre.** Uma promoção sem validade só deixa de valer quando alguém a remove. Falta uma regra de expiração (por exemplo, encerrar quando a coleta seguinte não a traz).
7. **A regra de embalagem é simples:** conta só medidas (g/ml) e números de unidades escritos no nome. Não pega variações como "pack" sem número ou "caixa com 12" sem a palavra. Se um dos lados não traz medida, o par fica `confirmado` mesmo que as quantidades possam diferir.
8. **Master e Stok ainda esperam 1,0 s entre requisições** (o combinado era 2 s por host). Zaffari e Rissul continuam **listando produtos pela API**, que o robots.txt delas proíbe. As duas pendências seguem aguardando decisão.
9. **Ambiente:** o Docker Desktop foi iniciado por mim e o container `smartmarket-db` continua rodando. O container tem 22 bancos `smartmarket_fixture_*` criados pelos testes (a suíte nunca os apaga). Eles não afetam o banco `smartmarket`.
