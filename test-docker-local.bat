@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   TESTE DOCKER LOCAL - DIAGNOSTICO
echo ========================================
echo.

set /p choice="Escolha o tipo de teste (1=Completo, 2=Minimal): "

if "%choice%"=="1" goto :completo
if "%choice%"=="2" goto :minimal
echo Opção inválida. Saindo...
goto :end

:completo
echo.
echo [TESTE COMPLETO] Buildando imagem Docker...
echo.

docker build -t pontocom-test . --no-cache --progress=plain
if %errorlevel% neq 0 (
    echo.
    echo ❌ Erro no build da imagem Docker completa
    echo    Os logs acima mostram onde o problema ocorreu
    pause
    goto :end
)

echo.
echo ✅ Build completo bem-sucedido!
echo    Iniciando container na porta 3000...
echo.

docker run --rm -p 3000:3000 --name pontocom-test pontocom-test
goto :end

:minimal
echo.
echo [TESTE MINIMAL] Compilando localmente primeiro...
echo.

call npm run build
if %errorlevel% neq 0 (
    echo ❌ Erro no build do frontend
    pause
    goto :end
)

call npm run build:server
if %errorlevel% neq 0 (
    echo ❌ Erro no build do backend  
    pause
    goto :end
)

echo.
echo ✅ Compilação local bem-sucedida!
echo    Buildando imagem Docker minimal...
echo.

docker build -f Dockerfile.minimal -t pontocom-minimal . --no-cache --progress=plain
if %errorlevel% neq 0 (
    echo.
    echo ❌ Erro no build da imagem Docker minimal
    echo    Os logs acima mostram onde o problema ocorreu
    pause
    goto :end
)

echo.
echo ✅ Build minimal bem-sucedido!
echo    Iniciando container na porta 3000...
echo.

docker run --rm -p 3000:3000 --name pontocom-minimal pontocom-minimal
goto :end

:end
echo.
echo Teste finalizado.
echo.
echo Para testar a aplicação:
echo   http://localhost:3000
echo   http://localhost:3000/api/health
echo.
echo Para parar o container (em outro terminal):
echo   docker stop pontocom-test
echo   docker stop pontocom-minimal
echo.
pause 