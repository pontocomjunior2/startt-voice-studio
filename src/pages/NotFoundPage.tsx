import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

function NotFoundPage() {
  const navigate = useNavigate();

  // Tenta determinar um destino de "Voltar" mais relevante
  const handleGoBack = () => {
    // Se houver histórico de navegação na sessão, volta uma página
    if (window.history.length > 2) { // Maior que 2 para não voltar para uma página de erro anterior se houver múltiplas
      navigate(-1);
    } else {
      // Caso contrário, vai para o dashboard (ou login se não houver dashboard acessível)
      // Esta lógica pode ser aprimorada se você tiver um contexto de autenticação aqui
      // para decidir entre /dashboard ou /login.
      // Por simplicidade, vamos assumir que /dashboard é um bom padrão.
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-6">
      <div className="max-w-md">
        <h1 className="text-9xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-3xl font-semibold text-foreground">Página Não Encontrada</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Oops! Parece que a página que você está procurando não existe ou foi movida.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button onClick={handleGoBack} variant="outline">
            Voltar
          </Button>
          <Button asChild>
            <Link to="/dashboard">
              <Home className="mr-2 h-4 w-4" /> Ir para o Início
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage; 