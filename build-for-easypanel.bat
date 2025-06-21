@echo off
echo ==============================================
echo   BUILD PARA EASYPANEL
echo ==============================================

REM Compilar o servidor TypeScript
echo Compilando servidor TypeScript...
npx tsc --project tsconfig.server.json

if %errorlevel% neq 0 (
    echo ERRO: Falha na compilacao do servidor
    pause
    exit /b 1
)

REM Verificar se dist-server foi criado
if not exist "dist-server" (
    echo ERRO: Pasta dist-server nao foi criada
    pause
    exit /b 1
)

REM Copiar Dockerfile correto
echo Copiando Dockerfile...
copy Dockerfile.correto Dockerfile

echo.
echo ✅ Build concluido com sucesso!
echo.
echo Agora você pode fazer o deploy no EasyPanel usando:
echo 1. Docker build: docker build -t pontocomaudio .
echo 2. Ou fazer upload do projeto inteiro para EasyPanel
echo.
echo Arquivos prontos para deploy:
echo - Dockerfile (copiado de Dockerfile.correto)
echo - .dockerignore  
echo - dist-server/
echo - package.json
echo.
echo ⚠️  IMPORTANTE: No EasyPanel, certifique-se de que:
echo - O Dockerfile está na raiz do projeto
echo - Todas as variáveis de ambiente estão configuradas
echo - O build context está correto
echo.
pause 