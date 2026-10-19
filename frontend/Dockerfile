# =========================================================
# Multi-stage Dockerfile para SmartMarket Frontend (React + Vite + Nginx)
# =========================================================

# Estagio 1: Compilacao da aplicacao React
FROM node:20-alpine AS builder
WORKDIR /app

# Copia manifestos de dependencias
COPY package*.json ./

# Instalacao limpa e reprodutivel das dependencias
RUN npm ci || npm install

# Copia todo o codigo-fonte
COPY . .

# Gera o bundle de producao otimizado
RUN npm run build

# Estagio 2: Servidor web de producao ultraleve com Nginx Alpine
FROM nginx:1.27-alpine AS runner

# Copia os artefatos estaticos gerados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuracao otimizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
