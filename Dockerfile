# Build stage - usando Node.js 18 Alpine
FROM node:18-alpine AS builder

# Instalar dependências do sistema necessárias para o build
RUN apk add --no-cache python3 make g++

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração primeiro (para cache de dependências)
COPY package.json ./
COPY package-lock.json* ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY postcss.config.cjs ./
COPY tailwind.config.cjs ./
COPY components.json ./
COPY deploy-exclude.txt ./

# Instalar TODAS as dependências (incluindo devDependencies para build)
# Usar npm ci se houver lock file, senão usar npm install
RUN if [ -f package-lock.json ]; then \
        npm ci; \
    else \
        npm install; \
    fi

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

# Copiar package.json e package-lock.json (se existir)
COPY package.json ./
COPY package-lock.json* ./
# Usar npm ci se houver lock file, senão usar npm install
RUN if [ -f package-lock.json ]; then \
        npm ci --omit=dev; \
    else \
        npm install --omit=dev; \
    fi && npm cache clean --force

# Copiar APENAS os arquivos buildados do stage anterior (não código fonte)
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/dist-server ./dist-server

# Criar estrutura de diretórios para uploads (sem copiar arquivos de desenvolvimento)
RUN mkdir -p public/uploads/avatars public/uploads/demos public/uploads/guias \
    public/uploads/revisoes_guias public/uploads/audios temp/uploads \
    && chown -R nodejs:nodejs public temp

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