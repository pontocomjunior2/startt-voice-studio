import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, PartyPopper } from 'lucide-react';

const PedidoSucessoPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { mensagem, pedidoId } = location.state as { mensagem?: string; pedidoId?: string } || {};

  const mensagemExibida = mensagem || "Seu pedido foi processado com sucesso!"; // Fallback

  // Opcional: Redirecionar automaticamente após X segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/meus-audios');
    }, 7000); // 7 segundos

    return () => clearTimeout(timer); // Limpa o timer se o componente for desmontado
  }, [navigate]);

  return (
    <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
      <Card className="w-full max-w-lg shadow-xl border-green-500/30">
        <CardHeader className="items-center">
          <PartyPopper className="h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-3xl font-bold text-green-600">Pedido Enviado!</CardTitle>
          {pedidoId && (
            <CardDescription className="text-lg text-muted-foreground">
              Referência do Pedido: <span className="font-semibold text-primary">{pedidoId}</span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-xl text-foreground leading-relaxed">
            {mensagemExibida}
          </p>
          <Button 
            onClick={() => navigate('/meus-audios')} 
            size="lg" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-base"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Ver Meus Pedidos
          </Button>
          <p className="text-sm text-muted-foreground">
            Você será redirecionado automaticamente em alguns segundos...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PedidoSucessoPage; 