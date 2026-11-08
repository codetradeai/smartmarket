# Cenários de Teste Essenciais — SmartMarket

Este documento descreve os cenários de teste essenciais do sistema, no formato **Dado / Quando / Então** (Gherkin), padrão amplamente usado em testes de software (BDD — Behavior Driven Development). Serve como guia de validação: cada cenário aqui deveria ter um teste automatizado correspondente (JUnit no back-end, Jest no front-end) e/ou ser conferido manualmente antes da apresentação final.

Organizado por módulo, seguindo o MVP definido no documento de planejamento (seção 3).

## Situação de cada cenário (conferida contra o código)

Os cenários abaixo são a especificação; **nem todos têm teste automatizado e dois descrevem funcionalidades que não existem**. A coluna "Teste automatizado" aponta a classe/arquivo que cobre o cenário; "sem teste" significa que nenhum teste o exercita hoje (o comportamento pode existir no código).

| Cenário | Situação | Teste automatizado |
|---|---|---|
| 1.1 E-mail duplicado | implementado | `AuthServiceTest`, `AuthControllerIntegrationTest` (duplicata inclusive por caixa) |
| 1.2 Senha fora do critério | implementado (6 a 72 caracteres) | front: `AuthPage.test.jsx` (mínimo); back: só o máximo de 72 em `TamanhoMaximoDosCamposTest`; **sem teste do mínimo no back** |
| 1.3 Cadastro válido | implementado | `AuthServiceTest` (senha codificada), `AuthControllerIntegrationTest` |
| 1.4 Login válido | implementado | `AuthControllerIntegrationTest`, `AuthServiceTest` |
| 1.5 Senha incorreta | implementado | `AuthControllerIntegrationTest` (401), `AuthServiceTest` |
| 1.6 Sem token | implementado | `AuthControllerIntegrationTest`, `JwtAutenticacaoIntegrationTest` |
| 1.7 Usuário comum em rota admin | implementado | `ProdutoControllerIntegrationTest`, `MercadoPrecoAutorizacaoIntegrationTest`, `FavoritoAlertaAdminIntegrationTest` |
| 1.8 Token expirado | implementado (401; a orientação para novo login é do front) | `JwtAutenticacaoIntegrationTest#tokenExpiradoRecebe401`; o tratamento de 401 no front fica em `api.test.js` |
| 2.1 a 2.3 Produto: cadastro, sem nome, edição | implementado | `ProdutoControllerIntegrationTest`, `ProdutoServiceTest` |
| 2.4 Exclusão de produto em lista | **decisão pendente** do grupo | sem teste |
| 2.5 Coordenadas de mercado | **não implementado**: `Mercado` não tem latitude/longitude (geolocalização é diferencial fora do MVP) | sem teste |
| 3.1 Produto não coletado fica indisponível | implementado só em coleta completa e exaustiva | `scraper/tests/test_rotina_indisponibilidade.py` |
| 3.2 Histórico de preço | implementado | `scraper/tests/test_pipeline_postgres.py` (exige `SMARTMARKET_TEST_DSN`; pulado sem ele) |
| 3.3 Erro pontual não derruba o pipeline | implementado (registro inválido vai para a quarentena) | `scraper/tests/test_pipeline_quarentena.py` |
| 3.4 Normalização de equivalentes | implementado | `scraper/tests/test_casamento.py`, `test_normalizacao_pipeline.py` |
| 3.5 Preço zero ou negativo | implementado (`@Positive` na API, rejeição no pipeline) | **sem teste dedicado** |
| 3.6 Produto nunca coletado | parcial: o front mostra "sem preço nesta rede"; não existe a frase "sem dados disponíveis" | `CestaDemoPrecos.test.jsx`, `ShoppingListPage.precoAusente.test.jsx` |
| 4.1 Menor total | implementado | `ComparadorServiceTest`, `ListaCompraControllerIntegrationTest` |
| 4.2 Produto indisponível no mercado | implementado (mercado marcado incompleto) | `ComparadorServiceTest` |
| 4.3 Lista vazia | implementado | `ComparadorServiceTest`, `ListaCompraControllerIntegrationTest` |
| 4.4 Empate | implementado (desempata por id do mercado) | `ComparadorServicePrecificacaoTest` |
| 4.5 Idade do preço na comparação | **não implementado**: `MercadoComparacaoResponse` não traz data e a lista de compras não mostra a data de coleta (só `PrecoResponse` e a cesta de demonstração têm `coletadoEm`) | sem teste |
| 4.6 Produto repetido na lista | implementado (soma a quantidade, com teto) | `ListaCompraControllerIntegrationTest`, `ListaCompraServiceTest` |
| 5.1 Busca parcial | implementado (por `nome_normalizado`, sem acento) | `ProdutoControllerIntegrationTest`, `ProdutoNomeNormalizadoIntegrationTest` |
| 5.2 Busca sem resultado | implementado no front (a mensagem varia por tela); a API devolve página vazia | `ProdutoControllerIntegrationTest` (página vazia), `CatalogPage.test.jsx` |
| 5.3 a 5.5 Favoritar mercado | implementado | `FavoritoAlertaAdminIntegrationTest`, `FavoritoServiceTest` |
| 6.1 a 6.2 Painel admin | implementado | `FavoritoAlertaAdminIntegrationTest`, `AdminServiceTest`, `AdminPage.test.jsx` |
| 6.3 a 6.4 Promoção | implementado | `FavoritoAlertaAdminIntegrationTest`, `PromocaoServiceTest` |

