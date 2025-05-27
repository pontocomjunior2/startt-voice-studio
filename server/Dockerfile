# Use uma imagem base Node.js adequada
FROM node:18-slim as builder

# Defina o diretório de trabalho no container
WORKDIR /app

# Copie os arquivos package.json e package-lock.json (ou yarn.lock, pnpm-lock.yaml) para instalar dependências
# Copie do diretório raiz do seu projeto local
COPY package*.json ./

# Instale as dependências
RUN npm install

# Copie o resto do código da aplicação
# Copie do diretório raiz do seu projeto local
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

# Expõe a porta que o Express escuta
EXPOSE 3001

# Comando para iniciar o servidor (ajuste o caminho se necessário)
CMD [ "node", "dist-server/server.js" ]

# Se suas variáveis de ambiente não forem injetadas pelo EasyPanel, você precisará copiá-las
# ou usar secrets/configs no Docker/EasyPanel. Preferimos injetar via EasyPanel.