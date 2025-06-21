@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   PREPARO PARA DEPLOY VIA GITHUB
echo ========================================
echo.

echo [1/4] Verificando status do repositorio...
git status | findstr "nothing to commit, working tree clean" >nul
if %errorlevel% equ 0 (
    echo ✅ Repositório limpo - todos os arquivos commitados
) else (
    echo ❌ Há arquivos não commitados!
    echo    Execute: git add -A && git commit -m "feat: prepare for github deploy"
    git status
    pause
    exit /b 1
)

echo.
echo [2/4] Verificando sincronização com GitHub...
git fetch origin 2>nul
git status | findstr "Your branch is up to date" >nul
if %errorlevel% equ 0 (
    echo ✅ Branch sincronizada com o GitHub
) else (
    git status | findstr "Your branch is ahead" >nul
    if %errorlevel% equ 0 (
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
    ) else (
        echo ⚠️  Status desconhecido - verifique manualmente
        git status
    )
)

echo.
echo [3/4] Testando build local...
echo   Testando frontend...
call npm run build >build_test.log 2>&1
if %errorlevel% neq 0 (
    echo ❌ Erro no build do frontend
    echo    Veja: build_test.log
    pause
    exit /b 1
) else (
    echo ✅ Frontend compila corretamente
    if exist build_test.log del build_test.log
)

echo   Testando backend...
call npm run build:server >build_server_test.log 2>&1
if %errorlevel% neq 0 (
    echo ❌ Erro no build do backend
    echo    Veja: build_server_test.log
    pause
    exit /b 1
) else (
    echo ✅ Backend compila corretamente
    if exist build_server_test.log del build_server_test.log
)

echo.
echo [4/4] Verificando arquivos essenciais...

if not exist "Dockerfile" (
    echo ❌ Dockerfile não encontrado
    pause
    exit /b 1
) else (
    echo ✅ Dockerfile encontrado
)

if not exist "package.json" (
    echo ❌ package.json não encontrado
    pause
    exit /b 1
) else (
    echo ✅ package.json encontrado
)

if not exist "src\vite-env.d.ts" (
    echo ❌ src\vite-env.d.ts não encontrado
    pause
    exit /b 1
) else (
    echo ✅ Tipos TypeScript configurados
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