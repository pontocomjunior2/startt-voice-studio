# Use uma imagem base Node.js adequada
FROM node:18-slim as builder

# Defina o diretório de trabalho no container
WORKDIR /app

# Copie apenas os arquivos de dependências primeiro para aproveitar o cache do Docker
COPY package*.json ./

# Instale as dependências (será cacheado se package.json não mudar)
RUN npm install

# Crie diretórios necessários para garantir existência na imagem
RUN mkdir -p public/ia_audios public/uploads temp

# Agora copie o restante do código da aplicação
COPY . .

# Se você usa TypeScript e o build está configurado no package.json na raiz
# (ex: "build": "tsc -p tsconfig.server.json")
# Rode o build
RUN npm run build

# --- Fase de Produção (imagem menor) ---
FROM node:18-slim

WORKDIR /app

# Copie apenas as dependências de produção
COPY --from=builder /app/node_modules ./node_modules

# Copie os arquivos buildados e outros necessários (como a pasta public)
# Ajuste os caminhos conforme onde seu build gera os arquivos
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/public ./public
COPY --from=builder /app/certs-inter ./certs-inter # Se precisar dos certificados no backend
COPY --from=builder /app/temp ./temp

# Expõe a porta que o Express escuta
EXPOSE 3001

# Comando para iniciar o servidor (ajuste o caminho se necessário)
CMD [ "node", "dist-server/server.js" ]

# Se suas variáveis de ambiente não forem injetadas pelo EasyPanel, você precisará copiá-las
# ou usar secrets/configs no Docker/EasyPanel. Preferimos injetar via EasyPanel.