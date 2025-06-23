#!/usr/bin/env pwsh

# Script para configurar o sistema de créditos do PontoComAudio
# Este script deve ser executado UMA VEZ para migrar o sistema

Write-Host "🔧 Configurando Sistema de Créditos - PontoComAudio" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Verificar se npx está disponível
if (!(Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ERRO: npx não encontrado. Instale Node.js primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se supabase CLI está disponível
Write-Host "📡 Verificando Supabase CLI..." -ForegroundColor Yellow
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Supabase CLI não encontrado. Tentando instalar..." -ForegroundColor Yellow
    npm install -g supabase
    if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
        Write-Host "❌ ERRO: Não foi possível instalar Supabase CLI." -ForegroundColor Red
        Write-Host "   Instale manualmente: npm install -g supabase" -ForegroundColor Red
        exit 1
    }
}

# Verificar se está logado no Supabase
Write-Host "🔐 Verificando autenticação Supabase..." -ForegroundColor Yellow
$supabaseStatus = supabase status 2>&1
if ($supabaseStatus -match "not logged in" -or $supabaseStatus -match "No project linked") {
    Write-Host "❌ ERRO: Não está logado no Supabase ou projeto não vinculado." -ForegroundColor Red
    Write-Host "   Execute: supabase login" -ForegroundColor Red
    Write-Host "   Depois: supabase link --project-ref SEU_PROJECT_REF" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Supabase configurado!" -ForegroundColor Green

# Passo 1: Criar tabela lotes_creditos
Write-Host "`n📝 Passo 1: Criando tabela lotes_creditos..." -ForegroundColor Blue
$sqlTable = Get-Content "supabase/functions/create-table-lotes-creditos.sql" -Raw
$tempTableFile = "temp-table.sql"
$sqlTable | Out-File -FilePath $tempTableFile -Encoding UTF8

try {
    supabase db push --include-all
    Write-Host "✅ Estrutura da tabela aplicada!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Tentando aplicar via SQL direto..." -ForegroundColor Yellow
    # Como fallback, criar arquivo migration
    $migrationName = "create_lotes_creditos_table"
    $migrationPath = "supabase/migrations/$(Get-Date -Format 'yyyyMMddHHmmss')_$migrationName.sql"
    
    if (!(Test-Path "supabase/migrations")) {
        New-Item -ItemType Directory -Path "supabase/migrations" -Force
    }
    
    Copy-Item $tempTableFile $migrationPath
    Write-Host "📁 Migration criada: $migrationPath" -ForegroundColor Green
    Write-Host "   Execute manualmente: supabase db push" -ForegroundColor Yellow
}

# Passo 2: Criar funções RPC
Write-Host "`n🔧 Passo 2: Criando funções RPC..." -ForegroundColor Blue
$sqlFunctions = Get-Content "supabase/functions/create-rpc-adicionar-creditos.sql" -Raw
$tempFunctionsFile = "temp-functions.sql"
$sqlFunctions | Out-File -FilePath $tempFunctionsFile -Encoding UTF8

$migrationFunctionName = "create_creditos_rpc_functions"
$migrationFunctionPath = "supabase/migrations/$(Get-Date -Format 'yyyyMMddHHmmss')_$migrationFunctionName.sql"
Copy-Item $tempFunctionsFile $migrationFunctionPath
Write-Host "✅ Migration de funções criada: $migrationFunctionPath" -ForegroundColor Green

# Passo 3: Criar script de migração de dados
Write-Host "`n📦 Passo 3: Criando script de migração de dados..." -ForegroundColor Blue
$migrationData = @"
-- Migração de dados: profiles.credits -> lotes_creditos
-- Execute este script APÓS criar a tabela e funções

-- 1. Inserir lotes para usuários que têm créditos em profiles.credits
INSERT INTO lotes_creditos (
  user_id,
  quantidade_adicionada,
  quantidade_usada,
  data_validade,
  status,
  admin_id_que_adicionou,
  observacao_admin
)
SELECT 
  id as user_id,
  credits as quantidade_adicionada,
  0 as quantidade_usada,
  NULL as data_validade, -- Sem validade para créditos migrados
  'ativo' as status,
  NULL as admin_id_que_adicionou,
  'Migração automática de profiles.credits para lotes_creditos em ' || NOW()::text as observacao_admin
FROM profiles
WHERE credits > 0
  AND NOT EXISTS (
    SELECT 1 FROM lotes_creditos 
    WHERE lotes_creditos.user_id = profiles.id 
    AND observacao_admin LIKE 'Migração automática%'
  );

-- 2. Verificar resultado da migração
SELECT 
  'Migração concluída' as status,
  COUNT(*) as usuarios_migrados,
  SUM(quantidade_adicionada) as total_creditos_migrados
FROM lotes_creditos
WHERE observacao_admin LIKE 'Migração automática%';

-- 3. Comparar totais (opcional - para validação)
SELECT 
  'profiles.credits' as fonte,
  COUNT(*) as usuarios_com_creditos,
  SUM(credits) as total_creditos
FROM profiles
WHERE credits > 0

UNION ALL

SELECT 
  'lotes_creditos' as fonte,
  COUNT(DISTINCT user_id) as usuarios_com_creditos,
  SUM(quantidade_adicionada - quantidade_usada) as total_creditos
FROM lotes_creditos
WHERE status = 'ativo'
  AND (data_validade IS NULL OR data_validade > NOW());
"@

$migrationDataName = "migrate_profiles_credits_to_lotes"
$migrationDataPath = "supabase/migrations/$(Get-Date -Format 'yyyyMMddHHmmss')_$migrationDataName.sql"
$migrationData | Out-File -FilePath $migrationDataPath -Encoding UTF8
Write-Host "✅ Migration de dados criada: $migrationDataPath" -ForegroundColor Green

# Passo 4: Aplicar todas as migrations
Write-Host "`n🚀 Passo 4: Aplicando migrations..." -ForegroundColor Blue
try {
    supabase db push
    Write-Host "✅ Todas as migrations aplicadas com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Erro ao aplicar migrations automaticamente." -ForegroundColor Yellow
    Write-Host "   Execute manualmente: supabase db push" -ForegroundColor Yellow
}

# Limpeza
Write-Host "`n🧹 Limpando arquivos temporários..." -ForegroundColor Yellow
Remove-Item $tempTableFile -ErrorAction SilentlyContinue
Remove-Item $tempFunctionsFile -ErrorAction SilentlyContinue

Write-Host "`n✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. Teste o sistema acessando: http://localhost:5174/teste-creditos" -ForegroundColor White
Write-Host "2. Execute 'Testar Tabela lotes_creditos' para verificar estrutura" -ForegroundColor White
Write-Host "3. Execute 'Migrar profiles.credits → lotes_creditos' se necessário" -ForegroundColor White
Write-Host "4. Teste com 'Teste Novo (lotes_creditos)' para adicionar créditos" -ForegroundColor White
Write-Host "5. Verifique o painel admin em http://localhost:5174/admin/usuarios" -ForegroundColor White
Write-Host ""
Write-Host "🐛 DEBUGGING:" -ForegroundColor Yellow
Write-Host "- Logs detalhados estão no console do navegador" -ForegroundColor White
Write-Host "- Use F12 → Console para ver logs '[AuthContext] DEBUGGING'" -ForegroundColor White
Write-Host "- Verifique se as funções RPC existem no Supabase Dashboard" -ForegroundColor White
Write-Host ""
Write-Host "🎯 RESULTADO ESPERADO:" -ForegroundColor Green
Write-Host "- Créditos aparecendo no canto superior direito (clientes)" -ForegroundColor White
Write-Host "- Admin Dashboard mostrando total de créditos" -ForegroundColor White
Write-Host "- Admin Usuários mostrando créditos por cliente" -ForegroundColor White

# Verificar se o servidor está rodando
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5174" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $serverRunning = $true
} catch {
    # Servidor não está rodando
}

if ($serverRunning) {
    Write-Host "`n🌐 Servidor detectado em http://localhost:5174" -ForegroundColor Green
    Write-Host "   Acesse /teste-creditos para testar o sistema!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Servidor não detectado. Execute 'npm run dev' para iniciar." -ForegroundColor Yellow
}

Write-Host "`nPressione Enter para continuar..." -ForegroundColor Gray
Read-Host 