Os cenários 2.5 e 4.5 ficam abaixo apenas como histórico da especificação original.

---

## 1. Autenticação

### 1.1 Cadastro com e-mail duplicado
```gherkin
Cenário: Rejeitar cadastro com e-mail já existente
  Dado que já existe um usuário cadastrado com o e-mail "usuario@email.com"
  Quando um novo usuário tenta se cadastrar usando o mesmo e-mail
  Então o sistema deve rejeitar o cadastro
  E deve informar que o e-mail já está em uso
```

### 1.2 Cadastro com senha fraca
```gherkin
Cenário: Rejeitar cadastro com senha abaixo do critério mínimo
  Dado que um usuário está se cadastrando
  Quando ele informa uma senha com menos de 6 caracteres (o limite superior é 72)
  Então o sistema deve rejeitar o cadastro
  E deve explicar o critério mínimo de senha
```

### 1.3 Cadastro válido
```gherkin
Cenário: Cadastrar usuário com dados válidos
  Dado que um usuário preenche todos os campos obrigatórios corretamente
  Quando ele confirma o cadastro
  Então o usuário deve ser criado no sistema
  E a senha deve ser armazenada de forma criptografada, nunca em texto puro
```

### 1.4 Login com credenciais corretas
```gherkin
Cenário: Autenticar usuário com credenciais válidas
  Dado que o usuário possui uma conta cadastrada
  Quando ele informa e-mail e senha corretos
  Então o sistema deve gerar e retornar um token JWT válido
```

### 1.5 Login com senha incorreta
```gherkin
Cenário: Rejeitar login com senha incorreta
  Dado que o usuário possui uma conta cadastrada
  Quando ele informa a senha incorreta
  Então o sistema deve negar o acesso
  E não deve revelar se o e-mail informado existe ou não na base
```

### 1.6 Acesso sem autenticação
```gherkin
Cenário: Bloquear acesso a rota protegida sem token
  Dado que um usuário não está autenticado
  Quando ele tenta acessar uma rota protegida
  Então o sistema deve retornar erro 401 (não autorizado)
```

### 1.7 Acesso indevido ao painel admin
```gherkin
Cenário: Bloquear usuário comum de rota administrativa
  Dado que um usuário autenticado não possui papel de administrador
  Quando ele tenta acessar uma rota exclusiva de admin
  Então o sistema deve retornar erro 403 (acesso proibido)
```

### 1.8 Token expirado
```gherkin
Cenário: Exigir novo login após expiração do token
  Dado que o token JWT do usuário expirou
  Quando ele tenta acessar uma rota protegida
  Então o sistema deve negar o acesso
  E deve orientar o usuário a autenticar-se novamente
```

---

## 2. Catálogo (produtos e mercados)

### 2.1 Cadastro de produto válido
```gherkin
Cenário: Admin cadastra produto com dados completos
  Dado que o admin preenche todos os campos obrigatórios do produto
  Quando ele confirma o cadastro
  Então o produto deve ser salvo
  E deve aparecer listado no catálogo
```

### 2.2 Cadastro de produto sem nome
```gherkin
Cenário: Rejeitar cadastro de produto sem nome
  Dado que o admin está cadastrando um produto
  Quando ele deixa o campo "nome" em branco
  Então o sistema deve rejeitar o cadastro
  E deve indicar que o campo é obrigatório
```

