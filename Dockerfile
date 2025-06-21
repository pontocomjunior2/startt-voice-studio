# Build stage
FROM node:18-alpine AS builder

# Instalar dependências do sistema para compilação
RUN apk add --no-cache python3 make g++ git

# Definir diretório de trabalho
WORKDIR /app

# Definir variáveis de ambiente no build stage
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG VITE_DOWNLOAD_PROXY_URL
ARG VITE_API_URL
ARG VITE_ADMIN_SECRET
ARG GEMINI_API_KEY
ARG GEMINI_MODEL
ARG MP_ACCESS_TOKEN
ARG MP_NOTIFICATION_URL
ARG MAX_UPLOAD_SIZE_MB=200
ARG NODE_OPTIONS=--max-old-space-size=4096

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV VITE_DOWNLOAD_PROXY_URL=$VITE_DOWNLOAD_PROXY_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ADMIN_SECRET=$VITE_ADMIN_SECRET
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV GEMINI_MODEL=$GEMINI_MODEL
ENV MP_ACCESS_TOKEN=$MP_ACCESS_TOKEN
ENV MP_NOTIFICATION_URL=$MP_NOTIFICATION_URL
ENV MAX_UPLOAD_SIZE_MB=$MAX_UPLOAD_SIZE_MB
ENV NODE_OPTIONS=$NODE_OPTIONS

# Copiar arquivos de configuração para cache de dependências
COPY package.json ./
COPY package-lock.json* ./

# Instalar dependências
RUN npm ci --verbose

# Copiar configurações de build
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY postcss.config.cjs ./
COPY tailwind.config.cjs ./
COPY components.json ./
COPY index.html ./

# Copiar código fonte
COPY src/ ./src/
COPY server/ ./server/
COPY public/ ./public/

# Debug: Listar arquivos para verificar estrutura
RUN echo "=== Estrutura de arquivos ===" && ls -la
RUN echo "=== Conteúdo de src ===" && ls -la src/
RUN echo "=== Variáveis de ambiente ===" && env | grep VITE

# Build do frontend e backend
RUN echo "=== Iniciando build do frontend ===" && \
    npm run build && \
    echo "=== Build do frontend concluído ===" && \
    npm run build:server && \
    echo "=== Build do backend concluído ==="

# Verificar se os builds foram criados
RUN echo "=== Verificando builds ===" && \
    ls -la dist/ && \
    ls -la dist-server/

# Production stage
FROM node:18-alpine

# Instalar dumb-init
RUN apk add --no-cache dumb-init

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package.json ./
COPY package-lock.json* ./

# Instalar apenas dependências de produção
RUN npm ci --omit=dev --verbose && npm cache clean --force

# Copiar arquivos buildados do stage anterior
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/dist-server ./dist-server

# Criar estrutura de diretórios
RUN mkdir -p public/uploads/avatars public/uploads/demos public/uploads/guias \
    public/uploads/revisoes_guias public/uploads/audios temp/uploads \
    && chown -R nodejs:nodejs public temp

# Mudar para usuário não-root
USER nodejs

# Definir variáveis de ambiente de produção
ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Expor porta
EXPOSE 3000

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist-server/server.js"] 