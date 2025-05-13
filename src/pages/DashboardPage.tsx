import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from '../lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { estimateCreditsFromText } from '../utils/creditUtils';
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import { CreditCard, PlayCircle } from 'lucide-react';

// Definir um tipo para Locutor (opcional, mas recomendado)
interface Locutor {
  id: string;
  nome: string;
  descricao: string | null;
  avatar_url: string | null;
  amostra_audio_url: string | null;
  ativo: boolean;
  created_at: string;
}

// <-- Definir tipo para Pedido -->
interface Pedido {
  id: string;
  created_at: string;
  texto_roteiro: string;
  creditos_debitados: number;
  status: 'pendente' | 'gravando' | 'concluido' | 'cancelado';
  audio_final_url: string | null;
  downloaded_at: string | null;
  locutores: { nome: string } | null; // <-- CORRIGIDO: objeto simples ou null
}

function DashboardPage() {
  const { signOut, user, profile, isLoading, isFetchingProfile, refreshProfile } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Estados para locutores
  const [locutores, setLocutores] = useState<Locutor[]>([]);
  const [loadingLocutores, setLoadingLocutores] = useState(true);
  // Novos estados
  const [selectedLocutorId, setSelectedLocutorId] = useState<string | null>(null);
  const [scriptText, setScriptText] = useState('');
  const [estimatedCredits, setEstimatedCredits] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // <-- Novos estados para pedidos -->
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  // Calcular créditos em tempo real
  useEffect(() => {
    const credits = estimateCreditsFromText(scriptText);
    console.log("Texto alterado:", scriptText, "Créditos calculados:", credits);
    setEstimatedCredits(credits);
  }, [scriptText]);

  // Buscar locutores
  useEffect(() => {
    const fetchLocutores = async () => {
      setLoadingLocutores(true);
      try {
        const { data, error } = await supabase
          .from('locutores')
          .select('*')
          .eq('ativo', true)
          .order('nome'); // Ordenar por nome, por exemplo

        if (error) {
          throw error;
        }
        setLocutores(data || []);
        console.log('Locutores carregados:', data);
      } catch (error) {
        console.error('Erro ao buscar locutores:', error);
        toast.error("Erro ao Carregar Locutores", {
          description: "Não foi possível buscar a lista de locutores. Tente recarregar a página.",
        });
      } finally {
        setLoadingLocutores(false);
      }
    };

    if (user) { // Só busca locutores se o usuário estiver autenticado
      fetchLocutores();
    } else {
      setLoadingLocutores(false); // Se não há usuário, não há o que carregar
    }
  }, [user]); // Adicionar user como dependência para re-buscar se o usuário mudar (ex: após login)

  // <-- Função para buscar pedidos -->
  const fetchPedidos = async () => {
    if (!profile?.id) return; // Não buscar se não tiver ID do perfil

    console.log("DashboardPage: Iniciando busca de pedidos para user:", profile.id);
    setLoadingPedidos(true);
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          created_at,
          texto_roteiro,
          creditos_debitados,
          status,
          audio_final_url,
          downloaded_at,
          locutores ( nome ) 
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro detalhado ao buscar pedidos:', error);
        throw error; // Re-lança para o catch abaixo
      }
      console.log('Dados brutos dos pedidos recebidos do Supabase:', data); // <-- Logar dados brutos
      
      // <-- Mapear dados para garantir a estrutura correta -->
      const mappedPedidos: Pedido[] = (data || []).map((pedido: any) => ({
        ...pedido,
        locutores: Array.isArray(pedido.locutores) 
                      ? pedido.locutores[0] // Pega o primeiro se for array (fallback)
                      : pedido.locutores, // Mantém se já for objeto
      }));
      
      setPedidos(mappedPedidos);
      console.log('Pedidos carregados:', mappedPedidos); // <-- Logar dados mapeados
    } catch (err: any) {
      console.error('Erro no bloco try/catch ao buscar pedidos:', err);
      toast.error("Erro ao Carregar Histórico", { description: err.message || "Não foi possível carregar seus pedidos." });
    } finally {
      setLoadingPedidos(false);
    }
  };

  // <-- useEffect para buscar pedidos na montagem/mudança de perfil -->
  useEffect(() => {
    if (profile?.id) {
      fetchPedidos();
    }
    // Dependência: profile?.id - busca quando o ID do perfil estiver disponível/mudar
  }, [profile?.id]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      console.log("Logout solicitado...");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao Sair", {
        description: "Não foi possível completar o logout. Tente novamente.",
      });
      setIsLoggingOut(false);
    }
  };

  if (isLoading || isFetchingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Carregando dados do painel...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Redirecionando para o login...</div>
      </div>
    ); // ProtectedRoute deve cuidar disso, mas é um fallback visual
  }

  const displayName = profile?.full_name || profile?.username || user.email;
  const userEmail = user.email;
  const userCredits = profile?.credits ?? 0;

  const handlePlaySample = (url: string | null) => {
    if (!url) return;
    console.log("Tocar amostra:", url);
    toast.info("Amostra de Áudio", { description: `URL: ${url} (funcionalidade de player a ser implementada)` });
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

  // Nova função para submeter o pedido
  const handleSubmitPedido = async () => {
    if (!selectedLocutorId) {
      toast.error("Erro de Validação", { description: "Por favor, selecione um locutor." });
      return;
    }
    if (scriptText.trim().length === 0) {
      toast.error("Erro de Validação", { description: "O texto do roteiro não pode estar vazio." });
      return;
    }
    if (estimatedCredits <= 0) {
      toast.error("Erro de Validação", { description: "Os créditos estimados devem ser maiores que zero." });
      return;
    }
    if (userCredits < estimatedCredits) {
      toast.error("Créditos Insuficientes", { description: `Você precisa de ${estimatedCredits} créditos, mas possui ${userCredits}.` });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Enviando pedido para RPC:', {
        p_locutor_id: selectedLocutorId,
        p_texto_roteiro: scriptText,
        p_creditos_a_debitar: estimatedCredits
      });

      const { data: rpcResult, error: rpcError } = await supabase.rpc('criar_pedido', {
        p_locutor_id: selectedLocutorId,
        p_texto_roteiro: scriptText,
        p_creditos_a_debitar: estimatedCredits
      });

      if (rpcError) {
        console.error("Erro ao chamar RPC criar_pedido:", rpcError);
        toast.error("Erro ao Enviar Pedido", { description: rpcError.message || "Ocorreu um problema no servidor. Tente novamente." });
      } else if (rpcResult && rpcResult.status === 'error') {
        console.error("Erro retornado pela RPC criar_pedido:", rpcResult.message);
        toast.error("Erro ao Criar Pedido", { description: rpcResult.message || "Não foi possível processar seu pedido." });
      } else if (rpcResult && rpcResult.status === 'success') {
        toast.success("Pedido Enviado com Sucesso!", {
          description: `Seu pedido ID ${rpcResult.pedido_id} foi registrado. Você será notificado quando o áudio estiver pronto.`,
        });
        setScriptText('');
        setSelectedLocutorId(null);
        // setEstimatedCredits(0); // Já será recalculado pelo useEffect em scriptText
        if (refreshProfile) {
          await refreshProfile(); // Atualiza créditos
          await fetchPedidos(); // <-- Atualiza a lista de pedidos após sucesso
        }
      } else {
        console.error("Resposta inesperada da RPC criar_pedido:", rpcResult);
        toast.error("Erro Desconhecido", { description: "Ocorreu um erro inesperado ao processar seu pedido." });
      }
    } catch (error: any) {
      console.error("Erro catastrófico em handleSubmitPedido:", error);
      toast.error("Erro Crítico", { description: error.message || "Ocorreu um erro crítico. Por favor, contate o suporte." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // <-- Nova função para baixar e registrar -->
  const handleDownload = async (pedido: Pedido) => { 
    if (!pedido.audio_final_url) {
      toast.error("Erro", { description: "URL do áudio não encontrada." });
      return;
    }

    console.log(`Tentando baixar diretamente para pedido: ${pedido.id}, URL: ${pedido.audio_final_url}`);
    toast.info("Iniciando Download", { description: "Seu download começará em breve..." });

    try {
      // 1. Criar link e clicar para iniciar download (pode abrir em nova aba)
      const link = document.createElement('a');
      link.href = pedido.audio_final_url;
      // O atributo download pode não funcionar devido a CORS/config do servidor externo,
      // mas não custa tentar.
      const filename = `gravacao_${pedido.id}_${pedido.locutores?.nome?.split(' ')[0] ?? 'locutor'}.mp3`;
      link.setAttribute('download', filename);
      // Abrir em nova aba pode ser uma alternativa se o download direto falhar, mas tentaremos clicar direto primeiro
      // link.target = "_blank"; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Registrar o download (com ressalvas sobre a garantia)
      // Atraso leve para dar tempo ao navegador de processar o clique.
      await new Promise(resolve => setTimeout(resolve, 1000)); 

      const { data: success, error: rpcError } = await supabase.rpc('registrar_download', {
        p_pedido_id: pedido.id
      });

      if (rpcError || !success) {
        console.error("Falha ao registrar download no servidor (após clique direto):", rpcError?.message || 'RPC retornou false');
        // Não mostramos erro crítico, pois o download pode ter iniciado
        toast.warning("Registro Falhou", { description: "O download pode ter iniciado, mas não conseguimos registrar a ação no servidor." }); 
      } else {
        console.log(`Registro de download (tentativa) bem-sucedido para pedido: ${pedido.id}`);
        // Mantemos o toast de sucesso, assumindo que o clique funcionou
        toast.success("Download Iniciado", { description: "O download do áudio foi iniciado e registrado." }); 
      }

      // 3. Atualizar a interface
      fetchPedidos(); 

    } catch (error: any) {
      console.error("Erro ao tentar baixar diretamente ou registrar:", error);
      toast.error("Erro no Download", { description: error.message || "Não foi possível iniciar o download." });
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
      <Card id="meu-perfil">
        <CardHeader>
          <CardTitle id="meu-perfil-heading">Meu Perfil</CardTitle>
          <CardDescription>Informações da sua conta e seus créditos para gravação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Nome Completo:</p>
                <p className="text-lg">{profile?.full_name || user?.user_metadata?.full_name || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Email (Login):</p>
                <p className="text-lg">{user?.email || profile?.username || 'N/A'}</p>
              </div>
            </div>
            
            {/* Card de Créditos Reestilizado */}
            <Card className="bg-card shadow-none border border-border/50 rounded-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Meus Créditos
                </CardTitle>
                <div className={`p-1.5 rounded-full bg-[hsl(var(--status-green))]/10`}>
                  <CreditCard className="h-5 w-5 text-status-green" />
                </div>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-2xl font-bold text-foreground">
                  {typeof profile?.credits === 'number' ? profile.credits : <span className="text-muted-foreground">...</span>}
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Disponíveis para gravação
                </p>
                {/* <Button size="sm" variant="outline" className="mt-3 w-full">Comprar Mais Créditos</Button> */}
              </CardContent>
            </Card>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
           <Button onClick={handleLogout} variant="outline" disabled={isLoggingOut}>
             {isLoggingOut ? 'Saindo...' : 'Sair'}
           </Button>
        </CardFooter>
      </Card>

      <Separator className="my-6" />

      <section id="novo-pedido">
        <h2 className="text-xl font-semibold mb-4">1. Escolha seu Locutor</h2>
        {loadingLocutores ? (
          <div className="text-center py-8">
            <p>Carregando locutores...</p>
            {/* Você pode adicionar um componente Spinner aqui do shadcn/ui se desejar */}
          </div>
        ) : locutores.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {locutores.map((locutor) => (
              <Card 
                key={locutor.id} 
                className={cn(
                  "flex flex-col overflow-hidden transition-all duration-150 ease-in-out rounded-lg",
                  "hover:shadow-xl",
                  selectedLocutorId === locutor.id ? "ring-2 ring-primary shadow-xl" : "shadow-md"
                )}
                onClick={() => handleActualSelectLocutor(locutor.id)}
              >
                <CardHeader className="flex flex-col items-center p-4 text-center space-y-2 bg-card">
                  <Avatar className="h-20 w-20 border-2 border-primary/20">
                    <AvatarImage src={locutor.avatar_url || undefined} alt={locutor.nome} />
                    <AvatarFallback className="text-2xl">{locutor.nome.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-foreground">{locutor.nome}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-grow space-y-3 bg-background/30">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {locutor.descricao || "Locutor profissional com voz versátil."}
                  </p>
                  {locutor.amostra_audio_url && (
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="w-full text-sm hover:bg-muted/80"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handlePlaySample(locutor.amostra_audio_url);
                      }}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Ouvir Demonstração
                    </Button>
                  )}
                </CardContent>
                <CardFooter className="p-4 bg-card border-t">
                   <Button 
                     className="w-full font-semibold"
                     variant={selectedLocutorId === locutor.id ? "default" : "outline"}
                     onClick={(e: React.MouseEvent) => {
                       e.stopPropagation();
                       handleActualSelectLocutor(locutor.id);
                     }}
                   >
                     {selectedLocutorId === locutor.id ? 'Selecionado' : `Selecionar ${locutor.nome.split(' ')[0]}`}
                   </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p>Nenhum locutor disponível no momento.</p>
          </div>
        )}
      </section>

      {selectedLocutorId && (
        <section>
          <h2 className="text-xl font-semibold mb-4">2. Insira o Texto do seu Áudio</h2>
          <Card>
            <CardHeader>
              <CardTitle>Roteiro para Gravação</CardTitle>
              <CardDescription>
                Digite ou cole o texto que o locutor {locutores.find(l => l.id === selectedLocutorId)?.nome.split(' ')[0]} irá gravar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="script-text">Seu Roteiro:</Label>
                <Textarea
                  placeholder="Comece a digitar seu roteiro aqui..."
                  id="script-text"
                  value={scriptText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScriptText(e.target.value)}
                  rows={8}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Palavras: {scriptText.trim().split(/\s+/).filter(Boolean).length}</p>
                <p>Créditos estimados para este texto: <Badge variant={estimatedCredits > userCredits ? "destructive" : "secondary"}>{estimatedCredits}</Badge></p>
                {estimatedCredits > userCredits && (
                  <p className="text-red-600 text-xs mt-1">Você não possui créditos suficientes para este roteiro.</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={handleSubmitPedido}
                disabled={!selectedLocutorId || scriptText.trim().length === 0 || estimatedCredits === 0 || userCredits < estimatedCredits || isSubmitting}
              >
                {isSubmitting ? "Enviando..." : "Enviar Pedido"}
              </Button>
            </CardFooter>
          </Card>
        </section>
      )}

      <Separator className="my-6" />

      <section id="meus-audios">
        <h2 className="text-xl font-semibold mb-3">3. Meus Áudios Gravados</h2>
        <Card> 
          <CardHeader>
            <CardTitle>Histórico de Pedidos</CardTitle>
            <CardDescription>Veja o status e baixe seus áudios concluídos.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPedidos ? (
              <div className="text-center p-4">Carregando histórico...</div>
            ) : (
              <div className="overflow-x-auto relative border border-border rounded-md">
                <Table>
                  <TableCaption className="py-3">Seu histórico de gravações.</TableCaption>
                  <TableHeader className="bg-muted/50"><TableRow>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Locutor</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Créditos</TableHead>
                      <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Download</TableHead>
                    </TableRow></TableHeader>
                  <TableBody className="bg-card divide-y divide-border">
                    {pedidos.length === 0 ? (
                      <TableRow className="hover:bg-muted/50 odd:bg-muted/20">
                        <TableCell colSpan={5} className="h-24 text-center px-4 py-4">
                          Nenhum pedido encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pedidos.map((pedido) => {
                        console.log(`Pedido ID: ${pedido.id}, Status: ${pedido.status}, URL: ${pedido.audio_final_url}`); 
                        return (
                          <TableRow key={pedido.id} className="hover:bg-muted/50 odd:bg-muted/20">
                            <TableCell className="font-medium px-4 py-3 whitespace-nowrap">
                              {`${new Date(pedido.created_at).toLocaleDateString('pt-BR')} ${new Date(pedido.created_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute:'2-digit' })}`}
                            </TableCell>
                            <TableCell className="px-4 py-3 whitespace-nowrap">
                              {pedido.locutores?.nome ?? 'N/A'} 
                            </TableCell>
                            <TableCell className="px-4 py-3 whitespace-nowrap">
                              <Badge 
                                variant={pedido.status === 'concluido' ? 'default' : pedido.status === 'cancelado' ? 'destructive' : 'secondary'}
                                className={cn(
                                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                                  pedido.status === 'concluido' && "bg-status-green text-white",
                                  pedido.status === 'pendente' && "bg-status-orange text-white",
                                  pedido.status === 'gravando' && "bg-status-blue text-white",
                                  pedido.status === 'cancelado' && "bg-status-red text-white",
                                )}
                              >
                                {pedido.status.charAt(0).toUpperCase() + pedido.status.slice(1)} 
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right px-4 py-3 whitespace-nowrap">{pedido.creditos_debitados}</TableCell>
                            <TableCell className="text-center px-4 py-3 whitespace-nowrap">
                              {pedido.status === 'concluido' && pedido.audio_final_url ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDownload(pedido)} 
                                  disabled={!!pedido.downloaded_at} 
                                >
                                  {pedido.downloaded_at ? "Baixado ✓" : "Baixar Áudio"} 
                                </Button>
                              ) : (
                                <span>-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">4. Minha Conta</h2>
        <div className="p-4 border rounded-md">
          <p>Informações da conta, histórico de créditos/pagamentos, etc.</p>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage; 