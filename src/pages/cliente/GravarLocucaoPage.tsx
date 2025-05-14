import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { estimateCreditsFromText } from '@/utils/creditUtils';
import { cn } from '@/lib/utils';
import { PlayCircle, Send, Loader2, UserCircle, Users } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  VELOCIDADE_LOCUCAO,
  type VelocidadeLocucaoTipo,
  calcularTempoEstimadoSegundos,
  formatarSegundosParaMMSS,
} from "@/utils/locutionTimeUtils";
import { type Locutor, type Pedido } from '@/types';
import { useSpring, animated } from 'react-spring';

const estilosLocucaoOpcoes = [
  { id: 'padrao', label: 'Padrão' },
  { id: 'impacto', label: 'Impacto' },
  { id: 'jovem', label: 'Jovem' },
  { id: 'varejo', label: 'Varejo' },
  { id: 'institucional', label: 'Institucional' },
  { id: 'up_festas', label: 'Up/Festas' },
  { id: 'jornalistico', label: 'Jornalístico' },
  { id: 'outro', label: 'Outro' },
];

const gravarLocucaoFormSchema = z.object({
  locutorId: z.string().min(1, 'Por favor, selecione um locutor.'),
  tituloPedido: z.string().min(3, 'O título do pedido deve ter pelo menos 3 caracteres.'),
  estiloLocucao: z.string().min(1, 'Por favor, selecione um estilo de locução.'),
  outroEstiloEspecificacao: z.string().optional(),
  scriptText: z.string().min(10, 'O roteiro deve ter pelo menos 10 caracteres.'),
  orientacoes: z.string().optional(),
}).refine(data => {
  if (data.estiloLocucao === 'outro') {
    return data.outroEstiloEspecificacao && data.outroEstiloEspecificacao.trim().length > 0;
  }
  return true;
}, {
  message: "Por favor, especifique o estilo 'Outro'.",
  path: ["outroEstiloEspecificacao"],
});

