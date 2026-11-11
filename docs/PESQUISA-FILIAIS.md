# Pesquisa: filiais e preço por filial/CEP nas redes ativas

> Pesquisa feita em **2026-11-11**. Escopo: Asun, Master, Stok, Atacadão e Carrefour. Fort, Zaffari e Rissul ficaram de fora, como combinado.
> **Nenhum código foi alterado.** Este é o único arquivo criado no repositório. Os arquivos baixados ficaram fora dele.

## 0. Como a pesquisa foi feita

- `robots.txt` lido antes de qualquer outra requisição em cada host. Nenhum declara `Crawl-delay`.
- **1 requisição por vez, com pausa de 2 s** antes de cada uma (um script serial, sem paralelismo).
- User-Agent: o de `scraper/identificacao.py` (`SmartMarketBot/0.1 (projeto academico Codifica/+praTI; contato: …)`). `SMARTMARKET_CONTATO` não estava definida neste computador, então usei a URL pública do repositório como contato, que é o exemplo do próprio módulo.
- Sem proxy, sem cookie, sem login, sem trocar cabeçalhos para escapar de bloqueio.
- Regra seguida nos bloqueios: ao receber 403, 429 ou 503, **parei naquele caminho** e não tentei de novo.
- Total aproximado de requisições: 35, em 11 hosts.

## 1. Asun (OSuper, empresa 319)

**Hosts e robots.txt**
- `www.asunonline.com.br`, `sense.osuper.com.br`, `api.asunonline.com.br` e `cdn.osuper.com.br` devolvem o mesmo robots: `User-agent: *` com `Allow: /` e `Content-Signal: search=yes,ai-train=no,use=reference`. Só crawlers de IA e SEO nominais têm `Disallow: /`; `SmartMarketBot` não está entre eles. O `ai-train=no` é reserva de direitos para treino de IA; o uso aqui (comparar preços) não é treino, mas fica registrado.

**(a) Listagem de filiais: parcial**
- A home pública (`https://www.asunonline.com.br/`, HTML com estado embutido) traz a lista completa de lojas ativas, mas **só com `slug` e `storeId`**: `activeStoresCount: 24`, `storeId` de **1540 a 1563**. Exemplos: `asun-cavalhada` (1540), `asun-imbe` (1541), `asun-cidreira` (1542), `asun-capao-da-canoa` (1543), `asun-cachoeirinha-centro-2` (1560), `asun-eldorado` (1562) e `leve-mais-restinga…` (1563).
- A página `https://www.asunonline.com.br/2780/nossas-lojas` (permitida) traz **endereço completo só da loja ativa por padrão**. Formato do bloco de endereço: `name`, `lat`, `lng`, `address`, `number`, `neighborhood`, `city`, `state`, `postalCode`. Exemplo real: Asun Cavalhada, AV. CAVALHADA 2985, Porto Alegre/RS, CEP 91740-001, lat -30.1026, lng -51.2312.
- **Não consegui obter endereço/CEP das outras 23 lojas por caminho permitido.** A URL com slug (`/asun-imbe/nossas-lojas`) ignora o slug e devolve a loja padrão; a loja ativa depende de estado do navegador (seleção do cliente). Escolher a loja simulando esse estado seria forjar sessão, então parei.
- Há uma API GraphQL pública do storefront (`https://api.asunonline.com.br/storefront/graphql`, robots com `Allow: /`). **Não a usei:** não conheço o schema e adivinhar consultas ou rodar introspecção seria sondagem sem documentação. É a pista mais promissora, mas fica **não confirmada**.

**(b) Preço por filial: sim pelo desenho, mas não reconfirmei hoje**
- Pelo código (`coleta_asun.py`) e pelo diagnóstico de 2026-11-02, a filial entra **no caminho da URL**: `https://sense.osuper.com.br/319/<storeId>/category/<id>` e `/319/<storeId>/search?search=…`. Não precisa de cookie.
- **Teste de hoje:** 3 consultas `/319/{1540,1560,1545}/search?search=cafe…&size=3` com o User-Agent identificado devolveram **403 HTML da Cloudflare**. Não contornei. Em 2026-11-02 o mesmo tipo de consulta com o UA identificado tinha dado 200 (diagnóstico §13, item 6), então o bloqueio é novo ou intermitente.
- Formato da resposta (diagnóstico §3): `hits[]` com `pricing.price`, `promotion`, `promotionalPrice`, `discount`; sem endereço, CEP ou lat/long.

**Estimativa no RS:** 24 filiais (contagem do estado público). Pelos nomes (Cavalhada, Cachoeirinha, Capão da Canoa, Osório, Torres…) quase todas parecem ser do RS, mas confirmei o estado de **uma** só.

**Observação lateral:** `coleta_asun.py` ainda envia `User-Agent` de navegador com `Origin`/`Referer` da loja (`HEADERS`, linhas 54-59), o que contraria a regra de identificação. A correção da Fase B só alcançou o sincronizador. Não mexi.

