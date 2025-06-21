# Guia de Resolução de Problemas - Deploy EasyPanel

## Problemas Resolvidos ✅

### 1. EISDIR: illegal operation on a directory
**Causa**: Servidor tentando abrir diretórios como arquivos.
**Solução**: 
- Middleware personalizado para verificar se o caminho é arquivo ou diretório
- Exclusão de diretórios problemáticos (`uploads/`, `src/app/`, `sidefolio-portfolio-template/`)
- Dockerfile que copia apenas arquivos compilados para produção

### 2. npm ci error - package-lock.json
**Causa**: Comando `npm ci` não encontrava o package-lock.json.
**Solução**:
- Lógica condicional no Dockerfile para usar `npm ci` se houver lock file
- Verificação explícita de cópia do package-lock.json no script de deploy

### 3. Build failure no Docker
**Causa**: Problemas na configuração do Dockerfile multi-stage.
**Solução**:
- Dockerfile robusto com debug verbose
- Variáveis de ambiente bem definidas
- Instalação de dependências com logging detalhado

## Estrutura do Deploy

### Dockerfile Multi-Stage
```dockerfile
# Stage 1: Build (compila frontend e backend)
FROM node:18-alpine AS builder
# Instala dependências e compila código

# Stage 2: Production (apenas arquivos necessários)
FROM node:18-alpine
# Copia apenas dist/ e dist-server/
```

### Arquivos Incluídos no ZIP
- `src/` - Código fonte do frontend
- `server/` - Código fonte do backend
- `public/` - Arquivos estáticos (sem uploads)
- `package.json` e `package-lock.json`
- Arquivos de configuração (tsconfig, vite.config, etc.)
- `Dockerfile` - Multi-stage build

### Arquivos Excluídos
- `uploads/` - Nunca incluir no deploy
- `sidefolio-portfolio-template/` - Template de exemplo
- `node_modules/` - Será instalado no Docker
- `dist/` e `dist-server/` - Será compilado no Docker
- Arquivos de desenvolvimento (`.vscode/`, `.git/`, etc.)

## Diagnóstico de Problemas

### Logs Detalhados no Docker
O Dockerfile atual inclui logs detalhados:
```dockerfile
RUN echo "=== Estrutura de arquivos ===" && ls -la
RUN echo "=== Conteúdo de src ===" && ls -la src/
RUN echo "=== Variáveis de ambiente ===" && env | grep VITE
```

### Verificações Importantes
1. **Variáveis de Ambiente**: Todas as vars VITE_* devem estar configuradas
2. **Dependências**: npm ci deve rodar sem erros
3. **Build Frontend**: `npm run build` deve gerar pasta `dist/`
4. **Build Backend**: `npm run build:server` deve gerar pasta `dist-server/`

## Possíveis Problemas Futuros

### 1. Memory Issues
**Sintoma**: Build falha com "JavaScript heap out of memory"
**Solução**: Variável `NODE_OPTIONS=--max-old-space-size=4096` já configurada

### 2. Port Conflicts
**Sintoma**: Aplicação não inicia na porta esperada
**Solução**: Verificar se PORT=3000 está configurado no EasyPanel

### 3. Database Connection
**Sintoma**: Erro de conexão com Supabase
**Solução**: Verificar se todas as variáveis SUPABASE_* estão corretas

### 4. File Upload Issues
**Sintoma**: Uploads não funcionam
**Solução**: Verificar se os diretórios de upload são criados corretamente:
```dockerfile
RUN mkdir -p public/uploads/avatars public/uploads/demos public/uploads/guias \
    public/uploads/revisoes_guias public/uploads/audios temp/uploads
```

## Comandos Úteis

### Recriar Deploy ZIP
```bash
.\create-full-deploy-zip.bat
```

### Testar Localmente
```bash
# Build completo
npm run build
npm run build:server

# Iniciar servidor
node dist-server/server.js
```

### Debug Docker Local
```bash
# Build da imagem
docker build -t pontocom-test .

# Executar container
docker run -p 3000:3000 pontocom-test
```

## Health Check
A aplicação inclui endpoint de health check em `/api/health` que retorna:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.45
}
```

## Contato
Se encontrar problemas não listados aqui, verifique:
1. Logs do Docker no EasyPanel
2. Logs da aplicação
3. Variáveis de ambiente configuradas
4. Conectividade com Supabase 