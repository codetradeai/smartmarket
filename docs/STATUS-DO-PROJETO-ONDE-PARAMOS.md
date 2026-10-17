# Status do Projeto SmartMarket — Onde Paramos & Histórico de Entregas

**Data do Registro:** 17 de Outubro de 2026  
**Branch de Trabalho Atual:** `feature/endpoints-favoritos-alertas-admin`  
**Branch Base:** `main` (rastreando `origin/feature/endpoints-favoritos-alertas-admin`)  
**Estado de Sincronização:** Branch subida com sucesso ao GitHub via `git push -u origin feature/endpoints-favoritos-alertas-admin` (PR pronta para abertura).

---

## 1. 🔍 Resumo Executivo da Auditoria 360º & Entregas

Durante a auditoria arquitetural 360º, estabelecemos os seguintes alinhamentos estratégicos:
1. **Stack Real do Backend:** Esclarecido e consolidado que o backend opera com **Java 17 + Spring Boot 3.4.3 + Spring Data JPA (Hibernate) + Spring Security 6 (OAuth2 Resource Server com Nimbus JWT) + Maven**, garantindo tipagem forte e transacionalidade ACID estrita.
2. **Entrega do Card do Time (Ronald, Carlos e Diana):**  
   Os módulos de **Favoritos**, **Alertas de Menor Preço** e **Painel Admin com RBAC** foram completamente estruturados, cobertos por testes de integração e organizados em commits atômicos no padrão Conventional Commits.
3. **Resolução das Pendências P0 (Segurança, Resiliência e Ambientes):**  
   Adicionado **Rate Limiting** nos endpoints sensíveis, sincronizada a **extração de erros da API no Frontend** e resolvido o isolamento de compilação e testes do Maven no Windows com Java 17.

---

## 2. 🛠️ O Que Foi Realizado Detalhadamente

### Fase P0: Fundação, Segurança e Desbloqueio (100% Concluído)
1. **Padronização Java 17 & Resolução de Surefire no Windows:**
   - Criado `backend/.mvn/jvm.config` configurando `-Djava.io.tmpdir` seguro dentro do diretório `target`, eliminando falhas de execução do Maven Surefire causadas pelo caractere especial `&` no caminho do usuário (`C:\Users\Davi_Preta&Bernardo`).
   - Recompiladas todas as 80 classes do backend e suites de teste com `javac [release 17]`.
2. **Rate Limiting no Backend (Proteção contra Força Bruta):**
   - Criado `backend/src/main/java/com/smartmarket/security/RateLimitingFilter.java` limitando tentativas de autenticação (`/api/auth/login` e `/api/auth/register`) a **15 requisições por minuto por IP**, respondendo com `HTTP 429 Too Many Requests`.
   - Injetado no pipeline do `SecurityConfig.java`.
   - Adicionada propriedade configurável `security.rate-limit.enabled=false` no `application-test.properties` para viabilizar execução limpa de testes unitários e de integração sem bloquear MockMvc.
3. **Extração de Mensagens de Validação e Erro no Frontend:**
   - Refatorado `frontend/src/contexts/AuthContext.jsx` para interpretar o payload padrão retornado pelo `GlobalExceptionHandler.java` (`data.erro` e dicionário de validação `data.campos`).
   - Alertas visuais na `AuthPage.jsx` agora exibem mensagens precisas como *"Email já cadastrado"* ou *"A senha deve ter no mínimo 6 caracteres"*.
4. **Módulos de Negócio do Backend Entregues e Testados:**
   - **Favoritos:** `FavoritoController.java`, `FavoritoService.java`, entidades e DTOs para favoritar produtos e mercados parceiros.
   - **Alertas de Menor Preço:** `AlertaController.java`, `AlertaService.java` com monitoramento de valor desejado.
   - **Painel Administrativo:** `AdminController.java`, `AdminService.java` com KPIs de métricas e alteração de perfis (`ROLE_ADMIN` vs `ROLE_USER`).
   - **Testes de Integração:** `FavoritoAlertaAdminIntegrationTest.java` com 6 cenários cobrindo fluxos autenticados e controle de acesso.

---

## 3. 🧪 Resultados dos Testes Automatizados (100% Verdes)

### Backend (Spring Boot 3.4 / JUnit 5 / H2):
```text
[INFO] Running com.smartmarket.controller.FavoritoAlertaAdminIntegrationTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 54.42 s
[INFO] BUILD SUCCESS

[INFO] Running com.smartmarket.service.ProdutoServiceTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 7.002 s
[INFO] BUILD SUCCESS
```

### Frontend (React 19 / Vite):
```text
vite v8.2.2 building client environment for production...
✓ 109 modules transformed.
✓ built in 961ms
```

---

## 4. 🗂️ Mapeamento de Arquivos da Sessão

