@echo off
echo ========================================
echo    PONTCOM AUDIO - BUILD COMPLETO
echo ========================================
echo.

echo [1/6] Limpando builds anteriores...
if exist dist rmdir /s /q dist
if exist dist-server rmdir /s /q dist-server
if exist pontocomaudio-deploy-completo.zip del pontocomaudio-deploy-completo.zip
echo ✓ Builds anteriores removidos

echo.
echo [2/6] Compilando FRONTEND (React/Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ ERRO: Falha ao compilar o frontend
    pause
    exit /b 1
)
echo ✓ Frontend compilado em ./dist/

echo.
echo [3/6] Compilando BACKEND (TypeScript)...
call npx tsc --project tsconfig.server.json
if %errorlevel% neq 0 (
    echo ❌ ERRO: Falha ao compilar o backend
    pause
    exit /b 1
)
echo ✓ Backend compilado em ./dist-server/

echo.
echo [4/6] Preparando estrutura de deploy...
mkdir deploy-temp 2>nul

echo   Copiando frontend (excluindo uploads)...
xcopy /E /I /Y dist deploy-temp\dist /EXCLUDE:deploy-exclude.txt 2>nul
if exist deploy-temp\dist\uploads (
    rmdir /s /q deploy-temp\dist\uploads
    echo   ✓ Pasta uploads removida do frontend
)

echo   Copiando backend...
xcopy /E /I /Y dist-server deploy-temp\dist-server

echo   Copiando arquivos de configuração...
copy package-prod.json deploy-temp\package.json
copy Dockerfile deploy-temp\Dockerfile
copy .dockerignore deploy-temp\.dockerignore 2>nul
echo ✓ Estrutura preparada em ./deploy-temp/

echo.
echo [5/6] Criando ZIP para deploy...
powershell -Command "Compress-Archive -Path 'deploy-temp\*' -DestinationPath 'pontocomaudio-deploy-completo.zip' -Force"
if %errorlevel% neq 0 (
    echo ❌ ERRO: Falha ao criar ZIP
    pause
    exit /b 1
)
echo ✓ ZIP criado: pontocomaudio-deploy-completo.zip

echo.
echo [6/6] Limpando arquivos temporários...
rmdir /s /q deploy-temp
echo ✓ Arquivos temporários removidos

echo.
echo ========================================
echo          BUILD COMPLETO! ✅
echo ========================================
echo.
echo 📦 Arquivo: pontocomaudio-deploy-completo.zip
for %%I in (pontocomaudio-deploy-completo.zip) do echo 📏 Tamanho: %%~zI bytes
echo.
echo 🚀 Pronto para upload no EasyPanel!
echo.
echo Conteúdo do ZIP:
echo   📁 dist/          (Frontend compilado)
echo   📁 dist-server/   (Backend compilado)
echo   📄 package.json   (Dependências de produção)
echo   📄 Dockerfile     (Configuração Docker)
echo.
pause 