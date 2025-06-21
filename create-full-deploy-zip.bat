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

echo   Copiando código fonte necessário...
xcopy /E /I /Y src deploy-temp\src
xcopy /E /I /Y server deploy-temp\server
xcopy /E /I /Y public deploy-temp\public /EXCLUDE:deploy-exclude.txt 2>nul

echo   Limpando arquivos e diretórios desnecessários...
for %%d in (sidefolio-portfolio-template certs-inter dist dist-server node_modules) do (
    if exist deploy-temp\%%d (
        rmdir /s /q deploy-temp\%%d
        echo   ✓ %%d removido
    )
)

for %%f in (*.pdf *.docx *.zip) do (
    if exist deploy-temp\%%f (
        del /q deploy-temp\%%f
        echo   ✓ %%f removido
    )
)

echo   Removendo uploads da cópia...
if exist deploy-temp\public\uploads (
    rmdir /s /q deploy-temp\public\uploads
    echo   ✓ Pasta uploads removida
)

echo   Copiando arquivos de configuração...
copy package.json deploy-temp\package.json
if exist package-lock.json (
    copy package-lock.json deploy-temp\package-lock.json
    echo   ✓ package-lock.json copiado
) else (
    echo   ⚠ package-lock.json não encontrado - será gerado no Docker
)
copy tsconfig*.json deploy-temp\
copy vite.config.ts deploy-temp\vite.config.ts
copy postcss.config.cjs deploy-temp\postcss.config.cjs
copy tailwind.config.cjs deploy-temp\tailwind.config.cjs
copy components.json deploy-temp\components.json
copy deploy-exclude.txt deploy-temp\deploy-exclude.txt
copy index.html deploy-temp\index.html
copy Dockerfile deploy-temp\Dockerfile
copy .dockerignore deploy-temp\.dockerignore
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
echo   📁 src/           (Código fonte do frontend)
echo   📁 server/        (Código fonte do backend)
echo   📁 public/        (Arquivos públicos - sem uploads)
echo   📄 package.json   (Dependências)
echo   📄 Dockerfile     (Multi-stage build)
echo   📄 E todos os arquivos de configuração necessários
echo.
echo O Docker fará o build completo dentro do container!
echo.
pause 