## 2. Master (VipCommerce, organização 193)

**robots.txt**
- `www.lojaonline.mastersupermercados.com.br/robots.txt` (200): `User-agent: *` bloqueia `/busca`, `/buscas`, `/filtro`, carrinho, checkout, área do cliente, `/entrega-retirada`, `/televendas` e URLs legadas de `/produtos/…`. **Não bloqueia a API**.
- `services.vipcommerce.com.br/robots.txt`: 404, ou seja, sem regras.

**(a) Listagem de filiais: não confirmada**
- O site é um SPA Angular: o HTML (3 KB) não traz dados, e a lista, se existe, vem por API. O bundle principal (`main-*.js`, público) mostra conceitos de **filial** e **centro de distribuição (CD)** (`filialECdSelecionado`, `filiaisTelevendas`, `filialSemEcommerce`, `getFilialByFilialDomain`), mas não achei o endpoint de listagem; as 177 telas lazy ficam em chunks que não baixei.
- Para saber qual filial atende o cliente, o fluxo do site passa por `/entrega-retirada`, que **está em `Disallow`**. Não segui por ele.

**(b) Preço por filial: sim pela estrutura da URL, sem confirmação ao vivo**
- O endpoint usado pelo coletor tem a filial e o CD no caminho: `https://services.vipcommerce.com.br/api-admin/v1/org/193/filial/{filial}/centro_distribuicao/{cd}/loja/buscas/produtos/termo/<termo>`. Hoje o coletor fixa `filial/1/centro_distribuicao/1`.
- **Não chamei a API.** Ela exige um token do `POST …/auth/loja/login` com um `key` fixo extraído do site (`AUTH_KEY`). O coletor já faz isso, mas, pela sua regra de não contornar login, tratei como zona cinzenta e **não testei com outro `filial`**. Falta saber ao vivo: (1) se outros IDs de filial existem; (2) se o preço muda de verdade entre eles.
- Campos de endereço/CEP/lat/long: **não vistos** (sem acesso a nenhuma listagem).

**Estimativa de filiais no RS:** **não consegui estimar** com o que li.

## 3. Stok (VipCommerce, organização 130)

**robots.txt**
- `stokonline.com.br` redireciona (301) para `www.stokonline.com.br`. O robots de `www.stokonline.com.br` é **idêntico ao do Master** (mesma plataforma). A API (`services.vipcommerce.com.br`) não tem robots.

**(a) e (b):** valem os mesmos achados do Master. SPA Angular com o mesmo bundle (`main-LMMCVVZS.js`, mesmo nome de arquivo), mesmo desenho de URL com `filial/{id}/centro_distribuicao/{cd}`, coletor fixo em `filial/1`. Sem listagem de filiais encontrada, sem teste ao vivo por filial, sem estimativa de unidades no RS.

## 4. Atacadão (VTEX)

**robots.txt** (`www.atacadao.com.br`): `Allow: /`; bloqueia `/checkout`, `/checkout/*`, `/busca/*`, `/account`, `/orders`, `/api/io/login`, entre outros. `/api/catalog_system` e `/api/checkout/pub/regions` **não casam** com nenhum `Disallow`. Sitemap em `/sitemap.xml`.

**(a) Listagem de filiais: não confirmada**
- Não achei uma página pública de lojas por URL. Não testei `/sitemap.xml` à procura de páginas de loja.

**(b) Preço por região/CEP: possível na plataforma, não confirmado**
- Em VTEX, o CEP vira uma **região** por `GET /api/checkout/pub/regions?country=BRA&postalCode=<CEP>`, que devolve `regionId` e os sellers (lojas) da região. Esse é o mecanismo esperado, mas **eu não vi a resposta**: as 2 tentativas (CEPs 90010-000 e 95010-000) voltaram **429 Too Many Requests**, com 2 s de pausa e sem requisição anterior além do robots. Parei, como manda a regra do projeto de retirada imediata em 429.
- Mesmo que a consulta funcionasse, usar o `regionId` na busca de preços normalmente passa pelo cookie de segmento de região (`vtex_segment`). Pela sua regra, **isso é cookie de região, então não haveria caminho permitido por aí**; só o `regionId` explícito em endpoint público seria aceitável, e não confirmei se o Atacadão aceita.
- O diagnóstico (§5) já alertava que o coletor atual **não define região**: o catálogo (56.829 itens) é o nacional.

**Estimativa de filiais no RS:** não confirmada nesta pesquisa.

## 5. Carrefour (mercado.carrefour.com.br)

**robots.txt**
- `mercado.carrefour.com.br`: `Allow: /`; bloqueia `/account/*`, `/minha-conta/*`, `/login*`, `/checkout/*`, `*sort=*`.
- `www.carrefour.com.br` (onde fica o localizador de lojas): `Allow: /`; bloqueia `/busca/`, `/account/*`, `/checkout/*` etc. `/localizador-de-lojas` **não é bloqueado**.

