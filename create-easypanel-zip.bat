@echo off
echo ==============================================
echo   CRIAR ZIP PARA EASYPANEL
echo ==============================================

REM Compilar o projeto primeiro
echo 1. Compilando servidor TypeScript...
call npx tsc --project tsconfig.server.json

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

REM Verificar se Dockerfile existe
echo 2. Verificando Dockerfile...
if not exist "Dockerfile" (
    echo ERRO: Dockerfile nao encontrado
    pause
    exit /b 1
)

REM Criar pasta temporária para o ZIP
echo 3. Criando estrutura para ZIP...
if exist "easypanel-deploy" (
    rmdir /s /q "easypanel-deploy"
)
mkdir "easypanel-deploy"

REM Copiar arquivos essenciais
echo 4. Copiando arquivos essenciais...
copy "Dockerfile" "easypanel-deploy\"
copy ".dockerignore" "easypanel-deploy\"
copy "package.json" "easypanel-deploy\"
copy "package-lock.json" "easypanel-deploy\"

REM Copiar dist-server
echo 5. Copiando codigo compilado...
xcopy "dist-server" "easypanel-deploy\dist-server\" /E /I /Q

REM Criar o ZIP usando PowerShell
echo 6. Criando arquivo ZIP...
powershell.exe -Command "Compress-Archive -Path 'easypanel-deploy\*' -DestinationPath 'pontocomaudio-easypanel.zip' -Force"

if %errorlevel% neq 0 (
    echo ERRO: Falha ao criar ZIP
    pause
    exit /b 1
)

REM Limpar pasta temporária
echo 7. Limpando arquivos temporarios...
rmdir /s /q "easypanel-deploy"

echo.
echo ✅ ZIP criado com sucesso: pontocomaudio-easypanel.zip
echo.
echo 📦 Conteudo do ZIP:
echo - Dockerfile (pronto para EasyPanel)
echo - .dockerignore
echo - package.json
echo - package-lock.json (para npm install)
echo - dist-server/ (codigo compilado)
echo.
echo 📊 Tamanho do arquivo:
powershell.exe -Command "Get-Item 'pontocomaudio-easypanel.zip' | Select-Object Name, @{Name='Size(KB)';Expression={[math]::Round($_.Length/1KB,2)}}"
echo.
echo 🚀 Proximos passos:
echo 1. Acesse o EasyPanel
echo 2. Crie nova aplicacao
echo 3. Selecione "Enviar" na aba "Origem"
echo 4. Faca upload do arquivo: pontocomaudio-easypanel.zip
echo.
echo ⚠️  IMPORTANTE - Configure volumes persistentes:
echo    Volume: uploads-storage → /app/public/uploads
echo    Volume: temp-storage → /app/temp
echo.
echo 5. Configure as variaveis de ambiente
echo 6. Deploy!
echo.
pause 