### 2.3 Edição de produto existente
```gherkin
Cenário: Refletir edição de produto no catálogo
  Dado que existe um produto cadastrado no catálogo
  Quando o admin edita algum de seus dados
  Então as alterações devem aparecer no catálogo
  E devem refletir nas listas de compras futuras
```

### 2.4 Exclusão de produto vinculado a listas de usuários
```gherkin
Cenário: Tratar exclusão de produto presente em listas de compras
  Dado que um produto está presente na lista de compras de algum usuário
  Quando o admin tenta excluir esse produto
  Então o sistema deve aplicar o comportamento definido pelo grupo
  # Pendência: confirmar com o time se o produto é mantido no histórico ou se a exclusão é bloqueada
```

### 2.5 Cadastro de mercado com coordenadas inválidas
> **Não implementado** (fora do MVP): o modelo `Mercado` não tem latitude/longitude. Mantido como especificação futura.

```gherkin
Cenário: Tratar coordenadas geográficas inválidas no cadastro de mercado
  Dado que o admin está cadastrando um mercado
  Quando ele informa coordenadas fora do intervalo válido de latitude/longitude
  Então o sistema deve rejeitar o cadastro ou aplicar um valor padrão definido
```

---

## 3. Preços e Promoções (coleta e normalização)

### 3.1 Produto sem preço coletado
```gherkin
Cenário: Marcar produto como indisponível quando o scraper não encontra preço
  Dado que o scraper executou a coleta para um mercado
  Quando um produto específico não é encontrado na página
  Então o sistema deve marcar o produto como indisponível
  E não deve excluí-lo do catálogo
```

### 3.2 Alteração de preço entre coletas
```gherkin
Cenário: Registrar histórico ao detectar mudança de preço
  Dado que um produto já possui um preço registrado
  Quando uma nova coleta encontra um valor diferente
  Então o sistema deve criar um novo registro de preço
  E deve manter o registro anterior no histórico, com seu respectivo horário de coleta
```

### 3.3 Erro pontual do scraper
```gherkin
Cenário: Continuar o pipeline mesmo com falha em um item
  Dado que o scraper está processando uma lista de produtos
  Quando ocorre um erro ao extrair um item específico
  Então o erro deve ser registrado em log
  E o pipeline deve continuar processando os demais itens
```

### 3.4 Normalização de produtos equivalentes
```gherkin
Cenário: Reconhecer o mesmo produto cadastrado com nomes diferentes
  Dado que dois mercados cadastram o mesmo produto com nomes ligeiramente diferentes
  Quando a camada de normalização processa os dois registros
  Então o sistema deve reconhecê-los como o mesmo produto
  E deve usar nome normalizado, marca, quantidade e código de barras (quando disponível) como critérios
```

### 3.5 Preço inconsistente
```gherkin
Cenário: Rejeitar ou sinalizar preço inválido
  Dado que a coleta retorna um valor de preço
  Quando esse valor é zero ou negativo
  Então o sistema deve rejeitar o dado ou sinalizá-lo como inconsistente
```

### 3.6 Produto nunca coletado
```gherkin
Cenário: Informar ausência de dados de preço
  Dado que um produto nunca teve preço coletado
  Quando o usuário consulta esse produto
  Então o sistema deve informar "sem dados disponíveis"
  E não deve exibir erro ou tela em branco
```

---

## 4. Lista de Compras e Comparação de Preços

### 4.1 Cálculo do menor valor
```gherkin
Cenário: Calcular corretamente o menor valor total entre mercados
  Dado que uma lista de compras contém produtos disponíveis em todos os mercados comparados
  Quando o sistema calcula o total da lista por mercado
  Então o valor total de cada mercado deve estar correto
  E o mercado com o menor total deve ser indicado como o mais barato
```

### 4.2 Produto indisponível em um mercado
```gherkin
Cenário: Tratar mercado com produto indisponível na comparação
  Dado que um produto da lista está indisponível em um dos mercados comparados
  Quando o sistema realiza o cálculo de comparação
  Então esse mercado deve ser sinalizado como incompleto ou excluído da comparação
  E o cálculo dos demais mercados não deve ser afetado
```

### 4.3 Lista de compras vazia
```gherkin
Cenário: Tratar tentativa de comparação com lista vazia
  Dado que a lista de compras do usuário está vazia
  Quando ele solicita a comparação de preços
  Então o sistema não deve realizar nenhum cálculo
  E deve orientar o usuário a adicionar itens à lista
```

