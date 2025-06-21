@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   PREPARO PARA DEPLOY VIA GITHUB
echo ========================================
echo.

echo [1/4] Verificando status do repositorio...
git status --porcelain > temp_status.txt
for /f %%i in ('type temp_status.txt 2^>nul ^| find /c /v ""') do set file_count=%%i
if exist temp_status.txt del temp_status.txt

if !file_count! gtr 0 (
    echo ❌ Há arquivos não commitados!
    echo    Execute: git add -A && git commit -m "feat: prepare for github deploy"
    git status
    pause
    exit /b 1
) else (
    echo ✅ Repositório limpo - todos os arquivos commitados
)

echo.
echo [2/4] Verificando sincronização com GitHub...
git fetch origin 2>nul
for /f "tokens=*" %%i in ('git status -uno') do (
    echo %%i | findstr /C:"Your branch is up to date" >nul
    if !errorlevel! equ 0 (
        echo ✅ Branch sincronizada com o GitHub
        goto :sync_ok
    )
    echo %%i | findstr /C:"Your branch is ahead" >nul
    if !errorlevel! equ 0 (
        echo ⚠️  Branch à frente do GitHub - execute: git push
        set /p push_now="Fazer push agora? (s/N): "
        if /i "!push_now!"=="s" (
            git push
            echo ✅ Push realizado
        ) else (
            echo ❌ É necessário fazer push antes do deploy
            pause
            exit /b 1
        )
        goto :sync_ok
    )
)
:sync_ok

echo.
echo [3/4] Testando build local...
echo   Testando frontend...
call npm run build >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Erro no build do frontend
    echo    Execute: npm run build
    pause
    exit /b 1
) else (
    echo ✅ Frontend compila corretamente
)

echo   Testando backend...
call npm run build:server >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Erro no build do backend
    echo    Execute: npm run build:server
    pause
    exit /b 1
) else (
    echo ✅ Backend compila corretamente
)

echo.
echo [4/4] Verificando arquivos essenciais...

set missing_files=0

if not exist "Dockerfile" (
    echo ❌ Dockerfile não encontrado
    set /a missing_files+=1
) else (
    echo ✅ Dockerfile encontrado
)

if not exist "package.json" (
    echo ❌ package.json não encontrado
    set /a missing_files+=1
) else (
    echo ✅ package.json encontrado
)

if not exist "src\vite-env.d.ts" (
    echo ❌ src\vite-env.d.ts não encontrado
    set /a missing_files+=1
) else (
    echo ✅ Tipos TypeScript configurados
)

if !missing_files! gtr 0 (
    echo ❌ Arquivos essenciais estão faltando
    pause
    exit /b 1
)

echo.
echo ========================================
echo         PRONTO PARA GITHUB! ✅
echo ========================================
echo.
echo 📋 INFORMAÇÕES PARA O EASYPANEL:
echo.
echo 🔗 Repositório: pontocomjunior2/startt
echo 🌿 Branch: feat/visual-template-integration
echo 📦 Build Command: npm ci && npm run build && npm run build:server
echo 🚀 Start Command: node dist-server/server.js
echo 🔌 Port: 3000
echo.
echo 📝 PRÓXIMOS PASSOS:
echo   1. Acesse seu EasyPanel
echo   2. Escolha "Deploy from Git Repository"
echo   3. Conecte o GitHub e autorize o repositório privado
echo   4. Use as configurações acima
echo   5. Configure as variáveis de ambiente (veja DEPLOY-GITHUB.md)
echo.
echo 📄 DOCUMENTAÇÃO COMPLETA: DEPLOY-GITHUB.md
echo.
pause 