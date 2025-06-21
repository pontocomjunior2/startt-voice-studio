@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   PONTCOM AUDIO - DEPLOY MINIMO
echo ========================================
echo.

echo [1/5] Limpando builds anteriores...
if exist dist rmdir /s /q dist
if exist dist-server rmdir /s /q dist-server
if exist deploy-temp rmdir /s /q deploy-temp
if exist pontocomaudio-minimal-deploy.zip del /q pontocomaudio-minimal-deploy.zip
echo ✓ Builds anteriores removidos

echo.
echo [2/5] Compilando LOCALMENTE...
echo   Frontend (React/Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Erro no build do frontend
    goto :error
)
echo ✓ Frontend compilado em ./dist/

echo   Backend (TypeScript)...
call npm run build:server
if %errorlevel% neq 0 (
    echo ❌ Erro no build do backend
    goto :error
)
echo ✓ Backend compilado em ./dist-server/

echo.
echo [3/5] Preparando estrutura minimal...
mkdir deploy-temp 2>nul

echo   Copiando arquivos compilados...
xcopy /E /I /Y dist deploy-temp\dist
xcopy /E /I /Y dist-server deploy-temp\dist-server

echo   Copiando package.json para produção...
copy package.json deploy-temp\package.json

echo   Copiando Dockerfile minimal...
copy Dockerfile.minimal deploy-temp\Dockerfile

echo   Copiando .dockerignore...
copy .dockerignore deploy-temp\.dockerignore 2>nul

echo ✓ Estrutura minimal preparada

echo.
echo [4/5] Criando ZIP minimal...
tar -czf pontocomaudio-minimal-deploy.zip -C deploy-temp .
if %errorlevel% neq 0 (
    echo ❌ Erro ao criar ZIP
    goto :error
)

for %%A in (pontocomaudio-minimal-deploy.zip) do set size=%%~zA
echo ✓ ZIP criado: pontocomaudio-minimal-deploy.zip

echo.
echo [5/5] Limpando arquivos temporários...
if exist deploy-temp rmdir /s /q deploy-temp
echo ✓ Arquivos temporários removidos

echo.
echo ========================================
echo         DEPLOY MINIMAL PRONTO! 🚀
echo ========================================
echo.
echo 📦 Arquivo: pontocomaudio-minimal-deploy.zip
echo 📊 Tamanho: !size! bytes
echo.
echo 🔍 Conteúdo do ZIP:
echo   📁 dist/          (Frontend já compilado)
echo   📁 dist-server/   (Backend já compilado)
echo   📄 package.json   (Dependências mínimas)
echo   📄 Dockerfile     (Dockerfile minimal)
echo.
echo ⚠️  IMPORTANTE: Este ZIP contém arquivos pré-compilados
echo    e usa um Dockerfile mínimo para reduzir problemas de build.
echo.
pause
goto :end

:error
echo.
echo ❌ Erro durante o processo de build
echo    Verifique os logs acima para mais detalhes
pause
exit /b 1

:end
echo.
echo ✅ Processo concluído com sucesso! 