function GravarLocucaoPage() {
  const { user, profile, refreshProfile } = useAuth();

  const [locutores, setLocutores] = useState<Locutor[]>([]);
  const [loadingLocutores, setLoadingLocutores] = useState(true);
  const [errorLocutores, setErrorLocutores] = useState<string | null>(null);
  
  const [selectedLocutor, setSelectedLocutor] = useState<Locutor | null>(null);
  const [scriptText, setScriptText] = useState('');
  const [tituloPedido, setTituloPedido] = useState('');
  const [estiloLocucao, setEstiloLocucao] = useState('');
  const [outroEstiloEspecificacao, setOutroEstiloEspecificacao] = useState('');
  const [estimatedCredits, setEstimatedCredits] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [velocidadeSelecionada, setVelocidadeSelecionada] = useState<VelocidadeLocucaoTipo>(VELOCIDADE_LOCUCAO.NORMAL);
  const [tempoEstimadoSegundos, setTempoEstimadoSegundos] = useState(0);

  // Animação para o número de segundos
  const { animatedSeconds } = useSpring({
    reset: true,
    from: { animatedSeconds: 0 },
    to: { animatedSeconds: tempoEstimadoSegundos },
    config: { duration: 500 },
  });

  const formHook = useForm<z.infer<typeof gravarLocucaoFormSchema>>({
    resolver: zodResolver(gravarLocucaoFormSchema),
    mode: 'onChange',
    defaultValues: {
      locutorId: '',
      tituloPedido: '',
      estiloLocucao: '',
      outroEstiloEspecificacao: '',
      scriptText: '',
      orientacoes: '',
    },
  });
  const { control, handleSubmit, setValue, reset, formState: { isSubmitting, errors, isValid }, watch } = formHook;

  // Log dos erros do formulário para depuração
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("Erros de validação do formulário:", errors);
    }
  }, [errors]);

  const watchedEstiloLocucao = watch("estiloLocucao");

  const fetchLocutores = useCallback(async () => {
    if (!user) {
      setLocutores([]);
      setLoadingLocutores(false);
      return;
    }
    setLoadingLocutores(true);
    setErrorLocutores(null);
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
      setErrorLocutores('Não foi possível carregar os locutores. Tente novamente mais tarde.');
      setLocutores([]);
    } finally {
      setLoadingLocutores(false);
    }
  }, [user]);

  useEffect(() => {
    const segundos = calcularTempoEstimadoSegundos(scriptText, velocidadeSelecionada);
    setTempoEstimadoSegundos(segundos);

    const credits = estimateCreditsFromText(scriptText);
    setEstimatedCredits(credits);
  }, [scriptText, velocidadeSelecionada]);

  useEffect(() => {
    fetchLocutores();
  }, [fetchLocutores]);

  const handlePlayPreview = (locutor: Locutor) => {
    if (audioPreviewRef.current) {
      if (isPlayingPreview === locutor.id) {
        audioPreviewRef.current.pause();
        setIsPlayingPreview(null);
      } else {
        audioPreviewRef.current.pause(); 
        audioPreviewRef.current.currentTime = 0;
        audioPreviewRef.current.src = locutor.audio_preview_url;
        audioPreviewRef.current.play().catch(error => console.error("Erro ao tocar áudio:", error));
        setIsPlayingPreview(locutor.id);
        audioPreviewRef.current.onended = () => setIsPlayingPreview(null);
      }
    }
  };
  
  const onSubmitForm = async (values: z.infer<typeof gravarLocucaoFormSchema>) => {
    if (!user || !profile) {
      toast.error("Erro de Autenticação", { description: "Usuário não autenticado. Faça login novamente." });
      return;
    }
    if (!selectedLocutor) {
      toast.error("Erro de Validação", { description: "Por favor, selecione um locutor." });
      return;
    }
    if ((profile.credits ?? 0) < estimatedCredits) {
      toast.error("Créditos Insuficientes", { 
        description: `Você precisa de ${estimatedCredits} créditos, mas possui apenas ${profile.credits ?? 0}.`
      });
      return;
    }

    const estiloFinal = values.estiloLocucao === 'outro' 
      ? `Outro: ${values.outroEstiloEspecificacao}` 
      : values.estiloLocucao;

    try {
      const pedidoData = {
        user_id: profile.id,
        locutor_id: selectedLocutor.id,
        texto_roteiro: values.scriptText,
        status: 'pendente',
        creditos_debitados: estimatedCredits,
        orientacoes: values.orientacoes || null,
        tempo_estimado_segundos: tempoEstimadoSegundos,
        titulo: values.tituloPedido,
        estilo_locucao: estiloFinal,
      };

      const { data: newPedido, error } = await supabase.from('pedidos').insert(pedidoData).select().single();

      if (error) throw error;

      if (newPedido) {
        const novosCreditos = (profile.credits ?? 0) - estimatedCredits;
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ credits: novosCreditos })
          .eq('id', profile.id);

        if (updateError) {
          console.error('Erro ao atualizar créditos, mas pedido foi criado:', updateError, newPedido.id_pedido );
          toast.error('Pedido Enviado, Erro nos Créditos', {
            description: 'Seu pedido foi enviado, mas houve um problema ao atualizar seus créditos. Contate o suporte.'
          });
        } else {
            toast.success('Pedido Enviado com Sucesso!', {
                description: 'Seu pedido de locução foi enviado e está aguardando processamento.'
            });
        }
        
        reset();
        setScriptText('');
        setSelectedLocutor(null);

        if (refreshProfile) {
          await refreshProfile();
        }
      } else {
        throw new Error('Pedido não retornado após inserção.');
      }
    } catch (error: any) {
      console.error('Erro inesperado em onSubmitForm:', error);
      toast.error("Erro Inesperado", { description: error.message || "Ocorreu um erro inesperado ao processar seu pedido." });
    }
  };
  
  if (loadingLocutores) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (errorLocutores) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-destructive text-lg">{errorLocutores}</p>
        <Button onClick={fetchLocutores} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <audio ref={audioPreviewRef} className="hidden" />
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">Gravar Nova Locução</h1>

      <section id="escolha-locutor" className="mb-12">
        <Card className="shadow-lg border-border/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Escolha seu Locutor</CardTitle>
                <CardDescription>Ouça as prévias e selecione o locutor ideal para seu projeto.</CardDescription>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {!user && (
                 <p className="text-center text-muted-foreground py-4">Por favor, faça login para ver os locutores e enviar pedidos.</p>
            )}
            {user && locutores.length === 0 && !loadingLocutores && (
              <p className="text-center text-muted-foreground py-4">Nenhum locutor disponível no momento.</p>
            )}
            {user && locutores.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {locutores.map((locutor) => (
                    <Card
                      key={locutor.id}
                      className={`transition-all duration-200 ease-in-out hover:shadow-xl ${selectedLocutor?.id === locutor.id ? 'ring-2 ring-primary shadow-xl border-primary' : 'hover:border-primary/60 border-border/40'}`}
                    >
                      <CardHeader className="flex flex-row items-start space-x-4 pb-3">
                        {locutor.avatar_url ? (
                          <img src={locutor.avatar_url} alt={locutor.nome} className="h-16 w-16 rounded-full object-cover border-2 border-muted" />
                        ) : (
                          <UserCircle className="h-16 w-16 text-muted-foreground" />
                        )}
                        <div className='flex-1'>
                          <CardTitle className="text-lg">{locutor.nome}</CardTitle>
                          <CardDescription className="text-xs">{locutor.tipo_voz}</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 flex flex-col space-y-3">
                        <div className="flex items-center justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlayPreview(locutor)}
                            className="flex items-center space-x-2 group w-full border-border/60 hover:border-primary/80"
                          >
                            <PlayCircle className={`h-5 w-5 ${isPlayingPreview === locutor.id ? 'text-primary animate-pulse' : 'text-muted-foreground group-hover:text-primary'}`} />
                            <span>{isPlayingPreview === locutor.id ? 'Pausar Prévia' : 'Ouvir Prévia'}</span>
                          </Button>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedLocutor(locutor);
                            setValue('locutorId', locutor.id ? locutor.id.toString() : '');
                          }}
                          variant={selectedLocutor?.id === locutor.id ? 'default' : 'outline'}
                          className={`w-full ${selectedLocutor?.id === locutor.id ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'text-primary border-primary hover:bg-primary/10'}`}
                        >
                          {selectedLocutor?.id === locutor.id ? 'Locutor Selecionado' : 'Selecionar este Locutor'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {selectedLocutor && user && (
        <section id="formulario-pedido" className="mb-12">
          <Card className="shadow-lg border-border/40">
            <CardHeader>
              <CardTitle className="text-xl">Detalhes do Pedido</CardTitle>
              <CardDescription>
                Você selecionou <span className="font-semibold text-primary">{selectedLocutor.nome}</span>. Agora, insira o texto do seu roteiro e escolha a velocidade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...formHook}>
                <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
                  <FormField
                    control={control}
                    name="tituloPedido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">
                          Título do Pedido <span className="text-sm text-muted-foreground">(para sua identificação)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Campanha Dia das Mães - Loja X"
                            maxLength={100}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="scriptText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Roteiro para Locução</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Digite ou cole aqui o texto que deseja para a locução..."
                            className="min-h-[150px] resize-y text-base border-border/70 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setScriptText(e.target.value); 
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="estiloLocucao"
                    render={({ field }) => (
                      <FormItem className="my-6">
                        <FormLabel className="text-base font-semibold mb-3 block">Estilo de Locução Desejado:</FormLabel>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                        >
                          {estilosLocucaoOpcoes.map((opcao) => (
                            <FormItem key={opcao.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 transition-colors">
                              <FormControl>
                                <RadioGroupItem value={opcao.id} id={`estilo-${opcao.id}`} />
                              </FormControl>
                              <FormLabel htmlFor={`estilo-${opcao.id}`} className="font-normal cursor-pointer flex-1">
                                {opcao.label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {watchedEstiloLocucao === 'outro' && (
                    <FormField
                      control={control}
                      name="outroEstiloEspecificacao"
                      render={({ field }) => (
                        <FormItem className="-mt-2 mb-4">
                          <FormControl>
                            <Input
                              placeholder="Por favor, especifique o estilo 'Outro'"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={control}
                    name="orientacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">
                          Orientações para o Locutor <span className="text-sm text-muted-foreground">(Opcional - briefing, tom de voz, etc.)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Forneça aqui um breve briefing para o locutor (ex: tom mais sério, leitura jovem e dinâmica, ênfase em certas palavras, etc.). Este campo não é obrigatório."
                            className="min-h-[100px] resize-y text-base border-border/70 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel className="text-base font-semibold mb-3 block">Velocidade da Locução:</FormLabel>
                    <RadioGroup
                      defaultValue={VELOCIDADE_LOCUCAO.NORMAL}
                      onValueChange={(value: string) => setVelocidadeSelecionada(value as VelocidadeLocucaoTipo)}
                      className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={VELOCIDADE_LOCUCAO.PAUSADA} id="r-pausada" className="text-primary focus:ring-primary focus:ring-offset-background"/>
                        <Label htmlFor="r-pausada" className="font-normal cursor-pointer hover:text-primary transition-colors">Pausada</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={VELOCIDADE_LOCUCAO.NORMAL} id="r-normal" className="text-primary focus:ring-primary focus:ring-offset-background"/>
                        <Label htmlFor="r-normal" className="font-normal cursor-pointer hover:text-primary transition-colors">Normal</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={VELOCIDADE_LOCUCAO.RAPIDA} id="r-rapida" className="text-primary focus:ring-primary focus:ring-offset-background"/>
                        <Label htmlFor="r-rapida" className="font-normal cursor-pointer hover:text-primary transition-colors">Rápida</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="my-6 p-4 border rounded-lg bg-muted/40 shadow-sm border-border/50">
                    <div className="flex flex-col sm:flex-row justify-around sm:items-center space-y-4 sm:space-y-0">
                      <div className='text-center sm:text-left px-2'>
                        <p className="text-sm text-muted-foreground mb-1">Tempo Estimado:</p>
                        <p className="text-3xl font-bold text-primary tabular-nums">
                          <animated.span>
                            {animatedSeconds.to((val: number) => formatarSegundosParaMMSS(Math.round(val)))}
                          </animated.span>
                        </p>
                      </div>
                      <Separator orientation="vertical" className="hidden sm:block h-12 self-center bg-border/70" />
                      <div className='text-center sm:text-left px-2'>
                        <p className="text-sm text-muted-foreground mb-1">Créditos Estimados:</p>
                        <p className="text-3xl font-bold text-foreground tabular-nums">
                          {estimatedCredits}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <Button 
                        type="submit" 
                        disabled={
                          isSubmitting || 
                          !isValid ||
                          !selectedLocutor ||
                          estimatedCredits === 0 || 
                          estimatedCredits > (profile?.credits ?? 0)
                        }
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px] text-base"
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-5 w-5" />
                           Enviar Pedido Agora
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {!selectedLocutor && scriptText.trim().length >= 10 && (
                     <p className="text-sm text-destructive text-right -mt-4">
                      Selecione um locutor para prosseguir.
                    </p>
                  )}
                  {selectedLocutor && scriptText.trim().length < 10 && estimatedCredits > 0 && (
                     <p className="text-sm text-orange-600 dark:text-orange-500 text-right -mt-4">
                      O roteiro deve ter pelo menos 10 caracteres.
                    </p>
                  )}
                  {estimatedCredits > (profile?.credits ?? 0) && scriptText.trim().length >= 10 && (
                    <p className="text-sm text-destructive text-right -mt-4">
                      Você não possui créditos suficientes para este pedido.
                    </p>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>
      )}

      {!selectedLocutor && locutores.length > 0 && user && (
        <div className="text-center mt-8 p-6 bg-amber-50 border border-amber-300 rounded-lg shadow-md">
            <p className="text-lg font-semibold text-amber-700">Por favor, selecione um locutor acima para habilitar o formulário de pedido.</p>
        </div>
      )}

    </div>
  );
}

export default GravarLocucaoPage; 