# SmartMarket — Documento de Passagem de Contexto e Handover

> **Data da Sessão**: 14 de Outubro de 2026  
> **Branch de Trabalho Atual**: [`feature/scraper-duas-redes`](https://github.com/opedromeireless/smartmarket/tree/feature/scraper-duas-redes) (já enviada para `origin`)  
> **Base no Git**: Branch `develop` (Commit `f6b5b46`)  
> **Objetivo deste Documento**: Registrar integralmente todas as implementações, decisões arquiteturais, commits, status de testes e próximos passos para que **qualquer novo chat ou desenvolvedor retome o trabalho instantaneamente sem perda de contexto**.

---

## 1. Resumo Executivo das Entregas do Dia

Durante a sessão de hoje, cobrimos com sucesso três grandes frentes do projeto:
1. **Segundo Supermercado & Rotina de Carga na Tabela `preco`**: Implementado o coletor do **Carrefour Mercado**, a rotina de orquestração contínua com histórico, idempotência e atualização de indisponibilidade (`disponivel = FALSE`).
2. **Supermercado 1 (Fort Atacadista) & Normalização de Produtos**: Validação com coleta HTTP real em tempo real (40 produtos, 0 falhas), compatibilização com o Spring Data JPA do backend e emissão do documento formal de homologação.
3. **Design System & Tailwind CSS no Frontend**: Configuração do Tailwind CSS v4 com base no Figma (`Friendly Consumer & Brand Guide`), criação da biblioteca de componentes UI base (`Button`, `Input`, `Card`, `Modal`, `Navbar`), compilação Vite com 100% de sucesso e visualização ativa no navegador.

---

## 2. Frente 1: Coleta, Scrapers e Pipeline PostgreSQL

### 2.1. Segundo Supermercado: Carrefour Mercado
* **Arquivo**: [`scraper/coleta_carrefour.py`](file:///e:/Area_Dev/GitHub/smartmarket/scraper/coleta_carrefour.py)
* **Arquitetura Reversa**: O endpoint clássico da VTEX retornava HTTP `503 Service Unavailable`. Implementamos a extração direta do stream SSR desidratado do React Router (`window.__reactRouterContext.streamController.enqueue`), presente no HTML inicial do storefront headless (`navigation-headless-food`).
* **Conformidade**:
  * 10 campos canônicos do Contrato v1.
  * Precisão monetária via `Decimal` e moeda obrigatória `BRL`.
  * Gravação atômica (`tempfile` + `replace`) de `.json`, `.csv` e relatório `relatorio_coleta.json`.
  * Coleta real testada com **40 produtos válidos e 0 falhas**.
* **Testes Offline**: [`scraper/tests/test_coleta_carrefour.py`](file:///e:/Area_Dev/GitHub/smartmarket/scraper/tests/test_coleta_carrefour.py) com fixtures sintéticas e 85% de cobertura.

### 2.2. Supermercado 1: Fort Atacadista & Normalização
* **Arquivos**: [`scraper/coleta_fort_atacadista.py`](file:///e:/Area_Dev/GitHub/smartmarket/scraper/coleta_fort_atacadista.py) e [`scraper/normalizacao.py`](file:///e:/Area_Dev/GitHub/smartmarket/scraper/normalizacao.py)
* **Validação em Tempo Real**: Coleta real executada contra `https://sense.osuper.com.br/334/1585/category` coletando **40 produtos aceitos e 0 falhas**, superando a pendência de João que só havia testado com fixtures offline.
* **Normalização Conservadora**:
  * Unicode NFKD + descarte de diacríticos + lowercase `casefold()`.
  * Extração estrita de grandezas (`kg`, `g`, `ml`, `l`, `un`).
  * Multipacks (`2x`, `kit`, `pacote com`) e ambiguidades não são adivinhados cegamente: geram pendência auditável em `pendencias`.
* **Compatibilidade com o Backend**: Verificado em [`com/smartmarket/service/ProdutoSpecification.java`](file:///e:/Area_Dev/GitHub/smartmarket/backend/src/main/java/com/smartmarket/service/ProdutoSpecification.java#L8-L16). A busca JPA `withNome` utiliza `LIKE %nomeNormalizado%` e é 100% congruente com a normalização do Python.
* **Documento Formal de Entrega**: [`scraper/ENTREGA-PILOTO-FORT-NORMALIZACAO.md`](file:///e:/Area_Dev/GitHub/smartmarket/scraper/ENTREGA-PILOTO-FORT-NORMALIZACAO.md).

### 2.3. Rotina de Carga Automática e Atualização na Tabela `preco`
* **Arquivo**: [`scraper/rotina_carga.py`](file:///e:/Area_Dev/GitHub/smartmarket/scraper/rotina_carga.py)
* **Orquestração Integrada**:
  * Rede 1: Fort Atacadista (`source="fort"`, `store="1585"`, `mercado_id=1`).
  * Rede 2: Carrefour Mercado (`source="carrefour"`, `store="mercado"`, `mercado_id=2`).
* **Lock Multiplataforma**: Classe `LockProcesso` baseada em `os.open(..., os.O_CREAT | os.O_EXCL)`, eliminando a dependência de `fcntl` (que quebrava no Windows) e garantindo exclusão mútua contra concorrência acidental.
* **Regras de Negócio na Tabela `preco`**:
  * **Preservação de Histórico**: Cada coleta bem-sucedida insere uma nova observação com `coletado_em` em UTC, permitindo analisar a flutuação temporal de preços.
  * **Idempotência**: Eventos com mesmo timestamp e mesmo hash canônico não duplicam linhas na tabela `preco`.
  * **Atualização de Indisponibilidade (Cenário 3.1 BDD)**: Itens cadastrados na loja que deixam de aparecer na coleta mais recente têm seu status atualizado para `disponivel = FALSE`.
  * **Inicialização de Mercados**: Garante a criação dos registros das duas redes na tabela `mercado` (`id=1` e `id=2`).
* **Documento Técnico de Operação**: [`scraper/ROTINA-DE-CARGA.md`](file:///e:/Area_Dev/GitHub/smartmarket/scraper/ROTINA-DE-CARGA.md).

### 2.4. Qualidade e Cobertura de Testes
* **Total da Suíte**: **94 testes automatizados** passando com **100% de sucesso**.
* **Cobertura Consolidada**: **75%** no módulo `scraper/` (superando a meta do grupo de 70%).
  * `coleta_fort_atacadista.py`: 98%
  * `coleta_carrefour.py`: 85%
  * `normalizacao.py`: 97%
  * `rotina_carga.py`: 83%
  * `test_rotina_carga.py`: 98%

---

## 3. Frente 2: Frontend — Design System & Tailwind CSS

### 3.1. Arquitetura e Configuração
* **Diretório**: [`frontend/`](file:///e:/Area_Dev/GitHub/smartmarket/frontend)
* **Stack**: React 19 + Vite 8 + Tailwind CSS v4 + React Router DOM 7.
* **Design Tokens (`frontend/src/index.css`)**:
  * Cores oficiais: `--color-brand-navy` (`#0D2137`), `--color-brand-green` (`#22A95E`), `--color-brand-teal` (`#1DB4A3`), `--color-brand-bg` (`#F4FAF7`), `--color-brand-border` (`#D4E8DC`), `--color-brand-coral` (`#FF6B4A`).
  * Tipografia: `Poppins` (Google Fonts: 300 a 800) e `Plus Jakarta Sans`.
  * Utilitário `cn()` em [`frontend/src/lib/utils.js`](file:///e:/Area_Dev/GitHub/smartmarket/frontend/src/lib/utils.js) (`clsx` + `tailwind-merge`).

### 3.2. Componentes UI Reutilizáveis Base (`frontend/src/components/ui/`)
1. **`Button.jsx`**: Variantes (`primary`, `secondary`, `teal`, `outline`, `subtle`, `ghost`, `danger`), múltiplos tamanhos (`sm`, `md`, `lg`, `icon`), estado `isLoading` com spinner e acessibilidade.
2. **`Input.jsx`**: Rótulo, ícone interno, mensagens de erro visual, helper text e modo de busca especializado com botão de limpeza rápida.
3. **`Card.jsx`**: Composição via `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` com variantes padrão, elevada e interativa.
4. **`Modal.jsx`**: Diálogo via React Portal com backdrop-blur suave, fechamento com ESC e clique fora, bloqueio de scroll e acessibilidade.
5. **`Navbar.jsx`**: Barra de navegação responsiva com logo oficial (`Carrinho + Radar`), links com indicador de rota ativa, busca rápida, badge com contador numérico e menu mobile (drawer).

### 3.3. Vitrine e Demonstração Interativa
* **Arquivo**: [`frontend/src/pages/Home.jsx`](file:///e:/Area_Dev/GitHub/smartmarket/frontend/src/pages/Home.jsx)
* Exibe os tokens de cores, botões com teste de loading, inputs com validação, modal interativo e um catálogo comparativo de preços ao vivo entre o **Fort Atacadista** e o **Carrefour Mercado**.
* **Build de Produção**: `npm run build` gerado em **3.29s** com 0 erros e 0 warnings.
* **Servidor Local**: Rodando em `http://127.0.0.1:5173/`.
* **Documentação Técnica do Design System**: [`frontend/DESIGN-SYSTEM.md`](file:///e:/Area_Dev/GitHub/smartmarket/frontend/DESIGN-SYSTEM.md).

---

## 4. O que foi Descoberto no Figma (Pasta `login/`)

Na pasta [`login/`](file:///e:/Area_Dev/GitHub/smartmarket/login) local do projeto, encontramos os arquivos exportados diretamente do design do Figma compartilhado pelo usuário (`M4aAtpsAun2MbrP4qv3ejx`):
* [`login/guidelines/Guidelines.md`](file:///e:/Area_Dev/GitHub/smartmarket/login/guidelines/Guidelines.md): Guia de estilos, paleta e raios de borda.
* [`login/src/pages/CatalogPage.tsx`](file:///e:/Area_Dev/GitHub/smartmarket/login/src/pages/CatalogPage.tsx): Catálogo de produtos com filtro de mercados favoritos.
* [`login/src/pages/ShoppingListPage.tsx`](file:///e:/Area_Dev/GitHub/smartmarket/login/src/pages/ShoppingListPage.tsx): Lista de compras com cálculo comparativo de qual supermercado sai mais barato no total.
* [`login/src/pages/AuthPage.tsx`](file:///e:/Area_Dev/GitHub/smartmarket/login/src/pages/AuthPage.tsx): Tela dupla de Login e Cadastro.
* [`login/src/pages/AdminPage.tsx`](file:///e:/Area_Dev/GitHub/smartmarket/login/src/pages/AdminPage.tsx): Painel administrativo de produtos e coletas.
* [`login/src/components/Layout.tsx`](file:///e:/Area_Dev/GitHub/smartmarket/login/src/components/Layout.tsx): Sidebar de navegação navy.

> **Importante**: Esses arquivos serviram como referência direta para a criação do Design System e agora estão prontos para serem integrados oficialmente no projeto `frontend/`.

---

## 5. Histórico de Commits Realizados Hoje na Branch `feature/scraper-duas-redes`

Todos os commits foram sincronizados com o repositório remoto (`git push origin feature/scraper-duas-redes`):

1. **`b35cafd`**: `feat(scraper): implementar coletor do Carrefour Mercado e testes unitarios`
2. **`baf4041`**: `docs(scraper): adicionar documentacao da segunda rede e atualizar README`
3. **`dede8a3`**: `feat(scraper): rotina automatica de coleta e carga continua na tabela preco`
4. **`b130488`**: `docs(scraper): documento de homologacao e evidencias da coleta Fort e normalizacao`
5. **`e0afa7f`**: `feat(frontend): configurar design system, tailwind css v4 e componentes ui base`

---

## 6. Próximos Passos Imediatos para o Próximo Chat

Ao iniciar o novo chat, basta copiar e colar a seguinte instrução:

> *"Leia o arquivo `HANDOVER-SESSAO.md` na raiz do projeto para obter o contexto de tudo o que foi feito hoje. Agora vamos migrar e integrar as páginas completas do Figma (`CatalogPage`, `ShoppingListPage`, `AuthPage`, `AdminPage`) da pasta `login/` para o projeto principal `frontend/`, adaptando-as para utilizar os componentes reutilizáveis (`Button`, `Input`, `Card`, `Modal`, `Navbar`) do nosso Design System."*

---

### Comandos Rápidos de Validação

```bash
# Rodar todos os 94 testes automatizados do scraper e pipeline:
python -m unittest discover -s scraper/tests -v

# Validar compilação do frontend:
cd frontend && npm run build

# Iniciar o frontend localmente no navegador:
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
```