### 4.4 Empate entre mercados
```gherkin
Cenário: Aplicar critério de desempate consistente
  Dado que dois mercados apresentam o mesmo valor total para a lista
  Quando o sistema determina o mercado mais barato
  Então deve aplicar um critério de desempate definido e documentado pelo grupo
```

### 4.5 Preço desatualizado
> **Não implementado**: a resposta da comparação (`MercadoComparacaoResponse`) não traz a data da coleta e a tela da lista de compras não a exibe. Mantido como especificação futura.

```gherkin
Cenário: Exibir a idade do dado de preço ao usuário
  Dado que um produto possui preço coletado há mais tempo que o padrão de atualização
  Quando o usuário visualiza o preço na comparação
  Então o sistema deve exibir a data/hora da última coleta junto ao valor
```

### 4.6 Produto duplicado na lista
```gherkin
Cenário: Tratar adição repetida do mesmo produto à lista
  Dado que um produto já está na lista de compras do usuário
  Quando ele tenta adicionar o mesmo produto novamente
  Então o sistema deve somar a quantidade ou impedir a duplicidade, conforme definido pelo grupo
```

---

## 5. Busca e Favoritos

### 5.1 Busca por termo parcial
```gherkin
Cenário: Retornar resultados para busca parcial de produto
  Dado que existem produtos cadastrados no sistema
  Quando o usuário busca por um termo parcial do nome
  Então o sistema deve retornar todos os produtos cujo nome contenha o termo buscado
```

### 5.2 Busca sem resultados
```gherkin
Cenário: Informar ausência de resultados na busca
  Dado que o usuário realiza uma busca
  Quando nenhum produto corresponde ao termo buscado
  Então o sistema deve exibir a mensagem "nenhum resultado encontrado"
  E não deve retornar erro
```

### 5.3 Favoritar mercado
```gherkin
Cenário: Adicionar mercado aos favoritos
  Dado que o usuário está autenticado
  Quando ele favorita um mercado
  Então o mercado deve aparecer na lista de favoritos do usuário
```

### 5.4 Desfavoritar mercado
```gherkin
Cenário: Remover mercado dos favoritos
  Dado que o mercado já está nos favoritos do usuário
  Quando ele desfavorita esse mercado
  Então o mercado deve sair da lista de favoritos
```

### 5.5 Favoritar mercado repetidamente
```gherkin
Cenário: Evitar duplicidade ao favoritar o mesmo mercado
  Dado que o mercado já está nos favoritos do usuário
  Quando ele tenta favoritar o mesmo mercado novamente
  Então o sistema não deve criar um registro de favorito duplicado
```

---

## 6. Painel Administrativo

### 6.1 Acesso negado a usuário comum
```gherkin
Cenário: Bloquear usuário comum de acessar o painel admin
  Dado que um usuário autenticado não possui papel de administrador
  Quando ele tenta acessar o painel administrativo
  Então o acesso deve ser negado
```

### 6.2 Listagem de mercados e produtos
```gherkin
Cenário: Exibir dados cadastrados no painel admin
  Dado que existem mercados e produtos cadastrados
  Quando o admin acessa o painel
  Então os dados devem ser exibidos corretamente, com paginação quando aplicável
```

### 6.3 Promoção com datas inválidas
```gherkin
Cenário: Rejeitar promoção com data de início posterior à data de fim
  Dado que o admin está cadastrando uma promoção
  Quando a data de início informada é posterior à data de fim
  Então o sistema deve rejeitar o cadastro
  E deve exibir uma mensagem de erro explicativa
```

### 6.4 Cadastro de promoção válida
```gherkin
Cenário: Cadastrar promoção com dados válidos
  Dado que o admin preenche corretamente os dados de uma promoção
  Quando ele confirma o cadastro
  Então a promoção deve ser vinculada corretamente ao produto e ao mercado
```

---

## Observações para o grupo

- Este documento cobre o **MVP obrigatório** (seção 3 do documento de planejamento). Cenários de diferenciais (alertas de preço, geolocalização, sugestão via IA) podem ser adicionados conforme esses recursos forem implementados.
- Cenários marcados com "conforme definido pelo grupo" dependem de decisões de negócio ainda em aberto — não são falhas, são pontos que precisam de alinhamento antes da entrega.
- Cada cenário aqui deveria, idealmente, corresponder a pelo menos um teste automatizado (ver [docs/TESTES.md](TESTES.md)). Cenários difíceis de automatizar (ex.: geolocalização real, tempo de coleta) podem ficar como checklist de teste manual antes da apresentação.
