import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function TesteCreditosPage() {
  const { user } = useAuth();
  const [creditosParaAdicionar, setCreditosParaAdicionar] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

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

          <Button 
            onClick={handleTesteCreditos}
            disabled={isLoading || !user?.id}
            className="w-full"
          >
            {isLoading ? 'Testando...' : 'Executar Teste de Créditos'}
          </Button>

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
              <li>Clique "Executar Teste"</li>
              <li>Verifique o resultado</li>
              <li>Recarregue a página principal para ver na interface</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 