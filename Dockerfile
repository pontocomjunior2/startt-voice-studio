# Usar Node.js 18 LTS Alpine para menor tamanho
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    dumb-init

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Definir variáveis de ambiente
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

ENV NODE_ENV=production
ENV PORT=3000
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

# Debug: Mostrar informações do sistema
RUN echo "=== System Info ===" && \
    node --version && \
    npm --version && \
    echo "Memory: $(free -h)" && \
    echo "Disk: $(df -h)" && \
    echo "=== End System Info ==="

# Copiar package files primeiro (cache layer)
COPY package.json package-lock.json* ./

# Debug: Verificar arquivos copiados
RUN echo "=== Package Files ===" && \
    ls -la package* && \
    echo "=== End Package Files ==="

# Instalar dependências com handling de erros
RUN echo "=== Installing Dependencies ===" && \
    if [ -f package-lock.json ]; then \
        echo "Using npm ci..." && \
        npm ci --verbose --no-audit --no-fund || \
        (echo "npm ci failed, trying npm install..." && npm install --verbose); \
    else \
        echo "Using npm install..." && \
        npm install --verbose; \
    fi && \
    echo "=== Dependencies Installed ===" && \
    echo "=== Verifying Critical Dependencies ===" && \
    npm list vite @vitejs/plugin-react-swc typescript || echo "Some critical deps missing" && \
    echo "=== End Dependency Verification ==="

# Copiar arquivos de configuração
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY postcss.config.cjs ./
COPY tailwind.config.cjs ./
COPY components.json ./
COPY index.html ./

# Debug: Verificar configurações
RUN echo "=== Config Files ===" && \
    ls -la *.json *.ts *.cjs *.html && \
    echo "=== Checking TypeScript Config ===" && \
    cat tsconfig.json && \
    echo "=== Checking Vite Config ===" && \
    head -10 vite.config.ts && \
    echo "=== End Config Files ==="

# Copiar código fonte
COPY src/ ./src/
COPY server/ ./server/
COPY public/ ./public/

# Debug: Verificar estrutura do código
RUN echo "=== Source Structure ===" && \
    ls -la && \
    echo "--- src/ ---" && \
    ls -la src/ && \
    echo "--- server/ ---" && \
    ls -la server/ && \
    echo "--- public/ ---" && \
    ls -la public/ && \
    echo "=== End Source Structure ==="

# Debug: Verificar variáveis de ambiente críticas
RUN echo "=== Environment Variables ===" && \
    echo "VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:0:50}..." && \
    echo "VITE_API_URL: $VITE_API_URL" && \
    echo "NODE_OPTIONS: $NODE_OPTIONS" && \
    echo "NODE_ENV: $NODE_ENV" && \
    echo "=== End Environment Variables ==="

# Build frontend com tratamento de erro
RUN echo "=== Building Frontend ===" && \
    echo "Pre-build verification:" && \
    ls -la src/main.tsx src/index.css vite.config.ts || echo "Some files missing" && \
    echo "Node modules check:" && \
    ls node_modules/@vitejs/ || echo "Vite plugin missing" && \
    npm run build 2>&1 | tee build-frontend.log && \
    if [ ! -d "dist" ]; then \
        echo "ERROR: Frontend build failed - dist directory not created" && \
        cat build-frontend.log && \
        exit 1; \
    fi && \
    echo "Frontend build successful" && \
    ls -la dist/ && \
    echo "=== End Frontend Build ==="

# Build backend com tratamento de erro
RUN echo "=== Building Backend ===" && \
    npm run build:server 2>&1 | tee build-backend.log && \
    if [ ! -d "dist-server" ]; then \
        echo "ERROR: Backend build failed - dist-server directory not created" && \
        cat build-backend.log && \
        exit 1; \
    fi && \
    echo "Backend build successful" && \
    ls -la dist-server/ && \
    echo "=== End Backend Build ==="

# Limpar dependências de desenvolvimento APÓS o build
RUN echo "=== Cleaning Dev Dependencies ===" && \
    npm prune --production && \
    npm cache clean --force && \
    echo "=== Dev Dependencies Cleaned ==="

# Criar estrutura de diretórios
RUN mkdir -p \
    public/uploads/avatars \
    public/uploads/demos \
    public/uploads/guias \
    public/uploads/revisoes_guias \
    public/uploads/audios \
    temp/uploads && \
    echo "Upload directories created"

# Definir permissões
RUN chown -R nodejs:nodejs /app

# Mudar para usuário não-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Expor porta
EXPOSE 3000

# Debug final
RUN echo "=== Final Check ===" && \
    whoami && \
    pwd && \
    ls -la && \
    echo "=== Ready to Start ==="

# Inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist-server/server.js"] # Force EasyPanel cache refresh - 06/21/2025 22:56:01

# EasyPanel cache breaker - TypeScript deps fix - 2025-06-21-22-56-15
