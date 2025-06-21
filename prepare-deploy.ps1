# Script para preparar deploy no EasyPanel
Write-Host "🚀 Iniciando preparação do deploy..." -ForegroundColor Green

# Passo 1: Build do servidor
Write-Host "📦 Compilando servidor TypeScript..." -ForegroundColor Yellow
npx tsc --project tsconfig.server.json

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro na compilação do servidor!" -ForegroundColor Red
    exit 1
}

# Passo 2: Criar pasta temporária para deploy
Write-Host "📁 Criando estrutura de deploy..." -ForegroundColor Yellow
$deployDir = "deploy-temp"
Remove-Item -Recurse -Force $deployDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $deployDir

# Passo 3: Copiar arquivos compilados
Write-Host "📋 Copiando arquivos compilados..." -ForegroundColor Yellow
Copy-Item -Recurse "dist-server\*" "$deployDir\"

# Passo 4: Copiar package.json de produção
Write-Host "📦 Copiando package.json de produção..." -ForegroundColor Yellow
Copy-Item "package-prod.json" "$deployDir\package.json"

# Passo 5: Criar pasta public se não existir
Write-Host "📁 Criando estrutura de uploads..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$deployDir\public\uploads" -Force
New-Item -ItemType Directory -Path "$deployDir\public\uploads\audios" -Force
New-Item -ItemType Directory -Path "$deployDir\public\uploads\demos" -Force
New-Item -ItemType Directory -Path "$deployDir\public\uploads\avatars" -Force
New-Item -ItemType Directory -Path "$deployDir\public\uploads\guias" -Force
New-Item -ItemType Directory -Path "$deployDir\public\uploads\revisoes_guias" -Force
New-Item -ItemType Directory -Path "$deployDir\temp\uploads" -Force

# Passo 6: Criar arquivo .env template
Write-Host "🔧 Criando template .env..." -ForegroundColor Yellow
@"
# Configurações do Supabase
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Configurações do servidor
PORT=3001
MAX_UPLOAD_SIZE_MB=200
NODE_ENV=production

# Configurações de API externa (se necessário)
ELEVENLABS_API_KEY=your_api_key_here
"@ | Out-File -FilePath "$deployDir\.env.example" -Encoding UTF8

# Passo 7: Criar ZIP para deploy
Write-Host "🗜️  Criando arquivo ZIP..." -ForegroundColor Yellow
$zipPath = "dist-server-deploy.zip"
Remove-Item $zipPath -ErrorAction SilentlyContinue

Compress-Archive -Path "$deployDir\*" -DestinationPath $zipPath -Force

# Passo 8: Limpeza
Write-Host "🧹 Limpando arquivos temporários..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $deployDir

Write-Host "✅ Deploy preparado com sucesso!" -ForegroundColor Green
Write-Host "📁 Arquivo ZIP criado: $zipPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔄 Próximos passos:" -ForegroundColor White
Write-Host "1. Fazer upload do arquivo $zipPath no EasyPanel" -ForegroundColor Gray
Write-Host "2. Configurar as variáveis de ambiente no painel" -ForegroundColor Gray
Write-Host "3. Configurar o comando de start: npm start" -ForegroundColor Gray 