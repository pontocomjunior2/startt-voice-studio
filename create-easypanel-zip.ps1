# Script PowerShell para criar ZIP do EasyPanel
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  CRIAR ZIP PARA EASYPANEL" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Compilar o projeto primeiro
Write-Host "1. Compilando servidor TypeScript..." -ForegroundColor Yellow
& npx tsc --project tsconfig.server.json

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha na compilacao do servidor" -ForegroundColor Red
    Read-Host "Pressione Enter para continuar"
    exit 1
}

# 2. Verificar se dist-server foi criado
if (-not (Test-Path "dist-server")) {
    Write-Host "ERRO: Pasta dist-server nao foi criada" -ForegroundColor Red
    Read-Host "Pressione Enter para continuar"
    exit 1
}

# 3. Verificar se Dockerfile existe
Write-Host "2. Verificando Dockerfile..." -ForegroundColor Yellow
if (-not (Test-Path "Dockerfile")) {
    Write-Host "ERRO: Dockerfile nao encontrado" -ForegroundColor Red
    Read-Host "Pressione Enter para continuar"
    exit 1
}

# 4. Criar pasta temporária para o ZIP
Write-Host "3. Criando estrutura para ZIP..." -ForegroundColor Yellow
if (Test-Path "easypanel-deploy") {
    Remove-Item -Recurse -Force "easypanel-deploy"
}
New-Item -ItemType Directory -Name "easypanel-deploy" | Out-Null

# 5. Copiar arquivos essenciais
Write-Host "4. Copiando arquivos essenciais..." -ForegroundColor Yellow
Copy-Item "Dockerfile" "easypanel-deploy\"
Copy-Item ".dockerignore" "easypanel-deploy\"
Copy-Item "package.json" "easypanel-deploy\"
Copy-Item "package-lock.json" "easypanel-deploy\"

# 6. Copiar dist-server
Write-Host "5. Copiando codigo compilado..." -ForegroundColor Yellow
Copy-Item -Recurse "dist-server" "easypanel-deploy\"

# 7. Criar o ZIP
Write-Host "6. Criando arquivo ZIP..." -ForegroundColor Yellow
Compress-Archive -Path "easypanel-deploy\*" -DestinationPath "pontocomaudio-easypanel.zip" -Force

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao criar ZIP" -ForegroundColor Red
    Read-Host "Pressione Enter para continuar"
    exit 1
}

# 8. Limpar pasta temporária
Write-Host "7. Limpando arquivos temporarios..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "easypanel-deploy"

Write-Host ""
Write-Host "✅ ZIP criado com sucesso: pontocomaudio-easypanel.zip" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Conteudo do ZIP:" -ForegroundColor Cyan
Write-Host "- Dockerfile (pronto para EasyPanel)" -ForegroundColor Gray
Write-Host "- .dockerignore" -ForegroundColor Gray
Write-Host "- package.json" -ForegroundColor Gray
Write-Host "- package-lock.json (para npm install)" -ForegroundColor Gray
Write-Host "- dist-server/ (codigo compilado)" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Tamanho do arquivo:" -ForegroundColor Cyan
$zipFile = Get-Item "pontocomaudio-easypanel.zip"
Write-Host "$($zipFile.Name): $([math]::Round($zipFile.Length/1KB,2)) KB" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Proximos passos:" -ForegroundColor Cyan
Write-Host "1. Acesse o EasyPanel" -ForegroundColor Gray
Write-Host "2. Crie nova aplicacao" -ForegroundColor Gray
Write-Host "3. Selecione 'Enviar' na aba 'Origem'" -ForegroundColor Gray
Write-Host "4. Faca upload do arquivo: pontocomaudio-easypanel.zip" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANTE - Configure volumes persistentes:" -ForegroundColor Yellow
Write-Host "   Volume: uploads-storage → /app/public/uploads" -ForegroundColor Gray
Write-Host "   Volume: temp-storage → /app/temp" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Configure as variaveis de ambiente" -ForegroundColor Gray
Write-Host "6. Deploy!" -ForegroundColor Gray
Write-Host ""
Read-Host "Pressione Enter para continuar" 