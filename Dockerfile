# Build stage - usando Node.js 18 Alpine
FROM node:18-alpine AS builder

# Instalar dependências do sistema necessárias para o build
RUN apk add --no-cache python3 make g++

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração primeiro (para cache de dependências)
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY postcss.config.cjs ./
COPY tailwind.config.cjs ./
COPY components.json ./
COPY deploy-exclude.txt ./

# Instalar TODAS as dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código fonte
COPY src/ ./src/
COPY server/ ./server/
COPY public/ ./public/
COPY index.html ./

# Build do frontend e backend
RUN npm run build && npm run build:server

# Production stage
FROM node:18-alpine

# Instalar dumb-init para gerenciamento de processo
RUN apk add --no-cache dumb-init

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e instalar apenas dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar arquivos buildados do stage anterior
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/dist-server ./dist-server

# Criar diretórios necessários
RUN mkdir -p public/uploads temp && chown -R nodejs:nodejs public temp

# Mudar para usuário não-root
USER nodejs

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000
ENV MAX_UPLOAD_SIZE_MB=200

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Expor porta
EXPOSE 3000

# Usar dumb-init para gerenciar o processo
ENTRYPOINT ["dumb-init", "--"]

# Comando para iniciar o servidor (que servirá frontend e backend)
CMD ["node", "dist-server/server.js"] 