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

Localização dos arquivos `.env`:
- **Raiz do monorepo** (`smartmarket/.env`) — lido pelo `docker-compose.yml` da raiz e pelo `backend/docker-compose.yml`
- Não há `.env` dentro de `backend/` — tudo vem da raiz

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

O perfil `dev` ativa o `DataSeeder` (cria contas de teste) e usa H2 / PostgreSQL local.

| Forma de execução | Perfil ativado |
|-------------------|---------------|
| `./mvnw spring-boot:run` | `dev` (configurado no `spring-boot-maven-plugin`) |
| `./mvnw test` | `test` (via `@ActiveProfiles("test")` nas classes de teste) |
| `docker compose up` (raiz) | `prod` (via `SPRING_PROFILES_ACTIVE=prod` no `docker-compose.yml`) |
| Sem nenhum perfil explícito | Nenhum — o backend falha ao resolver `jwt.secret` |

O perfil padrão foi removido do `application.properties` intencionalmente: um deploy sem perfil explícito falha na inicialização em vez de subir com o DataSeeder ativo.

---

## Comandos rápidos

```bash
# Subir banco de dev
docker compose -f backend/docker-compose.yml up -d postgres

# Rodar o backend em modo dev
./mvnw spring-boot:run          # perfil dev, porta 8080

# Testes (perfil test, H2 em memória)
./mvnw test

# Testes sem JaCoCo (Windows com & no caminho do usuário)
./mvnw test -Djacoco.skip=true
```
