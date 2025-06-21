@echo off
echo Preparando deploy para EasyPanel...

echo.
echo Passo 1: Compilando servidor TypeScript...
call npx tsc --project tsconfig.server.json
if errorlevel 1 (
    echo Erro na compilacao do servidor!
    pause
    exit /b 1
)

echo.
echo Passo 2: Criando estrutura de deploy...
if exist deploy-temp rmdir /s /q deploy-temp
mkdir deploy-temp

echo.
echo Passo 3: Copiando arquivos compilados...
xcopy /e /y dist-server\* deploy-temp\

echo.
echo Passo 4: Copiando package.json de producao...
copy package-prod.json deploy-temp\package.json

echo.
echo Passo 5: Criando estrutura de uploads com arquivos .gitkeep...
mkdir deploy-temp\public\uploads\audios 2>nul
mkdir deploy-temp\public\uploads\demos 2>nul
mkdir deploy-temp\public\uploads\avatars 2>nul
mkdir deploy-temp\public\uploads\guias 2>nul
mkdir deploy-temp\public\uploads\revisoes_guias 2>nul
mkdir deploy-temp\temp\uploads 2>nul

REM Criar arquivos .gitkeep para manter as pastas
echo. > deploy-temp\public\uploads\.gitkeep
echo. > deploy-temp\public\uploads\audios\.gitkeep
echo. > deploy-temp\public\uploads\demos\.gitkeep
echo. > deploy-temp\public\uploads\avatars\.gitkeep
echo. > deploy-temp\public\uploads\guias\.gitkeep
echo. > deploy-temp\public\uploads\revisoes_guias\.gitkeep
echo. > deploy-temp\temp\uploads\.gitkeep

echo.
echo Passo 6: Criando ZIP para deploy...
if exist dist-server-deploy.zip del dist-server-deploy.zip
powershell "Compress-Archive -Path 'deploy-temp\*' -DestinationPath 'dist-server-deploy.zip' -Force"

echo.
echo Passo 7: Limpando arquivos temporarios...
rmdir /s /q deploy-temp

echo.
echo ========================================
echo Deploy preparado com sucesso!
echo Arquivo ZIP criado: dist-server-deploy.zip
echo.
echo Proximos passos:
echo 1. Fazer upload do arquivo ZIP no EasyPanel
echo 2. Configurar as variaveis de ambiente
echo 3. Configurar comando de start: npm start
echo ========================================
pause 