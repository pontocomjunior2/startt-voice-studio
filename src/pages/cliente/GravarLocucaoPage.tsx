import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Ajustar caminho se necessário
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from '../../lib/supabaseClient'; // Ajustar caminho se necessário
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { estimateCreditsFromText } from '../../utils/creditUtils'; // Ajustar caminho se necessário
import { cn } from '@/lib/utils';
import { PlayCircle, Send } from 'lucide-react'; // Adicionado Send para o botão
import { Separator } from "@/components/ui/separator"; // Adicionar importação do Separator

// Definir um tipo para Locutor (copiado da DashboardPage)
interface Locutor {
  id: string;
  nome: string;
  descricao: string | null;
  avatar_url: string | null;
  amostra_audio_url: string | null;
  ativo: boolean;
  created_at: string;
}

function GravarLocucaoPage() {
  const { user, profile, refreshProfile } = useAuth(); // Apenas o necessário do AuthContext

  // Estados para locutores
  const [locutores, setLocutores] = useState<Locutor[]>([]);
  const [loadingLocutores, setLoadingLocutores] = useState(true);
  
  // Estados para o formulário de pedido
  const [selectedLocutorId, setSelectedLocutorId] = useState<string | null>(null);
  const [scriptText, setScriptText] = useState('');
  const [estimatedCredits, setEstimatedCredits] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calcular créditos em tempo real (copiado da DashboardPage)
  useEffect(() => {
    const credits = estimateCreditsFromText(scriptText);
    setEstimatedCredits(credits);
  }, [scriptText]);

  // Buscar locutores (copiado da DashboardPage)
  useEffect(() => {
    const fetchLocutores = async () => {
      setLoadingLocutores(true);
      try {
        const { data, error } = await supabase
          .from('locutores')
          .select('*')
          .eq('ativo', true)
          .order('nome');

        if (error) {
          throw error;
        }
        setLocutores(data || []);
      } catch (error) {
        console.error('Erro ao buscar locutores:', error);
        toast.error("Erro ao Carregar Locutores", {
          description: "Não foi possível buscar a lista de locutores. Tente recarregar a página.",
        });
      } finally {
        setLoadingLocutores(false);
      }
    };

    if (user) {
      fetchLocutores();
    } else {
      setLoadingLocutores(false);
    }
  }, [user]);

  // Funções handler (copiadas e adaptadas da DashboardPage)
  const handlePlaySample = (audioUrl: string | null) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(e => console.error("Erro ao tocar áudio:", e));
      toast.info("Tocando amostra de áudio...");
    } else {
      toast.error("Amostra de áudio não disponível.");
    }
  };
  
  const handleActualSelectLocutor = (locutorId: string) => {
    setSelectedLocutorId(locutorId);
    const selectedLocutor = locutores.find(l => l.id === locutorId);
    if (selectedLocutor) {
      toast.success(`Locutor ${selectedLocutor.nome.split(' ')[0]} selecionado!`, {
        description: "Agora você pode inserir o texto para gravação.",
      });
    }
  };

  const handleSubmitPedido = async () => {
    if (!user || !profile) {
      toast.error("Erro de Autenticação", { description: "Usuário não autenticado. Faça login novamente." });
      return;
    }
    if (!selectedLocutorId) {
      toast.error("Erro de Validação", { description: "Por favor, selecione um locutor." });
      return;
    }
    if (scriptText.trim().length === 0) {
      toast.error("Erro de Validação", { description: "O texto do roteiro não pode estar vazio." });
      return;
    }
    if (userCredits < estimatedCredits) {
      toast.error("Créditos Insuficientes", { 
        description: `Você precisa de ${estimatedCredits} créditos, mas possui apenas ${userCredits}.` 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: pedidoData, error: pedidoError } = await supabase.rpc('criar_pedido', {
        p_user_id: user.id,
        p_locutor_id: selectedLocutorId,
        p_texto_roteiro: scriptText,
        p_creditos_estimados: estimatedCredits,
      });

      if (pedidoError) {
        console.error("Erro RPC criar_pedido:", pedidoError);
        // Tentar ser mais específico com o erro, se possível
        if (pedidoError.message.includes("saldo insuficiente")) {
           toast.error("Erro ao Criar Pedido", { description: "Créditos insuficientes. Verifique seu saldo." });
        } else if (pedidoError.message.includes("locutor inválido")) {
           toast.error("Erro ao Criar Pedido", { description: "Locutor selecionado não é válido ou está inativo." });
        } else {
           toast.error("Erro ao Criar Pedido", { description: pedidoError.message || "Não foi possível enviar seu pedido." });
        }
        return; // Importante: sair da função aqui
      }

      // Se a RPC foi bem sucedida (sem erro explícito, mas checando o retorno)
      // A RPC criar_pedido agora retorna um booleano ou um objeto com o ID do pedido.
      // Vamos assumir que se não houve erro, o pedido foi criado.
      // O ideal seria a RPC retornar o ID do pedido criado para confirmação.

      toast.success("Pedido Enviado com Sucesso!", {
        description: "Seu pedido de locução foi enviado e seus créditos foram debitados.",
      });

      setScriptText(''); // Limpar campo de texto
      setSelectedLocutorId(null); // Desselecionar locutor
      // Atualizar o perfil para refletir os novos créditos
      if (refreshProfile) {
        await refreshProfile();
      }
      // Opcional: redirecionar para Meus Áudios ou Dashboard
      // navigate('/meus-audios'); 
      
    } catch (error: any) { // Captura genérica para erros inesperados
      console.error('Erro inesperado em handleSubmitPedido:', error);
      toast.error("Erro Inesperado", { description: "Ocorreu um erro inesperado ao processar seu pedido." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Adaptação da constante userCredits para o contexto da página
  const userCredits = profile?.credits ?? 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Gravar Nova Locução</h1>
        <p className="text-muted-foreground">Escolha seu locutor preferido, escreva seu roteiro e envie para gravação.</p>
      </div>

      {/* Seção de Escolha de Locutor */}
      <section id="escolher-locutor">
        <h2 className="text-2xl font-semibold text-foreground mb-6">1. Escolha seu Locutor</h2>
        {loadingLocutores ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="shadow-lg animate-pulse">
                <CardHeader className="flex flex-row items-center gap-4 p-4">
                  <Avatar className="h-20 w-20">
                    <div className="h-full w-full bg-gray-300 rounded-full"></div>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                  <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                </CardContent>
                <CardFooter className="p-4 flex flex-col sm:flex-row gap-2">
                  <div className="h-10 bg-gray-300 rounded w-full sm:w-1/2"></div>
                  <div className="h-10 bg-gray-300 rounded w-full sm:w-1/2"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : locutores.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Nenhum locutor disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {locutores.map((locutor) => (
              <Card 
                key={locutor.id} 
                className={cn(
                  "shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col",
                  selectedLocutorId === locutor.id && "ring-2 ring-primary border-primary"
                )}
              >
                <CardHeader className="flex flex-col sm:flex-row items-center gap-4 p-4">
                  <Avatar className="h-20 w-20 border-2 border-primary/20">
                    <AvatarImage src={locutor.avatar_url || undefined} alt={locutor.nome} />
                    <AvatarFallback>{locutor.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center sm:text-left">
                    <CardTitle className="text-lg font-semibold text-foreground">{locutor.nome}</CardTitle>
                    {locutor.descricao && <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-2">{locutor.descricao}</CardDescription>}
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                  {locutor.amostra_audio_url && (
                    <div className="mb-4">
                      <audio controls className="w-full h-10" src={locutor.amostra_audio_url}>
                        Seu navegador não suporta o elemento de áudio.
                      </audio>
                    </div>
                  )}
                  {!locutor.amostra_audio_url && (
                     <p className="text-sm text-muted-foreground text-center py-2">Amostra de áudio indisponível.</p>
                  )}
                </CardContent>
                <CardFooter className="p-4 border-t">
                  <Button 
                    onClick={() => handleActualSelectLocutor(locutor.id)} 
                    variant={selectedLocutorId === locutor.id ? "default" : "outline"}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={selectedLocutorId === locutor.id}
                  >
                    {selectedLocutorId === locutor.id ? "Selecionado" : "Selecionar Locutor"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Seção de Roteiro e Envio */}
      {selectedLocutorId && (
        <section id="roteiro-envio" className="mt-8">
          <h2 className="text-2xl font-semibold text-foreground mb-6">2. Escreva seu Roteiro</h2>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Seu Pedido</CardTitle>
              <CardDescription>
                Locutor selecionado: {locutores.find(l => l.id === selectedLocutorId)?.nome || 'N/A'}.
                Você possui <span className="font-semibold text-primary">{userCredits}</span> créditos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="script-text" className="text-sm font-medium">Texto do Roteiro:</Label>
                <Textarea
                  id="script-text"
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Digite ou cole aqui o texto para a locução..."
                  rows={8}
                  className="mt-1 focus:ring-primary focus:border-primary"
                  maxLength={10000} // Limite de caracteres para evitar sobrecarga
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {scriptText.length} caracteres. Limite: 10000.
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-foreground">
                  Créditos Estimados: <span className="text-primary">{estimatedCredits}</span>
                </p>
                {estimatedCredits > userCredits && (
                  <p className="text-sm text-red-500">
                    Você não possui créditos suficientes para este pedido.
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSubmitPedido} 
                disabled={isSubmitting || estimatedCredits === 0 || estimatedCredits > userCredits || scriptText.trim().length === 0}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                {isSubmitting ? (
                  <><Send className="mr-2 h-4 w-4 animate-pulse" /> Enviando Pedido...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Enviar Pedido ({estimatedCredits} créditos)</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </section>
      )}
       {!selectedLocutorId && locutores.length > 0 && !loadingLocutores && (
        <div className="text-center py-10 text-muted-foreground">
          <p>Selecione um locutor acima para prosseguir com o seu pedido.</p>
        </div>
      )}
    </div>
  );
}

export default GravarLocucaoPage; 