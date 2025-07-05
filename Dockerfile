# Dockerfile Final - Otimizado para Cache e Compatível com EasyPanel

# Estágio 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Declarar os argumentos de build que serão passados pelo EasyPanel
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_MERCADOPAGO_PUBLIC_KEY
ARG VITE_API_URL
# Adicione outros ARGs VITE_* que seu frontend precisa

# Tornar os ARGs disponíveis como variáveis de ambiente para o processo de build do Vite
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_MERCADOPAGO_PUBLIC_KEY=$VITE_MERCADOPAGO_PUBLIC_KEY
ENV VITE_API_URL=$VITE_API_URL

# Instalar dependências de build se necessário (mantido por segurança)
RUN apk add --no-cache python3 make g++ git

# 1. Copiar apenas os arquivos de definição de dependências primeiro (para cache eficiente)
COPY package.json package-lock.json* ./

# 2. Instalar TODAS as dependências. Esta camada será cacheada se package.json/.lock não mudar.
RUN npm install

# 3. Criar diretórios necessários para garantir existência na imagem (como no localhost)
RUN mkdir -p public/uploads public/ia_audios temp

# 4. Copiar o restante do código da aplicação.
COPY . .

# 5. Construir o frontend e o backend. O Vite usará as variáveis do EasyPanel.
RUN npx vite build
RUN npm run build:server

# 6. Remover dependências de desenvolvimento.
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
RUN mkdir -p public/uploads public/ia_audios temp && \
    chown -R nodejs:nodejs public/uploads public/ia_audios temp

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
