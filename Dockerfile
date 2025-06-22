# Estágio 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Declarar os argumentos de build que serão usados no build do frontend
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_DOWNLOAD_PROXY_URL
ARG VITE_API_URL
ARG VITE_ADMIN_SECRET

# Tornar os argumentos disponíveis como variáveis de ambiente para o processo de build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_DOWNLOAD_PROXY_URL=$VITE_DOWNLOAD_PROXY_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ADMIN_SECRET=$VITE_ADMIN_SECRET

# Instalar dependências de build
RUN apk add --no-cache python3 make g++ git

# Copiar arquivos de pacote e instalar TODAS as dependências
COPY package.json package-lock.json* ./
RUN npm install

# Copiar o resto do código e configurações
COPY . .

# Build do frontend e backend
RUN npm run build
RUN npm run build:server

# Remover dependências de desenvolvimento para preparar para o próximo estágio
RUN npm prune --production

# Estágio 2: Produção
FROM node:18-alpine

WORKDIR /app

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Instalar dependências essenciais de runtime
RUN apk add --no-cache dumb-init curl

# Copiar dependências de produção do estágio de build
COPY --from=builder /app/node_modules ./node_modules

# Copiar artefatos de build (frontend e backend compilados)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Copiar package.json para referência (opcional, mas bom para debug)
COPY --from=builder /app/package.json .

# Copiar diretório public
COPY --from=builder /app/public ./public

# Criar e dar permissão para os diretórios que serão montados como volumes
RUN mkdir -p public/uploads temp && \
    chown -R nodejs:nodejs public/uploads temp

# Mudar para usuário não-root
USER nodejs

# Definir a porta que a aplicação vai usar
ENV PORT=80
ENV NODE_ENV=production

# Expor a porta
EXPOSE 80

# Health check mais robusto usando curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:80/api/health || exit 1

# Comando de inicialização usando dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist-server/server.js"]
