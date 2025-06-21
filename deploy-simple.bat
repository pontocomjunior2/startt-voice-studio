@echo off
echo Preparando deploy SIMPLIFICADO para EasyPanel...

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
if exist deploy-simple rmdir /s /q deploy-simple
mkdir deploy-simple

echo.
echo Passo 3: Copiando arquivos compilados...
xcopy /e /y dist-server\* deploy-simple\

echo.
echo Passo 4: Copiando package.json de producao...
copy package-prod.json deploy-simple\package.json

echo.
echo Passo 5: Criando ZIP para deploy...
if exist dist-server-simple.zip del dist-server-simple.zip
powershell "Compress-Archive -Path 'deploy-simple\*' -DestinationPath 'dist-server-simple.zip' -Force"

echo.
echo Passo 6: Limpando arquivos temporarios...
rmdir /s /q deploy-simple

echo.
echo ========================================
echo Deploy SIMPLIFICADO preparado com sucesso!
echo Arquivo ZIP criado: dist-server-simple.zip
echo.
echo IMPORTANTE: O servidor criara as pastas de upload automaticamente
echo.
echo Proximos passos:
echo 1. Fazer upload do arquivo ZIP no EasyPanel
echo 2. Configurar as variaveis de ambiente
echo 3. Configurar comando de start: npm start
echo ========================================
pause 