import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

export default function TesteCreditosPage() {
  const { user } = useAuth();
  const [creditosParaAdicionar, setCreditosParaAdicionar] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const handleTesteCreditos = async () => {
    if (!user?.id) {
      toast.error('Usuário não logado');
      return;
    }

    setIsLoading(true);
    setResultado(null);

    try {
      const response = await fetch('/api/teste-creditos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          creditosParaAdicionar: creditosParaAdicionar
        })
      });

      const result = await response.json();

      if (response.ok) {
        setResultado(result);
        toast.success('Teste executado com sucesso!', {
          description: `${result.addedCredits} créditos adicionados`
        });
      } else {
        throw new Error(result.message || 'Erro no teste');
      }
    } catch (error: any) {
      toast.error('Erro no teste', {
        description: error.message
      });
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testarTabelaLotes = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('Teste 1: Verificando se tabela lotes_creditos existe...');
      
      // Teste 1: Verificar se a tabela existe
      const { data: countData, error: countError } = await supabase
        .from('lotes_creditos')
        .select('*', { count: 'exact', head: true });

      console.log('Resultado contagem:', { countData, countError });

      if (countError) {
        setResult({
          erro: 'Erro ao acessar tabela lotes_creditos',
          detalhes: countError
        });
        return;
      }

      console.log('Teste 2: Buscando todos os lotes...');
      
      // Teste 2: Buscar todos os lotes
      const { data: todosLotes, error: todoLotesError } = await supabase
        .from('lotes_creditos')
        .select('*')
        .limit(10);

      console.log('Todos os lotes:', { todosLotes, todoLotesError });

      if (todoLotesError) {
        setResult({
          erro: 'Erro ao buscar lotes',
          detalhes: todoLotesError
        });
        return;
      }

      console.log('Teste 3: Testando query com filtros...');
      
      // Teste 3: Query com filtros (como no código original)
      const currentDate = new Date().toISOString();
      const { data: lotesValidosGeral, error: lotesValidosError } = await supabase
        .from('lotes_creditos')
        .select('*')
        .eq('status', 'ativo')
        .or(`data_validade.is.null,data_validade.gt.${currentDate}`);

      console.log('Lotes válidos geral:', { lotesValidosGeral, lotesValidosError });

      setResult({
        totalLotes: countData,
        todosLotes: todosLotes,
        lotesValidos: lotesValidosGeral,
        dataAtual: currentDate,
        erros: {
          count: countError,
          todos: todoLotesError,
          validos: lotesValidosError
        }
      });

    } catch (err) {
      console.error('Erro no teste:', err);
      setResult({
        erro: 'Erro inesperado',
        detalhes: err
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testarUsuarioEspecifico = async () => {
    setIsLoading(true);
    
    try {
      // Buscar um usuário aleatório
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username')
        .limit(1);

      if (!users || users.length === 0) {
        setResult({ erro: 'Nenhum usuário encontrado' });
        return;
      }

      const userId = users[0].id;
      console.log('Testando com usuário:', userId);

      // Testar lotes deste usuário
      const { data: lotesUsuario, error: lotesUsuarioError } = await supabase
        .from('lotes_creditos')
        .select('*')
        .eq('user_id', userId);

      console.log('Lotes do usuário:', { lotesUsuario, lotesUsuarioError });

      setResult({
        usuario: users[0],
        lotesUsuario: lotesUsuario,
        erro: lotesUsuarioError
      });

    } catch (err) {
      setResult({ erro: 'Erro no teste de usuário', detalhes: err });
    } finally {
      setIsLoading(false);
    }
  };

  // NOVA FUNÇÃO: Migrar créditos de profiles para lotes_creditos
  const migrarCreditosParaLotes = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔄 MIGRAÇÃO: Iniciando migração de profiles.credits para lotes_creditos...');
      
      // 1. Buscar todos os usuários com créditos > 0
      const { data: usersComCreditos, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, credits, email')
        .gt('credits', 0);

      if (usersError) {
        throw new Error(`Erro ao buscar usuários: ${usersError.message}`);
      }

      console.log(`📊 Encontrados ${usersComCreditos?.length || 0} usuários com créditos`);

      if (!usersComCreditos || usersComCreditos.length === 0) {
        setResult({
          sucesso: true,
          message: 'Nenhum usuário com créditos encontrado para migrar',
          usuariosMigrados: 0
        });
        return;
      }

      // 2. Para cada usuário, criar um lote em lotes_creditos
      const migracoesPromises = usersComCreditos.map(async (user) => {
        const { error: insertError } = await supabase
          .from('lotes_creditos')
          .insert({
            user_id: user.id,
            quantidade_adicionada: user.credits,
            quantidade_usada: 0,
            data_validade: null, // Sem validade para créditos migrados
            status: 'ativo',
            admin_id_que_adicionou: null,
            observacao_admin: 'Migração automática de profiles.credits para lotes_creditos'
          });

        if (insertError) {
          console.error(`❌ Erro ao migrar usuário ${user.username}:`, insertError);
          return { usuario: user.username, sucesso: false, erro: insertError.message };
        }

        console.log(`✅ Migrado usuário ${user.username}: ${user.credits} créditos`);
        return { usuario: user.username, sucesso: true, creditosMigrados: user.credits };
      });

      const resultadosMigracoes = await Promise.all(migracoesPromises);
      const sucessos = resultadosMigracoes.filter(r => r.sucesso);
      const falhas = resultadosMigracoes.filter(r => !r.sucesso);

      setResult({
        sucesso: true,
        message: `Migração concluída: ${sucessos.length} sucessos, ${falhas.length} falhas`,
        usuariosMigrados: sucessos.length,
        usuariosComFalha: falhas.length,
        detalhes: resultadosMigracoes
      });

      if (sucessos.length > 0) {
        toast.success(`Migração concluída! ${sucessos.length} usuários migrados.`);
      }

      if (falhas.length > 0) {
        toast.error(`${falhas.length} falhas na migração. Verifique os detalhes.`);
      }

    } catch (err: any) {
      console.error('💥 Erro na migração:', err);
      setResult({
        sucesso: false,
        erro: 'Erro na migração',
        detalhes: err.message
      });
      toast.error('Erro na migração', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // NOVA FUNÇÃO: Adicionar créditos usando lotes_creditos
  const adicionarCreditosViaLotes = async () => {
    if (!user?.id) {
      toast.error('Usuário não logado');
      return;
    }

    setIsLoading(true);
    setResultado(null);

    try {
      console.log(`🧪 [TESTE LOTES] Adicionando ${creditosParaAdicionar} créditos via lotes_creditos`);

      // 1. Buscar créditos atuais via lotes_creditos
      const currentDate = new Date().toISOString();
      const { data: lotes, error: lotesError } = await supabase
        .from('lotes_creditos')
        .select('quantidade_adicionada, quantidade_usada')
        .eq('user_id', user.id)
        .eq('status', 'ativo')
        .or(`data_validade.is.null,data_validade.gt.${currentDate}`);

      if (lotesError) {
        throw new Error(`Erro ao buscar lotes atuais: ${lotesError.message}`);
      }

      const creditosAtuais = lotes?.reduce((sum, lote) => 
        sum + (lote.quantidade_adicionada - (lote.quantidade_usada || 0)), 0) || 0;

      console.log(`💰 Créditos atuais (via lotes): ${creditosAtuais}`);

      // 2. Adicionar novo lote
      const { error: insertError } = await supabase
        .from('lotes_creditos')
        .insert({
          user_id: user.id,
          quantidade_adicionada: creditosParaAdicionar,
          quantidade_usada: 0,
          data_validade: null, // Sem validade para testes
          status: 'ativo',
                     admin_id_que_adicionou: null,
          observacao_admin: 'Teste manual de adição de créditos'
        });

      if (insertError) {
        throw new Error(`Erro ao inserir lote: ${insertError.message}`);
      }

      // 3. Verificar créditos após inserção
      const { data: lotesDepois, error: lotesDepoisError } = await supabase
        .from('lotes_creditos')
        .select('quantidade_adicionada, quantidade_usada')
        .eq('user_id', user.id)
        .eq('status', 'ativo')
        .or(`data_validade.is.null,data_validade.gt.${currentDate}`);

      const creditosDepois = lotesDepois?.reduce((sum, lote) => 
        sum + (lote.quantidade_adicionada - (lote.quantidade_usada || 0)), 0) || 0;

      setResultado({
        beforeCredits: creditosAtuais,
        addedCredits: creditosParaAdicionar,
        afterCredits: creditosDepois,
        verification: creditosDepois === creditosAtuais + creditosParaAdicionar ? 'SUCESSO' : 'FALHA'
      });

      toast.success('Créditos adicionados via lotes_creditos!', {
        description: `${creditosParaAdicionar} créditos adicionados`
      });

    } catch (error: any) {
      toast.error('Erro no teste via lotes', { description: error.message });
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Teste de Adição de Créditos</CardTitle>
          <CardDescription>
            Teste direto para adicionar créditos sem passar pelo fluxo de pagamento.
            Use para debuggar problemas na atualização de créditos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <div className="p-4 bg-muted rounded-lg">
              <p><strong>Usuário:</strong> {user.email}</p>
              <p><strong>ID:</strong> {user.id}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="creditos">Créditos para Adicionar</Label>
            <Input
              id="creditos"
              type="number"
              value={creditosParaAdicionar}
              onChange={(e) => setCreditosParaAdicionar(parseInt(e.target.value) || 0)}
              placeholder="Ex: 10"
            />
          </div>

          <div className="grid gap-2">
            <Button 
              onClick={handleTesteCreditos}
              disabled={isLoading || !user?.id}
              variant="outline"
            >
              {isLoading ? 'Testando...' : 'Teste Antigo (profiles.credits)'}
            </Button>

            <Button 
              onClick={adicionarCreditosViaLotes}
              disabled={isLoading || !user?.id}
              className="w-full"
            >
              {isLoading ? 'Testando...' : 'Teste Novo (lotes_creditos)'}
            </Button>
          </div>

          {resultado && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950 dark:border-green-800">
              <h3 className="font-semibold mb-2">✅ Resultado do Teste:</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Créditos Antes:</strong> {resultado.beforeCredits}</p>
                <p><strong>Créditos Adicionados:</strong> {resultado.addedCredits}</p>
                <p><strong>Créditos Depois:</strong> {resultado.afterCredits}</p>
                <p><strong>Verificação:</strong> {resultado.verification}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                ⚠️ Após o teste, recarregue a página para ver os créditos atualizados na interface.
              </p>
            </div>
          )}

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950 dark:border-yellow-800">
            <h4 className="font-semibold mb-2">📋 Como usar:</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Digite quantos créditos quer adicionar</li>
              <li>Clique "Teste Novo (lotes_creditos)"</li>
              <li>Verifique o resultado</li>
              <li>Recarregue a página principal para ver na interface</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 mb-6 mt-6">
        <Button 
          onClick={testarTabelaLotes}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? 'Testando...' : 'Testar Tabela lotes_creditos'}
        </Button>
        
        <Button 
          onClick={testarUsuarioEspecifico}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? 'Testando...' : 'Testar Usuário Específico'}
        </Button>

        <Button 
          onClick={migrarCreditosParaLotes}
          disabled={isLoading}
          variant="destructive"
        >
          {isLoading ? 'Migrando...' : '🔄 Migrar profiles.credits → lotes_creditos'}
        </Button>
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado do Teste</CardTitle>
            <CardDescription>Informações detalhadas sobre a tabela lotes_creditos</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 