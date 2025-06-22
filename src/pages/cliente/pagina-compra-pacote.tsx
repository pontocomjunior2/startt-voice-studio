import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFetchPublicPacote } from '@/hooks/queries/use-fetch-public-pacote.hook';
import { useFetchLocutoresForPacote } from '@/hooks/queries/use-fetch-locutores-for-pacote.hook';
import { usePurchasePacote } from '@/hooks/mutations/use-purchase-pacote.mutation.hook';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

function PaginaCompraPacote() {
  const { pacoteId } = useParams<{ pacoteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { mutate: purchasePacote, isPending: isPurchasing } = usePurchasePacote();

  const { data: pacote, isLoading: isLoadingPacote, isError: isErrorPacote, error: errorPacote } = useFetchPublicPacote(pacoteId!);
  const { data: locutores, isLoading: isLoadingLocutores } = useFetchLocutoresForPacote(pacoteId!);

  const handlePurchase = () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    const isProfileComplete = profile?.full_name && (profile?.cpf || profile?.cnpj);
    if (!isProfileComplete) {
      toast.info("Complete seu perfil", {
        description: "Você precisa preencher seu nome completo e CPF/CNPJ antes de comprar.",
      });
      navigate('/meu-perfil', { state: { from: location.pathname } });
      return;
    }
    
    purchasePacote(pacoteId!, {
      onSuccess: () => {
        navigate('/dashboard');
      }
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoadingPacote) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-amber-500" />
      </div>
    );
  }

  if (isErrorPacote) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Erro</h2>
          <p className="text-muted-foreground">{errorPacote?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="container mx-auto max-w-2xl px-4">
        <Card className="shadow-lg">
          <CardHeader>
            <Badge variant="secondary" className="w-fit mb-2">Pacote Exclusivo</Badge>
            <CardTitle className="text-3xl font-bold">{pacote?.nome}</CardTitle>
            <CardDescription>{pacote?.descricao}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-baseline p-6 bg-slate-100 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Você recebe</p>
                <p className="text-2xl font-bold text-amber-600">{pacote?.creditos_oferecidos} créditos</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Pelo valor de</p>
                <p className="text-2xl font-bold">{formatCurrency(pacote?.valor || 0)}</p>
              </div>
            </div>
            
            {locutores && locutores.length > 0 && (
              <div>
                <Separator className="my-4" />
                <h3 className="text-lg font-semibold mb-3">Locutores Incluídos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {isLoadingLocutores ? <p>Carregando...</p> : locutores.map(locutor => (
                    <div key={locutor.id} className="flex items-center space-x-3">
                       <Avatar>
                        <AvatarImage src={locutor.avatar_url || undefined} alt={locutor.nome} />
                        <AvatarFallback>{locutor.nome.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{locutor.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90 text-lg"
              onClick={handlePurchase}
              disabled={isPurchasing || isLoadingPacote}
            >
              {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {user ? 'Comprar Agora' : 'Fazer Login para Comprar'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default PaginaCompraPacote; 