### Arquivos Criados:
| Arquivo | Finalidade |
| :--- | :--- |
| `backend/.mvn/jvm.config` | Define `java.io.tmpdir` seguro para o Maven Surefire no Windows. |
| `backend/.../security/RateLimitingFilter.java` | Filtro OncePerRequest para mitigação de ataques de força bruta em `/api/auth/**`. |
| `backend/.../controller/FavoritoController.java` | Endpoints REST para gerenciamento de favoritos (mercados e produtos). |
| `backend/.../controller/AlertaController.java` | Endpoints REST para metas e alertas de preço. |
| `backend/.../controller/AdminController.java` | Endpoints REST para KPIs do painel e gestão de usuários. |
| `backend/.../controller/ListaCompraController.java` | Endpoints de listas de compra e algoritmo comparador de cestas. |
| `backend/.../controller/MercadoController.java` | Endpoints de consulta e gestão de redes parceiras. |
| `backend/.../controller/PrecoController.java` | Endpoints de consulta de catálogo com menor preço consolidado. |
| `backend/.../controller/PromocaoController.java` | Endpoints de promoções ativas. |
| `backend/.../dto/admin/*` | DTOs de KPIs do dashboard e alteração de papéis. |
| `backend/.../dto/alerta/*` | DTOs de alertas de preço. |
| `backend/.../dto/favorito/*` | DTOs de favoritos de produtos e mercados. |
| `backend/.../dto/lista/*` | DTOs de itens e comparador de cestas. |
| `backend/.../model/FavoritoProduto.java` | Entidade JPA para associação de produtos favoritos por usuário. |
| `backend/.../repository/FavoritoProdutoRepository.java` | Interface JPA para produtos favoritos. |
| `backend/.../service/AdminService.java` | Regras de métricas e controle de acessos. |
| `backend/.../service/AlertaService.java` | Regras de avaliação de alertas de preço. |
| `backend/.../service/FavoritoService.java` | Regras de associação de favoritos. |
| `backend/.../service/ListaCompraService.java` | Algoritmo de agregação de menor custo por item e cesta total. |
| `backend/.../controller/FavoritoAlertaAdminIntegrationTest.java` | Testes de integração end-to-end com MockMvc e JWT. |
| `backend/Dockerfile` | Build multi-stage seguro com Eclipse Temurin JRE 17 e usuário não-root. |
| `frontend/Dockerfile` & `nginx.conf` | Build multi-stage com Nginx 1.27 Alpine, proxy reverso `/api/` e SPA routing. |
| `docker-compose.yml` | Orquestração local de PostgreSQL 16 + Backend Spring Boot + Frontend Nginx. |
| `.github/workflows/ci.yml` | Pipeline de CI automatizado no GitHub Actions. |

### Arquivos Modificados:
| Arquivo | Modificação Realizada |
| :--- | :--- |
| `backend/src/main/java/com/smartmarket/security/SecurityConfig.java` | Adicionado `RateLimitingFilter` e permissões de rotas para `/api/favoritos/**`, `/api/alertas/**`, `/api/listas/**` e `/api/admin/**`. |
| `backend/src/main/resources/application-test.properties` | Desativado rate limit em ambiente de teste (`security.rate-limit.enabled=false`). |
| `frontend/src/contexts/AuthContext.jsx` | Extração resiliente de mensagens de erro estruturadas da API. |
| `frontend/src/pages/CatalogPage.jsx` | Integrado aos serviços com fallback local resiliente. |
| `frontend/src/pages/ShoppingListPage.jsx` | Integrado aos serviços com cálculo comparativo dinâmico. |
| `frontend/src/pages/FavoritesPage.jsx` | Integrado à sincronização assíncrona de favoritos. |
| `frontend/src/pages/AdminPage.jsx` | Integrado aos KPIs dinâmicos e alteração de perfis. |

---

## 5. 🚀 Histórico de Commits e Subida para o GitHub

A branch dedicada do card foi criada e enviada com sucesso:
* **Branch Remota:** `feature/endpoints-favoritos-alertas-admin`
* **Commits Realizados:**
  1. `e36b816` — `feat(favorito): criar controller, service e repositorios de favoritos de produtos e mercados`
  2. `66df831` — `feat(alerta): criar endpoints e regras de negocio para alertas de menor preco`
  3. `8c035b2` — `feat(admin): implementar controller e service para kpis do painel e gestao de usuarios`
* **Pull Request:** Pronta para abertura no GitHub apontando para a branch base (`main` ou `develop`).

---

## 6. 🎯 Próximo Foco Imediato: Fase P1 (Funcionalidades de Negócio & Carga)

Avançaremos agora para a implementação sequencial dos itens de **Prioridade P1**:
1. **Normalização de Grandezas no Scraper e Backend:**  
   Conversão uniforme para unidades base do Sistema Internacional (gramas -> kg, mililitros -> L), viabilizando o cálculo fidedigno do **preço por quilo/litro** na comparação entre mercados com embalagens de tamanhos diferentes.
2. **Carga Real de Dados do Scraper no PostgreSQL:**  
   Executar a ingestão idempotente dos produtos coletados no banco de dados através da `rotina_carga.py`.
3. **Regra de Negócio de Promoções no Catálogo:**  
   Vincular a tabela `promocao` na consulta `/api/precos/catalogo`, calculando descontos vigentes e enriquecendo a flag `promo: true` no frontend.
