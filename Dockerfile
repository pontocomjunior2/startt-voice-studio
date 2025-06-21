# Build stage - usando Node.js 18 Alpine para menor tamanho
FROM node:18-alpine AS builder

# Instalar dumb-init para gerenciamento de processo
RUN apk add --no-cache dumb-init

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e instalar dependências
COPY package.json ./
RUN npm install --omit=dev

# Copiar arquivos compilados
COPY dist/ ./dist/
COPY dist-server/ ./dist-server/

# Criar diretórios necessários para uploads
RUN mkdir -p public/uploads temp

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000
ENV MAX_UPLOAD_SIZE_MB=200

# Expor porta
EXPOSE 3000

# Usar dumb-init para gerenciar o processo
ENTRYPOINT ["dumb-init", "--"]

# Comando para iniciar o servidor (que servirá frontend e backend)
CMD ["node", "dist-server/server.js"] 