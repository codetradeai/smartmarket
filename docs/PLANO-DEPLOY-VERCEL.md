# Plano de deploy na Vercel (proposta para validação)

Status: **aprovado em 01/11/2026** (João). Decisões: Vercel só com o service
`frontend`; `/api/*` em proxy no mesmo domínio; backend ainda sem host
(placeholder em `vercel.json`); scraper fora da Vercel; sem bindings.

## 1. O que existe no repositório

| Diretório | O que é | Como fala com os outros |
|---|---|---|
| `frontend/` | SPA React + Vite, estática no build | Chama a API pelo navegador via `VITE_API_URL` (default `http://localhost:8080/api`), lida em **tempo de build** |
| `backend/` | API Spring Boot, Java 17, Dockerfile multi-stage | Lê Postgres por `SPRING_DATASOURCE_*`; CORS por `SMARTMARKET_CORS_ORIGINS` |
| `scraper/` | Scripts Python de coleta em lote (`coleta_*.py`, `rotina_carga.py`) | Escreve direto no Postgres por `SMARTMARKET_DSN`. Não expõe HTTP. Roda por cron do GitHub Actions (`coleta_diaria.yml`, 07:00 UTC) ou por systemd |

Ninguém chama ninguém por HTTP interno: o único caminho de rede entre serviços é
**navegador → backend**. Scraper e backend compartilham só o banco.

## 2. Por que a sugestão automática não funciona como está

1. **O backend é Java.** A Vercel não tem runtime Java para serviços. Ele não
   pode ser declarado em `services`, nem com `runtime`, nem com Dockerfile.
   Precisa ficar em outro provedor (Render, Fly.io, Railway, Cloud Run, VPS)
   ou ser reescrito, o que está fora do escopo.
2. **O scraper não é um serviço web.** Declará-lo como `runtime: python` sem
   `entrypoint` HTTP quebra o build, e mesmo com um handler ele não teria
   nada para responder. O lugar dele continua sendo o cron do GitHub Actions
   que já existe.
3. **Bindings não se aplicam.** Binding injeta URL em tempo de execução de
   uma *function*. O frontend é estático e chama a API do navegador, então a
   URL precisa existir no build (`VITE_API_URL`) ou ser um caminho relativo
   resolvido por rewrite. Não há nenhum par serviço→serviço em runtime na
   Vercel.

## 3. Proposta

Vercel hospeda **só o frontend** e faz proxy de `/api/*` para o backend
externo. Ganhos: um domínio só, sem CORS no navegador, e a URL do backend sai
do bundle e vai para uma variável de ambiente da Vercel.

### `vercel.json` proposto (raiz do repositório)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "frontend": {
      "root": "frontend",
      "framework": "vite"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://BACKEND-SMARTMARKET-URL-AQUI/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": { "service": "frontend" }
    }
  ]
}
```

Observação: `vercel.json` não expande variáveis de ambiente em
`destination`, então a URL do backend fica literal no arquivo (ela é pública
de qualquer forma). Enquanto não há backend hospedado, o arquivo traz o
placeholder `https://BACKEND-SMARTMARKET-URL-AQUI/api/$1`.

### Mudanças no código

| Arquivo | Mudança | Motivo |
|---|---|---|
| `frontend/src/services/api.js` | Default de `API_BASE_URL` passa a `/api` quando `VITE_API_URL` não estiver definida em produção; localhost continua no dev | O navegador chama o mesmo domínio e a Vercel faz o proxy |
| `frontend/src/services/api.test.js` | Ajustar a expectativa do default | Acompanha a mudança acima |
| `backend/.../application-prod.properties` | Incluir o domínio da Vercel em `SMARTMARKET_CORS_ORIGINS` só se alguém for chamar o backend direto; com o proxy, o CORS deixa de ser necessário | Evita abrir CORS sem precisar |
| `.github/workflows/coleta_diaria.yml` | Nenhuma | O scraper continua onde está |
| `README.md` | Seção "Deploy" descrevendo Vercel (front) + backend externo + cron do scraper | Documentar o desenho |

### Variáveis de ambiente na Vercel

| Variável | Onde | Valor |
|---|---|---|
| `VITE_API_URL` | Não definir | Deixa o default `/api` valer |

### Fora da Vercel

- Backend: deploy do `backend/Dockerfile` no provedor escolhido, com
  `SPRING_PROFILES_ACTIVE=prod`, `SPRING_DATASOURCE_*`, `SMARTMARKET_JWT_SECRET`
  (novo, rotacionado) e `SPRING_SQL_INIT_MODE=never`.
- Banco: Postgres gerenciado (Neon, Supabase, RDS, ou o do próprio provedor).
- Scraper: cron do GitHub Actions apontando `SMARTMARKET_DSN` para esse banco.

## 4. Perguntas respondidas

1. **Nome do serviço:** `frontend`.
2. **Backend:** ainda sem host. Placeholder em `vercel.json`; deploy do
   backend é outra tarefa.
3. **Caminho público da API:** `/api/*` no mesmo domínio (proxy).
4. **Scraper:** fora da Vercel, no cron do GitHub Actions.
5. **Bindings:** nenhum; não há chamada serviço→serviço em runtime.

## 5. Pendente para o deploy funcionar

- Hospedar o backend e trocar o placeholder em `vercel.json`.
- Apontar `SMARTMARKET_DSN` do workflow de coleta para o banco de produção.
- `vercel dev` não foi executado nesta sessão (exige login na Vercel);
  validado o JSON e o build de produção do frontend com `baseURL: /api`.
