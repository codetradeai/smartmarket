# SmartMarket Backend

API REST em Spring Boot 4 / Java 17. Publicação em produção (Render + Neon): [`DEPLOY.md`](DEPLOY.md).

## Variáveis de ambiente obrigatórias

| Variável | Onde é usada | Como gerar |
|----------|-------------|------------|
| `SMARTMARKET_JWT_SECRET` | Assinar e validar tokens JWT (HS256). Mínimo 32 bytes. | `openssl rand -base64 48` |
| `POSTGRES_PASSWORD` | Senha do banco em dev (compose + `application-dev.properties`) e do compose de produção | Escolha uma senha forte |

Sem `SMARTMARKET_JWT_SECRET` a aplicação recusa inicializar e exibe a mensagem:
```
SMARTMARKET_JWT_SECRET nao definido. Defina a variavel de ambiente antes de iniciar a aplicacao.
```
A aplicação também recusa inicializar (com mensagem própria) se o segredo tiver menos de 32 bytes ou se for o
valor de exemplo de `.env.example` (`gere-um-segredo-...`), que é público.

---

## Configuração do .env local (desenvolvimento)

1. Copie o exemplo na raiz do monorepo:
   ```bash
   cp .env.example .env   # ou copy .env.example .env no Windows
   ```
2. Edite `.env` e substitua os placeholders:
   ```
   POSTGRES_PASSWORD=<senha-forte>
   SMARTMARKET_JWT_SECRET=<saída do openssl acima>
   ```
3. O arquivo `.env` está no `.gitignore` — nunca é commitado.

Quem lê o `.env` e quem não lê:
- **`docker-compose.yml` da raiz**: lê o `.env` da raiz sozinho (o Compose procura o `.env` na pasta do próprio compose).
- **`backend/docker-compose.yml`** (Postgres de dev, porta 5436): **não** lê o `.env` da raiz, porque o Compose resolve o `.env`
  a partir da pasta do arquivo de compose, e não há `.env` em `backend/`. Sem a senha, ele aborta com
  `required variable POSTGRES_PASSWORD is missing a value`. Passe o arquivo explicitamente (a partir da raiz):
  `docker compose -f backend/docker-compose.yml --env-file .env up -d postgres`
  (ou `cd backend && docker compose --env-file ../.env up -d postgres`), ou exporte `POSTGRES_PASSWORD` no shell.
- **Spring Boot** (`./mvnw spring-boot:run`): **não** lê `.env`. As variáveis precisam estar exportadas no shell ou na IDE
  (seções abaixo). Use a **mesma** `POSTGRES_PASSWORD` do banco: se ela não estiver exportada, o perfil `dev` cai no
  valor padrão de `application-dev.properties` e a conexão com o banco criado com outra senha falha.

---

## Definindo as variáveis no terminal

**Linux / macOS / Git Bash:**
```bash
export SMARTMARKET_JWT_SECRET="$(openssl rand -base64 48)"
export POSTGRES_PASSWORD="senha-forte-aqui"
```

**PowerShell (Windows):**
```powershell
$env:SMARTMARKET_JWT_SECRET = (openssl rand -base64 48)
$env:POSTGRES_PASSWORD = "senha-forte-aqui"
```

---

## Definindo as variáveis na IDE

### IntelliJ IDEA
1. Abra **Run → Edit Configurations** para o perfil Spring Boot.
2. Em **Environment variables**, clique no ícone de edição e adicione:
   - `SMARTMARKET_JWT_SECRET` = `<valor>`
   - `POSTGRES_PASSWORD` = `<valor>`

### VS Code (extensão Spring Boot Dashboard)
Adicione ao `.vscode/launch.json`:
```json
{
  "type": "java",
  "name": "SmartMarketApplication",
  "env": {
    "SMARTMARKET_JWT_SECRET": "<valor>",
    "POSTGRES_PASSWORD": "<valor>"
  }
}
```
O arquivo `.vscode/launch.json` está no `.gitignore`.

---

## Perfil dev e como é ativado

O perfil `dev` ativa o `DataSeeder` (cria contas de teste) e usa o PostgreSQL local de `backend/docker-compose.yml` (porta 5436). O H2 em memória é só do perfil `test`.

| Forma de execução | Perfil ativado |
|-------------------|---------------|
| `./mvnw spring-boot:run` | `dev` (configurado no `spring-boot-maven-plugin`) |
| `./mvnw test` | `test` (via `@ActiveProfiles("test")` nas classes de teste) |
| `docker compose up` (raiz) | `prod` (via `SPRING_PROFILES_ACTIVE=prod` no `docker-compose.yml`) |
| Sem nenhum perfil explícito | Nenhum — o backend falha ao resolver `jwt.secret` |

O perfil padrão foi removido do `application.properties` intencionalmente: um deploy sem perfil explícito falha na inicialização em vez de subir com o DataSeeder ativo.

---

## Regras da API que o código impõe

- **Papel do usuário**: o `PapelDoBancoJwtConverter` lê o papel no banco a cada requisição autenticada; a claim `papel` do token
  não decide nada. Rebaixar ou promover alguém vale na hora, e token de usuário apagado dá 401.
- **E-mail**: no cadastro vai para minúsculas e sem espaços nas pontas; duplicata por caixa é recusada. O login ignora espaços e
  caixa, e continua valendo para contas antigas gravadas com maiúsculas.
- **Senha**: de 6 a 72 caracteres (o limite superior é do bcrypt).
- **Entrada inválida é 400, não 500**: JSON malformado, parâmetro com tipo errado (id ou página não numéricos) e violações de
  validação respondem 400. Os campos dos DTOs têm o tamanho máximo das colunas.
- **Lista de compras**: quantidade de 1 a 999 por item (a soma de adições repetidas também respeita o teto) e no máximo 100 itens
  distintos por lista; acima disso a API responde 400.
- **Busca por nome** (`GET /api/produtos?nome=`): compara o termo, sem acento e em minúsculas, só com `produto.nome_normalizado`.
  Produtos criados ou renomeados gravam o valor sozinhos; bancos que já receberam o `03_carga.sql` precisam rodar uma vez o passo
  manual `backend/deploy/05_corrige_nome_normalizado.sql` (ver `DEPLOY.md`).

---

## Comandos rápidos

```bash
# Subir banco de dev (a partir da raiz; o compose de backend/ não lê o .env da raiz sozinho)
docker compose -f backend/docker-compose.yml --env-file .env up -d postgres

# Rodar o backend em modo dev
./mvnw spring-boot:run          # perfil dev, porta 8080

# Testes (perfil test, H2 em memória)
./mvnw test

# Testes sem JaCoCo (Windows com & no caminho do usuário)
./mvnw test -Djacoco.skip=true
```

### Diretório temporário no Windows (opcional, só na sua máquina)

O repositório **não** versiona `backend/.mvn/jvm.config` (antes ele apontava para uma pasta de uma máquina
específica e, fora dela, o Maven criava uma pasta `E:` dentro do projeto). Se o seu usuário do Windows tem
`&` ou acentos no caminho e o temp padrão atrapalha o build, crie o arquivo localmente (ele está no
`.gitignore`) com um caminho que exista na sua máquina:

```
-Djava.io.tmpdir=C:/temp-maven
```
