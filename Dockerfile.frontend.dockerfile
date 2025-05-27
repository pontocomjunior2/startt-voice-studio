# Use uma imagem base Node.js para o build
FROM node:18-slim as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Rode o build do frontend
RUN npm run build # Assumindo que este script builda o frontend para a pasta dist/

# --- Fase de Produção (servindo arquivos estáticos) ---
# Use uma imagem leve para servir arquivos estáticos, como Nginx ou Caddy.
# Nginx é comum e robusto.
FROM nginx:alpine as runner

# Copie os arquivos estáticos buildados do estágio anterior para o diretório de servir do Nginx
# O caminho /app/dist é de dentro do container 'builder'
# O caminho /usr/share/nginx/html é o padrão do Nginx para servir arquivos estáticos
COPY --from=builder /app/dist /usr/share/nginx/html

# (Opcional) Crie um arquivo de configuração Nginx customizado se precisar de regras específicas
# para SPA fallback, etc. Para Next.js App Router, geralmente não é necessário se o build for static.
# Exemplo básico para SPA fallback:
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta padrão do Nginx (80)
EXPOSE 80

# Comando padrão do Nginx para rodar
CMD ["nginx", "-g", "daemon off;"]