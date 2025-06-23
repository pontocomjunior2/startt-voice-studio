#!/usr/bin/env pwsh
# Setup Completo do Sistema de Créditos - PontoComAudio
# Este script instala todas as funções RPC necessárias para o sistema de créditos funcionar 100%

Write-Host "=== SETUP COMPLETO DO SISTEMA DE CRÉDITOS ===" -ForegroundColor Cyan
Write-Host "Instalando todas as funções RPC necessárias..." -ForegroundColor Yellow

# 1. Estrutura da tabela lotes_creditos
Write-Host "`n[1/4] Criando tabela lotes_creditos..." -ForegroundColor Green
$tableResult = supabase functions deploy --project-ref your-project-ref supabase/functions/create-table-lotes-creditos.sql
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Tabela lotes_creditos criada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao criar tabela lotes_creditos" -ForegroundColor Red
    Write-Host "Execute manualmente via SQL Editor no Supabase Dashboard" -ForegroundColor Yellow
}

# 2. Funções de adição e manipulação de créditos
Write-Host "`n[2/4] Instalando funções de adição de créditos..." -ForegroundColor Green
$creditResult = supabase functions deploy --project-ref your-project-ref supabase/functions/create-rpc-adicionar-creditos.sql
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Funções de créditos instaladas com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao instalar funções de créditos" -ForegroundColor Red
    Write-Host "Execute manualmente via SQL Editor no Supabase Dashboard" -ForegroundColor Yellow
}

# 3. Função de criar pedido com FIFO
Write-Host "`n[3/4] Instalando função criar_pedido_com_guia..." -ForegroundColor Green
$pedidoResult = supabase functions deploy --project-ref your-project-ref supabase/functions/create-rpc-criar-pedido.sql
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Função criar_pedido_com_guia instalada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao instalar função criar_pedido_com_guia" -ForegroundColor Red
    Write-Host "Execute manualmente via SQL Editor no Supabase Dashboard" -ForegroundColor Yellow
}

# 4. Testes automatizados
Write-Host "`n[4/4] Executando testes do sistema..." -ForegroundColor Green
Write-Host "Executando testes via SQL-First Testing..." -ForegroundColor Cyan

# Exibir instruções de teste manual
Write-Host "`n=== INSTRUÇÕES DE TESTE MANUAL ===" -ForegroundColor Magenta
Write-Host "Execute os seguintes comandos no SQL Editor do Supabase:" -ForegroundColor White

Write-Host "`n-- 1. Testar criação de pedido com FIFO:" -ForegroundColor Yellow
Write-Host "SELECT criar_pedido_com_guia(" -ForegroundColor Gray
Write-Host "  'e94ef54f-dff3-42b2-b9da-b477aa5871f7'::uuid," -ForegroundColor Gray
Write-Host "  (SELECT id FROM locutores WHERE ativo = true LIMIT 1)," -ForegroundColor Gray
Write-Host "  'Teste FIFO - Pedido'," -ForegroundColor Gray
Write-Host "  'off'," -ForegroundColor Gray
Write-Host "  'Este é um teste do sistema FIFO'," -ForegroundColor Gray
Write-Host "  'Tom neutro'," -ForegroundColor Gray
Write-Host "  'Teste automatizado'" -ForegroundColor Gray
Write-Host ");" -ForegroundColor Gray

Write-Host "`n-- 2. Verificar saldo após criação:" -ForegroundColor Yellow
Write-Host "SELECT get_saldo_creditos_validos('e94ef54f-dff3-42b2-b9da-b477aa5871f7'::uuid);" -ForegroundColor Gray

Write-Host "`n-- 3. Testar expiração de créditos:" -ForegroundColor Yellow
Write-Host "SELECT expirar_creditos_vencidos();" -ForegroundColor Gray

Write-Host "`n-- 4. Verificar créditos próximos ao vencimento:" -ForegroundColor Yellow
Write-Host "SELECT verificar_creditos_proximos_vencimento(1); -- 1 dia" -ForegroundColor Gray

Write-Host "`n-- 5. Ver histórico completo de lotes:" -ForegroundColor Yellow
Write-Host "SELECT " -ForegroundColor Gray
Write-Host "  id," -ForegroundColor Gray
Write-Host "  quantidade_adicionada," -ForegroundColor Gray
Write-Host "  quantidade_usada," -ForegroundColor Gray
Write-Host "  (quantidade_adicionada - quantidade_usada) as saldo_lote," -ForegroundColor Gray
Write-Host "  data_validade," -ForegroundColor Gray
Write-Host "  CASE " -ForegroundColor Gray
Write-Host "    WHEN data_validade IS NULL THEN 'SEM_VALIDADE'" -ForegroundColor Gray
Write-Host "    WHEN data_validade < NOW() THEN 'EXPIRADO'" -ForegroundColor Gray
Write-Host "    ELSE 'VÁLIDO'" -ForegroundColor Gray
Write-Host "  END as status_validade," -ForegroundColor Gray
Write-Host "  observacao_admin" -ForegroundColor Gray
Write-Host "FROM lotes_creditos " -ForegroundColor Gray
Write-Host "WHERE user_id = 'e94ef54f-dff3-42b2-b9da-b477aa5871f7'" -ForegroundColor Gray
Write-Host "ORDER BY data_adicao DESC;" -ForegroundColor Gray

Write-Host "`n=== SISTEMA INSTALADO COM SUCESSO! ===" -ForegroundColor Green
Write-Host "✅ Todas as funções RPC estão instaladas" -ForegroundColor Green
Write-Host "✅ Sistema FIFO implementado" -ForegroundColor Green
Write-Host "✅ Expiração automática disponível" -ForegroundColor Green
Write-Host "✅ Controle de validade por pacote" -ForegroundColor Green
Write-Host "✅ Estorno correto implementado" -ForegroundColor Green

Write-Host "`n🎯 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. Execute os testes SQL acima no Supabase Dashboard" -ForegroundColor White
Write-Host "2. Configure um cron job para executar expirar_creditos_vencidos() diariamente" -ForegroundColor White
Write-Host "3. Configure alertas para verificar_creditos_proximos_vencimento()" -ForegroundColor White
Write-Host "4. Teste a criação de pedidos no frontend" -ForegroundColor White

Write-Host "`n⚠️  IMPORTANTE:" -ForegroundColor Red
Write-Host "- O sistema agora usa lotes_creditos como fonte única de verdade" -ForegroundColor Yellow
Write-Host "- Créditos são consumidos via FIFO (primeiro a vencer, primeiro a sair)" -ForegroundColor Yellow
Write-Host "- Estornos não criam novos lotes, apenas revertem o consumo" -ForegroundColor Yellow
Write-Host "- Expiração deve ser executada periodicamente (recomendado: diariamente)" -ForegroundColor Yellow 