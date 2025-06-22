# Estágio 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências de build
RUN apk add --no-cache python3 make g++ git

# Copiar arquivos de pacote e instalar TODAS as dependências
COPY package.json package-lock.json* ./
RUN npm ci

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

# Criar e dar permissão para diretórios de upload
RUN mkdir -p public/uploads temp/uploads && \
    chown -R nodejs:nodejs public/uploads temp/uploads

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
