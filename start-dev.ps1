# Define o título da janela do PowerShell
$Host.UI.RawUI.WindowTitle = "PontoComAudio Dev Environment"

# --- AVISO DE EXECUÇÃO ---
# Se este script não rodar, talvez você precise ajustar sua política de execução.
# Tente rodar o seguinte comando no seu terminal PowerShell e depois execute o script novamente:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# --------------------------

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host " Iniciando Ambiente de Desenvolvimento PontoComAudio" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""

# --- Verificação de Dependências ---
Write-Host "Verificando dependências (node_modules)..."
if (-not (Test-Path -Path "node_modules" -PathType Container)) {
    Write-Host ""
    Write-Host " >>> A pasta 'node_modules' não foi encontrada." -ForegroundColor Yellow
    Write-Host " >>> Instalando todas as dependências com 'npm install'. Isso pode levar alguns minutos..."
    
    # Executa o npm install e verifica por erros
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[ERRO] A instalação de dependências falhou. Verifique os erros acima." -ForegroundColor Red
        Read-Host "Pressione Enter para sair"
        exit $LASTEXITCODE
    }
    
    Write-Host ""
    Write-Host " >>> Dependências instaladas com sucesso!" -ForegroundColor Green
} else {
    Write-Host " >>> Pasta 'node_modules' encontrada."
}

Write-Host ""
Write-Host "--- Iniciando Servidores ---" -ForegroundColor Cyan
Write-Host ""
Write-Host " >>> Iniciando o frontend (Vite) e o backend (Node com hot-reload)."
Write-Host " >>> Pressione CTRL+C para encerrar todos os processos."
Write-Host ""

# Executa o script dev
npm run dev

Write-Host ""
Write-Host "Ambiente de desenvolvimento encerrado."
Read-Host "Pressione Enter para sair" 