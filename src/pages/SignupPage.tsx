import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Importar Link e useNavigate
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner"; // Importar toast de sonner

// Adicionar componente Alert se não foi adicionado antes
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertCircle } from "lucide-react";

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState<string | null>(null); // Erro específico do formulário (ex: senhas)
  const { signUp, isProcessing, error: authError } = useAuth();
  const navigate = useNavigate();
  // const { toast } = useToast(); // Remover useToast antigo

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null); // Limpar erro do formulário

    if (password !== confirmPassword) {
      setFormError('As senhas não coincidem.');
      // Usar toast do sonner para o erro de formulário também, se preferir
      // toast.error('As senhas não coincidem.'); 
      return;
    }
    
    // isProcessing será true durante a chamada a signUp
    const { error } = await signUp({ 
      email, 
      password, 
      options: { 
        data: { 
          username, 
          full_name: fullName 
        } 
      }
    });

    if (error) {
      toast.error(error.message || 'Ocorreu um erro inesperado no cadastro.', {
        // description: "Mais detalhes aqui, se necessário", // Opcional
        // action: { label: "Tentar Novamente", onClick: () => console.log('Tentar novamente') } // Opcional
      });
    } else {
      toast.success("Cadastro Realizado!", {
        description: "Verifique seu e-mail para confirmar a conta.",
      });
      // Opcional: Limpar formulário ou redirecionar
      // setEmail(''); setPassword(''); setConfirmPassword(''); setUsername(''); setFullName('');
      // navigate('/login'); 
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md"> {/* Aumentar um pouco a largura */}
        <form onSubmit={handleSignup}>
          <CardHeader>
            <CardTitle className="text-2xl">Criar Conta</CardTitle>
            <CardDescription>
              Preencha os campos abaixo para criar sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {/* Exibe erro específico do formulário (senhas não coincidem) */}
            {formError && (
              <p className="text-sm font-medium text-destructive">{formError}</p>
            )}
            {/* Erro vindo do AuthContext (ex: usuário já existe) - O toast já exibe */}
            {/* {authError && !formError && (
              <p className="text-sm font-medium text-destructive">{authError.message}</p>
            )} */}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> { /* Layout em 2 colunas para nome/username */}
              <div className="grid gap-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input 
                  id="fullName"
                  placeholder="Seu Nome Completo"
                  required 
                  value={fullName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                  disabled={isProcessing} // Usar isProcessing
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Nome de Usuário</Label>
                <Input 
                  id="username"
                  placeholder="seu_usuario"
                  required 
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  disabled={isProcessing} // Usar isProcessing
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                required 
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                disabled={isProcessing} // Usar isProcessing
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                disabled={isProcessing} // Usar isProcessing
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input 
                id="confirmPassword"
                type="password" 
                required 
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                disabled={isProcessing} // Usar isProcessing
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4"> { /* Flex col para botão e link */}
            <Button type="submit" className="w-full" disabled={isProcessing}> { /* Usar isProcessing */}
              {isProcessing ? 'Criando conta...' : 'Criar Conta'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta? {' '}
              <Link to="/login" className="underline underline-offset-4 hover:text-primary">
                Faça login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default SignupPage; 