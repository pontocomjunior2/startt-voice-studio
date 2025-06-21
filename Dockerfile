# Dockerfile para deploy no EasyPanel
FROM node:18-alpine

# Instalar dependências do sistema necessárias
RUN apk add --no-cache dumb-init

# Definir diretório de trabalho
WORKDIR /app

# Aceitar todos os build args do EasyPanel
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
ARG GIT_SHA
ARG PORT=3001

# Definir como variáveis de ambiente
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
ENV GIT_SHA=$GIT_SHA
ENV PORT=$PORT
ENV NODE_ENV=production

# Copiar package.json e package-lock.json primeiro (para cache layers)
COPY package.json package-lock.json ./

# Instalar dependências de produção
RUN npm install --omit=dev && npm cache clean --force

# Copiar código compilado do servidor
COPY dist-server/ ./

# Expor porta
EXPOSE $PORT

# Comando de inicialização com dumb-init
# O servidor criará as pastas de upload automaticamente em runtime
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"] 