**(a) Listagem de filiais: só pista parcial**
- A página `https://www.carrefour.com.br/localizador-de-lojas` (permitida, 3,4 MB) traz embutida uma lista de **334 registros só com `state`, `city` e `district`** (bairro). **Sem endereço, CEP, lat ou long.** No RS, achei **18 registros**, com algumas repetições aparentes (Porto Alegre/Partenon aparece duas vezes, por exemplo): Caxias do Sul, Canoas, Porto Alegre, Santa Maria, Gravataí, entre outras.
- Não sei se esses registros são lojas, páginas de loja ou configuração. O localizador de verdade provavelmente consulta uma API que não identifiquei. Tratem os 18 como **indício, não como contagem confiável**; também não distingue hipermercado, Bairro, Express e Drive.

**(b) Preço por região/CEP: não confirmado**
- O diagnóstico (§8) diz que o preço depende de CEP e loja e que o coletor não define região.
- Uma tentativa em `https://mercado.carrefour.com.br/api/checkout/pub/regions?country=BRA&postalCode=90010000` voltou **503 vazio**. Parei.
- A home do Mercado não traz `regionId`, `postalCode` nem lista de sellers no HTML. Pelo que vi, a região é resolvida no navegador (cookie), então, **sem caminho permitido comprovado**.

**Estimativa de filiais no RS:** só o indício acima (≈ 18 registros, não confiáveis).

## 6. Tabela-resumo

| Rede | Listagem de filiais permitida? | Endereço/CEP/lat-long? | Preço por filial/CEP? | Recomendação |
|---|---|---|---|---|
| **Asun** | **Parcial.** Home pública lista 24 `storeId` (1540-1563) com slug | **Só de 1 loja** (Cavalhada): endereço, CEP, lat, lng | **Sim, pela URL** (`/319/<storeId>/…`), mas hoje a API responde 403 ao UA identificado; não reconfirmado | Melhor candidata. Primeiro avaliar o GraphQL público (`api.asunonline.com.br/storefront/graphql`) para obter endereços, depois testar o 403 com a Cloudflare/OSuper e pedir liberação |
| **Master** | Não confirmada (SPA, lista só via API) | Não visto | **Provável** (`filial/{id}/centro_distribuicao/{cd}` na URL), não testado por exigir token do login da loja | Decidir se o token anônimo da VipCommerce conta como "login"; se não, testar 2-3 filiais (1 req cada) |
| **Stok** | Não confirmada | Não visto | **Provável**, igual ao Master (mesma plataforma) | Resolver junto com o Master; o resultado vale para as duas |
| **Atacadão** | Não confirmada | Não visto | **Possível** via CEP→região (VTEX), mas a consulta deu 429 e o uso do `regionId` pode exigir cookie | Tentar de novo em outro dia/horário, 1 req; se continuar 429, tratar como **sem caminho permitido** |
| **Carrefour** | **Só indício** (localizador com 334 registros, 18 no RS) | **Não** (só estado, cidade e bairro) | **Sem caminho permitido comprovado** (503 na consulta e região por cookie) | Não depender do Carrefour para o recurso por CEP; manter preço único por rede e listar as lojas por cidade/bairro |

## 7. O que não consegui confirmar

1. **Preço diferente por filial, ao vivo**, em qualquer rede. É a pergunta central e continua em aberto: Asun levou 403, Atacadão 429, Carrefour 503, e Master/Stok não foram chamados por causa do token de login.
2. **Endereço/CEP/lat-long de todas as filiais**: só tenho 1 loja da Asun completa.
3. **Número de filiais no RS** em Master, Stok e Atacadão, e o número confiável no Carrefour.
4. A **GraphQL da Asun** e os **endpoints de lojas das VipCommerce** não foram explorados (schema desconhecido, token necessário).
5. **Termos de uso** das cinco redes **não foram lidos**. O robots.txt permite os caminhos acima, mas não substitui os termos, nem a reserva `ai-train=no` da Asun.
6. Os 403, 429 e 503 podem ser intermitentes (Cloudflare e WAFs reagem a volume e a horário); uma segunda rodada em outro momento pode dar resultado diferente. Não repeti para respeitar a regra de retirada.

## 8. Decisões que ficam com você

- O `POST …/auth/loja/login` da VipCommerce (Master e Stok) com o `key` público do site é **login ou não**? Isso decide se dá para testar preço por filial nessas duas redes.
- Autorizar uma consulta pontual ao GraphQL da Asun para listar lojas com endereço.
- Se vale pedir à Asun/OSuper e ao Atacadão liberação formal do acesso, já que o bloqueio (403/429) apareceu mesmo com UA identificado e pausa de 2 s.
