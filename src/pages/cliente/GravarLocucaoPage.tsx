import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { PlayCircle, Send, Loader2, UserCircle, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VELOCIDADE_LOCUCAO,
  type VelocidadeLocucaoTipo,
  calcularTempoEstimadoSegundos,
  formatarSegundosParaMMSS,
} from "@/utils/locutionTimeUtils";
import { type Locutor } from '@/types';
import { useSpring, animated } from 'react-spring';
import { gerarIdReferenciaUnico } from '@/utils/pedidoUtils';
import { obterMensagemSucessoAleatoria } from '@/utils/messageUtils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PEDIDO_STATUS } from '@/types/pedido.type';
import { atualizarPedidoAction } from '@/actions/pedido-actions';

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

const multiStepGravarLocucaoFormSchema = z.object({
  tipoAudio: z.enum(['off', 'produzido'], { required_error: 'Selecione o tipo de áudio.' }),
  locutorId: z.string().optional(), // Validação mais robusta em handleNextStep
  tituloPedido: z.string().optional(),
  estiloLocucao: z.string().optional(),
  outroEstiloEspecificacao: z.string().optional(),
  scriptText: z.string().optional(),
  orientacoes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validações para a Etapa 2 (após tipoAudio ser preenchido)
  // A validação do locutorId será feita no handleNextStep e antes do submit
  
  // Validações para a Etapa 3 (após tipoAudio e locutorId serem preenchidos)
  if (data.tipoAudio && data.locutorId) {
    if (!data.tituloPedido || data.tituloPedido.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'O título do pedido deve ter pelo menos 3 caracteres.',
        path: ['tituloPedido'],
      });
    }
    if (!data.estiloLocucao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Por favor, selecione um estilo de locução.',
        path: ['estiloLocucao'],
      });
    }
    if (data.estiloLocucao === 'outro' && (!data.outroEstiloEspecificacao || data.outroEstiloEspecificacao.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, especifique o estilo 'Outro'.",
        path: ['outroEstiloEspecificacao'],
      });
    }
    if (!data.scriptText || data.scriptText.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'O roteiro deve ter pelo menos 10 caracteres.',
        path: ['scriptText'],
      });
    }
  }
});

function GravarLocucaoPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [locutores, setLocutores] = useState<Locutor[]>([]);
  const [loadingLocutores, setLoadingLocutores] = useState(true);
  const [errorLocutores, setErrorLocutores] = useState<string | null>(null);
  const [selectedLocutor, setSelectedLocutor] = useState<Locutor | null>(null);
  const [estimatedCredits, setEstimatedCredits] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [velocidadeSelecionada, setVelocidadeSelecionada] = useState<VelocidadeLocucaoTipo>(VELOCIDADE_LOCUCAO.NORMAL);
  const [tempoEstimadoSegundos, setTempoEstimadoSegundos] = useState(0);

  // Estados para paginação de locutores
  const [currentPageLocutores, setCurrentPageLocutores] = useState(1);
  const LOCUTORES_PER_PAGE = 4;

  // Estados para modo de edição
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);
  const [loadingPedidoParaEdicao, setLoadingPedidoParaEdicao] = useState(false);

  const { animatedSeconds } = useSpring({
    reset: true,
    from: { animatedSeconds: 0 },
    to: { animatedSeconds: tempoEstimadoSegundos },
    config: { duration: 500 },
  });

  const formHook = useForm<z.infer<typeof multiStepGravarLocucaoFormSchema>>({
    resolver: zodResolver(multiStepGravarLocucaoFormSchema),
    mode: 'onChange', 
    defaultValues: {
      tipoAudio: undefined,
      locutorId: '',
      tituloPedido: '',
      estiloLocucao: '',
      outroEstiloEspecificacao: '',
      scriptText: '',
      orientacoes: '',
    },
  });

  const { control, handleSubmit, setValue, reset, formState: { isSubmitting, isValid: isFormValid }, watch, trigger, getValues, setError: setFormError } = formHook;

  const watchedTipoAudio = watch("tipoAudio");
  const watchedLocutorId = watch("locutorId");
  const watchedEstiloLocucao = watch("estiloLocucao");
  const watchedScriptText = watch("scriptText");

  const fetchPedidoParaEdicao = async (pedidoId: string) => {
    if (!user) {
      toast.error("Autenticação necessária", { description: "Faça login para editar seu pedido." });
      navigate("/login"); // Ou para a página de origem
      return;
    }
    setLoadingPedidoParaEdicao(true);
    try {
      const { data: pedidoData, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          user_id,
          locutor_id,
          texto_roteiro,
          titulo,
          tipo_audio,
          estilo_locucao,
          orientacoes,
          status,
          locutores (id, nome, avatar_url, ativo, amostra_audio_url)
        `)
        .eq('id', pedidoId)
        .eq('user_id', user.id) // Garante que o usuário só pode editar seus próprios pedidos
        .single();

      if (error || !pedidoData) {
        console.error("Erro ao buscar pedido para edição:", error);
        toast.error("Erro ao Carregar Pedido", { description: "Não foi possível carregar os dados do pedido para edição. Verifique se o pedido existe e você tem permissão." });
        navigate("/cliente/meus-audios"); // Volta para a lista de áudios
        return;
      }

      if (pedidoData.status !== PEDIDO_STATUS.PENDENTE) {
        toast.info("Edição Não Permitida", { description: `Este pedido não pode mais ser editado pois seu status é "${pedidoData.status}".` });
        navigate("/cliente/meus-audios");
        return;
      }

      // Mapear os dados do pedido para o formulário
      let estiloLocucaoForm = pedidoData.estilo_locucao || '';
      let outroEstiloEspecificacaoForm = '';
      if (estiloLocucaoForm.startsWith('Outro: ')) {
        outroEstiloEspecificacaoForm = estiloLocucaoForm.substring('Outro: '.length);
        estiloLocucaoForm = 'outro';
      }

      formHook.reset({
        tipoAudio: pedidoData.tipo_audio as 'off' | 'produzido' | undefined,
        locutorId: pedidoData.locutor_id || '',
        tituloPedido: pedidoData.titulo || '',
        estiloLocucao: estiloLocucaoForm,
        outroEstiloEspecificacao: outroEstiloEspecificacaoForm,
        scriptText: pedidoData.texto_roteiro || '',
        orientacoes: pedidoData.orientacoes || '',
      });

      // Definir o locutor selecionado se houver dados do locutor
      if (pedidoData.locutores) {
        // O select do Supabase retorna locutores como um objeto se for single, ou array se for multiple.
        // Como estamos buscando um pedido específico que tem UMA relação com locutor, esperamos um objeto.
        const locutorDoPedido = pedidoData.locutores as unknown as Locutor; // Casting necessário devido à forma como Supabase retorna relações
        if (locutorDoPedido && locutorDoPedido.id === pedidoData.locutor_id) {
          setSelectedLocutor(locutorDoPedido);
        }
      }
      
      // Poderíamos avançar para uma etapa específica se desejado, ex: setCurrentStep(3);
      // Por enquanto, o usuário começará na etapa 1 com os dados preenchidos.
      toast.info("Modo de Edição", { description: `Editando pedido #${pedidoData.id.substring(0,8)}...` });

    } catch (err) {
      console.error("Erro catastrófico ao buscar pedido para edição:", err);
      toast.error("Erro Crítico", { description: "Ocorreu um erro inesperado ao tentar carregar os dados do pedido." });
    } finally {
      setLoadingPedidoParaEdicao(false);
    }
  };

  // Efeito para carregar dados do pedido em modo de edição
  useEffect(() => {
    const pedidoIdFromUrl = searchParams.get('pedidoId');
    if (pedidoIdFromUrl) {
      setIsEditMode(true);
      setEditingPedidoId(pedidoIdFromUrl);
      fetchPedidoParaEdicao(pedidoIdFromUrl);
    }
  }, [searchParams, user]); // Adicionado user como dependência, pois fetchPedidoParaEdicao usa user.id

  // Calcular locutores para a página atual
  const indexOfLastLocutor = currentPageLocutores * LOCUTORES_PER_PAGE;
  const indexOfFirstLocutor = indexOfLastLocutor - LOCUTORES_PER_PAGE;
  const currentLocutoresToDisplay = locutores.slice(indexOfFirstLocutor, indexOfLastLocutor);
  const totalLocutoresPages = Math.ceil(locutores.length / LOCUTORES_PER_PAGE);

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
      if (error) throw error;
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
    fetchLocutores();
  }, [fetchLocutores]);
  
  useEffect(() => {
    const currentScript = getValues("scriptText") || "";
    const segundos = calcularTempoEstimadoSegundos(currentScript, velocidadeSelecionada);
    setTempoEstimadoSegundos(segundos);
    const credits = estimateCreditsFromText(currentScript);
    setEstimatedCredits(credits);
  }, [watchedScriptText, velocidadeSelecionada, getValues]);

  // Funções de navegação para paginação de locutores
  const handleNextLocutoresPage = () => {
    setCurrentPageLocutores((prevPage) => Math.min(prevPage + 1, totalLocutoresPages));
  };

  const handlePreviousLocutoresPage = () => {
    setCurrentPageLocutores((prevPage) => Math.max(prevPage - 1, 1));
  };

  const handlePlayPreview = (locutor: Locutor) => {
    if (audioPreviewRef.current) {
      if (isPlayingPreview === locutor.id) {
        audioPreviewRef.current.pause();
        setIsPlayingPreview(null);
      } else {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.currentTime = 0;
        audioPreviewRef.current.src = locutor.amostra_audio_url;
        audioPreviewRef.current.play().catch(error => console.error("Erro ao tocar áudio:", error));
        setIsPlayingPreview(locutor.id);
        audioPreviewRef.current.onended = () => setIsPlayingPreview(null);
      }
    }
  };

  const onSubmitForm = async (values: z.infer<typeof multiStepGravarLocucaoFormSchema>) => {
    if (!user || !profile) {
      toast.error("Erro de Autenticação", { description: "Usuário não autenticado. Faça login novamente." });
      return;
    }
    if (!selectedLocutor || values.locutorId !== selectedLocutor.id) {
      toast.error("Erro de Validação", { description: "Locutor inválido ou não selecionado. Volte e selecione um." });
      setCurrentStep(2);
      return;
    }
    // Validação de créditos e roteiro apenas para novos pedidos
    if (!isEditMode) {
      if ((profile.credits ?? 0) < estimatedCredits) {
        toast.error("Créditos Insuficientes", { description: `Você precisa de ${estimatedCredits} créditos, mas possui ${profile.credits ?? 0}.` });
        return;
      }
      if (estimatedCredits === 0 && values.scriptText && values.scriptText.trim().length > 0) {
        toast.error("Erro no Pedido", { description: "O roteiro parece válido, mas não foram calculados créditos. Verifique o texto." });
        return;
      }
      if (estimatedCredits === 0 && (!values.scriptText || values.scriptText.trim().length < 10)) {
        toast.error("Roteiro Inválido", { description: "O roteiro deve ter pelo menos 10 caracteres." });
        setFormError("scriptText", { type: "manual", message: "O roteiro deve ter pelo menos 10 caracteres." });
        return;
      }
    }

    if (isEditMode && editingPedidoId) {
      // Lógica para ATUALIZAR pedido
      console.log("MODO EDIÇÃO - Atualizando pedido:", editingPedidoId, values);
      
      if (!values.tipoAudio) {
        toast.error("Erro de Validação", {description: "O tipo de áudio é obrigatório."}) ;
        return;
      }
      if (!selectedLocutor?.id) { // selectedLocutor.id já é validado no início da função, mas checamos de novo
        toast.error("Erro de Validação", {description: "O locutor é obrigatório."}) ;
        return;
      }

      // O campo estiloFinal (que já existe na sua função) combina 'Outro: ' com a especificação.
      // Usaremos diretamente os values que o react-hook-form fornece, 
      // pois o schema da action agora espera 'estiloLocucao' e 'orientacoes'.
      // A lógica de 'Outro: ' já deve estar em values.estiloLocucao se 'outro' foi selecionado e especificado.
      // No entanto, values.estiloLocucao SÓ terá 'outro' se for o caso, e values.outroEstiloEspecificacao terá o texto.
      // A action espera o valor combinado se for 'Outro'.
      const estiloParaAction = values.estiloLocucao === 'outro' 
          ? `Outro: ${values.outroEstiloEspecificacao || ''}` 
          : values.estiloLocucao || '';

      const resultadoUpdate = await atualizarPedidoAction({
        pedidoId: editingPedidoId,
        titulo: values.tituloPedido || undefined, 
        tipoAudio: values.tipoAudio, 
        locutorId: selectedLocutor.id, 
        textoRoteiro: values.scriptText || '',
        estiloLocucao: estiloParaAction, // Enviando o valor correto para o schema da action
        orientacoes: values.orientacoes || undefined, // Enviando o valor correto para o schema da action
      });

      // Tratar resultadoUpdate similar à exclusão e outras actions
      if (!resultadoUpdate) { // Checagem para o linter, embora next-safe-action deva sempre retornar um objeto
        console.error('Resultado inesperado (undefined) da action de atualização.');
        toast.error("Erro Desconhecido", { description: "Falha ao comunicar com o servidor para atualização." });
        return; // Ou setIsLoading(false) e return, dependendo do fluxo de loading
      }

      if (resultadoUpdate.validationErrors) {
        let errorMsg = "Erro de validação ao atualizar.";
        const ve = resultadoUpdate.validationErrors;
        if (ve.titulo && Array.isArray(ve.titulo) && ve.titulo.length > 0) errorMsg = ve.titulo.join(', ');
        else if (ve.tipoAudio && Array.isArray(ve.tipoAudio) && ve.tipoAudio.length > 0) errorMsg = ve.tipoAudio.join(', ');
        else if (ve.locutorId && Array.isArray(ve.locutorId) && ve.locutorId.length > 0) errorMsg = ve.locutorId.join(', ');
        else if (ve.textoRoteiro && Array.isArray(ve.textoRoteiro) && ve.textoRoteiro.length > 0) errorMsg = ve.textoRoteiro.join(', ');
        else if (ve.estiloLocucao && Array.isArray(ve.estiloLocucao) && ve.estiloLocucao.length > 0) errorMsg = ve.estiloLocucao.join(', ');
        else if (ve.orientacoes && Array.isArray(ve.orientacoes) && ve.orientacoes.length > 0) errorMsg = ve.orientacoes.join(', ');
        else if (ve._errors && Array.isArray(ve._errors) && ve._errors.length > 0) errorMsg = ve._errors.join(', ');
        toast.error("Erro de Validação", { description: errorMsg });
      } else if (resultadoUpdate.serverError) {
        toast.error("Erro no Servidor", { description: resultadoUpdate.serverError });
      } else if (resultadoUpdate.data && typeof resultadoUpdate.data.failure === 'string') {
        toast.error("Falha ao Atualizar", { description: resultadoUpdate.data.failure });
      } else if (resultadoUpdate.data && resultadoUpdate.data.success === true) { 
        toast.success("Pedido Atualizado", { description: "Seu pedido foi atualizado com sucesso!" });
        navigate('/meus-audios');
      } else {
        console.error("Estrutura de resultado inesperada da action de atualização:", resultadoUpdate);
        toast.error("Erro Desconhecido", { description: "Ocorreu um erro ao processar sua solicitação de atualização." });
      }
    } else {
      // Lógica para CRIAR novo pedido (existente)
      let idPedidoSerialGerado: string;
      try {
        idPedidoSerialGerado = await gerarIdReferenciaUnico(supabase);
      } catch (error: any) {
        toast.error("Erro ao Gerar ID do Pedido", { description: error.message || "Não foi possível gerar um ID único." });
        return;
      }

      try {
        const pedidoData = {
          user_id: user.id,
          locutor_id: selectedLocutor.id,
          texto_roteiro: values.scriptText || '',
          status: PEDIDO_STATUS.PENDENTE, // Usar o enum importado
          titulo: values.tituloPedido || '',
          creditos_debitados: estimatedCredits,
          tipo_audio: values.tipoAudio, // Zod já garante que é 'off' ou 'produzido'
          estilo_locucao_solicitado: values.estiloLocucao === 'outro' ? values.outroEstiloEspecificacao : null,
          orientacoes_gerais: values.orientacoes || '',
          id_pedido_serial: idPedidoSerialGerado,
          termos_aceitos: true, // Assumindo que há um aceite implícito ou explícito em algum lugar
          data_solicitacao: new Date().toISOString(),
        };

        const { error: insertError } = await supabase.from('pedidos').insert(pedidoData);
        if (insertError) throw insertError;

        const novoSaldo = (profile.credits ?? 0) - estimatedCredits;
        const { error: creditError } = await supabase
          .from('profiles')
          .update({ credits: novoSaldo })
          .eq('id', user.id);

        if (creditError) {
          console.warn("Erro ao debitar créditos, mas pedido foi criado. Revertendo? Por enquanto não.", creditError);
          // Considerar lógica de compensação ou notificação admin
        }

        if (refreshProfile) refreshProfile(); // Atualiza o perfil (créditos) no AuthContext

        const mensagemSucessoAleatoria = obterMensagemSucessoAleatoria();
        toast.success("Pedido Enviado!", {
          description: `${mensagemSucessoAleatoria} Pedido #${idPedidoSerialGerado}.`,
          duration: 7000,
        });
        reset(); // Limpa o formulário
        setCurrentStep(1); // Volta para a primeira etapa
        setSelectedLocutor(null);
        setEstimatedCredits(0);
        navigate('/cliente/meus-audios');

      } catch (error: any) {
        console.error("Erro ao criar pedido:", error);
        toast.error("Erro ao Criar Pedido", { description: `Não foi possível criar seu pedido. Detalhes: ${error.message}` });
      }
    }
  };

  const handleNextStep = async () => {
    let isValid = false;
    if (currentStep === 1) {
      isValid = await trigger("tipoAudio");
      if (!getValues("tipoAudio")) {
        setFormError("tipoAudio", { type: "manual", message: "Selecione o tipo de áudio." });
        isValid = false;
      }
    } else if (currentStep === 2) {
      isValid = await trigger("locutorId");
      const locId = getValues("locutorId");
      if (locId && locutores.length > 0) {
        const foundLocutor = locutores.find(l => l.id === locId);
        if (foundLocutor) {
          setSelectedLocutor(foundLocutor);
          isValid = true;
        } else {
          setFormError("locutorId", { type: "manual", message: "Locutor selecionado não encontrado na lista." });
          isValid = false;
        }
      } else {
        setFormError("locutorId", { type: "manual", message: "Por favor, selecione um locutor." });
        isValid = false;
      }
    }
    // Para a etapa 3, a validação completa é feita pelo Zod no submit, mas isFormValid pode ser usado para o botão.
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <audio ref={audioPreviewRef} className="hidden" />
      
      <Card className="w-full max-w-3xl mx-auto shadow-xl border-border/40">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Gravar Nova Locução</CardTitle>
          <CardDescription className="text-lg">
            Siga os passos para criar seu pedido de locução.
          </CardDescription>
        </CardHeader>

        <Form {...formHook}>
          <form onSubmit={handleSubmit(onSubmitForm)}>
            <CardContent className="space-y-8 py-8">
              {/* Indicador de Etapas */}
              <div className="flex justify-center space-x-2 mb-10">
                {[
                  { step: 1, label: "Tipo" }, 
                  { step: 2, label: "Locutor" }, 
                  { step: 3, label: "Detalhes" }
                ].map(({step, label}) => (
                  <div key={step} className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-semibold border-2",
                        currentStep === step ? "bg-primary text-primary-foreground border-primary" : 
                        currentStep > step ? "bg-green-500 text-white border-green-600" : 
                        "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {currentStep > step ? <CheckIcon className="w-5 h-5" /> : 
                       currentStep === step ? step : 
                       step 
                      }
                    </div>
                    <span className={cn(
                      "text-xs mt-2",
                       currentStep === step ? "text-primary font-semibold" : 
                       currentStep > step ? "text-green-600" :
                       "text-muted-foreground"
                      )}>{label}</span>
                  </div>
                ))}
              </div>

              {/* ETAPA 1: SELEÇÃO DO TIPO DE ÁUDIO */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fadeIn">
                  <FormField
                    control={control}
                    name="tipoAudio"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-xl font-semibold text-center block mb-4">Qual o tipo de áudio desejado?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col sm:flex-row gap-4 items-center justify-center"
                          >
                            <FormItem className="flex-1">
                              <FormControl>
                                <RadioGroupItem value="off" id="tipoOff" className="sr-only peer" />
                              </FormControl>
                              <FormLabel 
                                htmlFor="tipoOff" 
                                className={cn(
                                  "flex flex-col items-center justify-center rounded-md border-2 p-6 cursor-pointer transition-all",
                                  "hover:bg-accent hover:text-accent-foreground",
                                  field.value === "off" 
                                    ? "border-primary bg-primary/10 shadow-md" 
                                    : "border-muted bg-popover"
                                )}
                              >
                                <UserCircle className="mb-3 h-8 w-8" />
                                Áudio em OFF <span className="text-xs text-muted-foreground mt-1">(apenas a voz)</span>
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex-1">
                              <FormControl>
                                <RadioGroupItem value="produzido" id="tipoProduzido" className="sr-only peer" />
                              </FormControl>
                              <FormLabel 
                                htmlFor="tipoProduzido" 
                                className={cn(
                                  "flex flex-col items-center justify-center rounded-md border-2 p-6 cursor-pointer transition-all",
                                  "hover:bg-accent hover:text-accent-foreground",
                                  field.value === "produzido" 
                                    ? "border-primary bg-primary/10 shadow-md" 
                                    : "border-muted bg-popover"
                                )}
                              >
                                <Send className="mb-3 h-8 w-8" /> {/* Ícone pode ser melhorado */}
                                Áudio Produzido <span className="text-xs text-muted-foreground mt-1">(com trilha e efeitos)</span>
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-center pt-2" />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* ETAPA 2: SELEÇÃO DE LOCUTOR */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold">Selecione o Locutor</h2>
                    <p className="text-muted-foreground">Escolha a voz para o seu projeto.</p>
                  </div>
                  {loadingLocutores && (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="ml-3">Carregando locutores...</p>
                    </div>
                  )}
                  {errorLocutores && (
                    <div className="text-center py-10 text-red-600">
                      <Users className="mx-auto h-12 w-12 text-red-500" />
                      <p className="mt-2 font-semibold">Erro ao carregar locutores</p>
                      <p className="text-sm text-muted-foreground">{errorLocutores}</p>
                      <Button onClick={fetchLocutores} variant="outline" className="mt-4">
                        Tentar Novamente
                      </Button>
                    </div>
                  )}
                  {!loadingLocutores && !errorLocutores && locutores.length === 0 && (
                     <div className="text-center py-10">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 font-semibold">Nenhum locutor disponível</p>
                        <p className="text-sm text-muted-foreground">Não há locutores cadastrados ou ativos no momento.</p>
                      </div>
                  )}
                  {!loadingLocutores && !errorLocutores && locutores.length > 0 && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {currentLocutoresToDisplay.map((locutor) => (
                          <Card
                            key={locutor.id}
                            onClick={() => {
                              setSelectedLocutor(locutor);
                              setValue("locutorId", locutor.id, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                            }}
                            className={cn(
                              "cursor-pointer transition-all duration-200 ease-in-out transform hover:shadow-xl hover:-translate-y-1 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                              watchedLocutorId === locutor.id && "ring-2 ring-primary shadow-xl -translate-y-1",
                              "flex flex-col h-full"
                            )}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedLocutor(locutor);
                                setValue("locutorId", locutor.id, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                              }
                            }}
                          >
                            <CardContent className="p-0 flex flex-col flex-grow">
                              <CardHeader className="p-3 flex-shrink-0">
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-12 w-12 border-2 border-muted">
                                    <AvatarImage src={locutor.avatar_url || undefined} alt={locutor.nome} />
                                    <AvatarFallback className="text-xs">
                                      {locutor.nome.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-base font-semibold truncate" title={locutor.nome}>
                                      {locutor.nome}
                                    </CardTitle>
                                    <CardDescription className="text-xs line-clamp-2 h-8 leading-tight">
                                      {locutor.descricao || locutor.tipo_voz || 'Voz profissional'}
                                    </CardDescription>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-0 text-center flex-grow flex flex-col justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-xs mt-auto"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayPreview(locutor);
                                  }}
                                  disabled={!locutor.amostra_audio_url}
                                >
                                  <PlayCircle className={cn("mr-1.5 h-3.5 w-3.5", isPlayingPreview === locutor.id && "animate-pulse text-primary")} />
                                  {isPlayingPreview === locutor.id ? 'Pausar' : 'Ouvir Demo'}
                                </Button>
                              </CardContent>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {totalLocutoresPages > 1 && (
                        <div className="flex justify-center items-center space-x-2 mt-6 pt-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePreviousLocutoresPage}
                            disabled={currentPageLocutores === 1}
                            aria-label="Página anterior de locutores"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>

                          {/* Container para os pontos */}
                          <div className="flex items-center space-x-1.5">
                            {Array.from({ length: totalLocutoresPages }, (_, i) => (
                              <button
                                key={i}
                                onClick={() => setCurrentPageLocutores(i + 1)} // Navegação direta
                                className={cn(
                                  "h-2 w-2 rounded-full transition-all duration-150 ease-in-out",
                                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", // Estilo de foco melhorado
                                  currentPageLocutores === i + 1
                                    ? "bg-primary scale-125 transform" // Ponto ativo: cor primária e um pouco maior
                                    : "bg-muted hover:bg-muted-foreground/70" // Ponto inativo
                                )}
                                aria-label={`Ir para página ${i + 1}`}
                                aria-current={currentPageLocutores === i + 1 ? "page" : undefined}
                              />
                            ))}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNextLocutoresPage}
                            disabled={currentPageLocutores === totalLocutoresPages}
                            aria-label="Próxima página de locutores"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                  <FormField control={control} name="locutorId" render={({ field }) => ( <FormItem><FormControl><Input type="hidden" {...field} /></FormControl><FormMessage className="text-center pt-2" /></FormItem> )} />
                </div>
              )}

              {/* ETAPA 3: FORMULÁRIO DE TEXTO E DETALHES */}
              {currentStep === 3 && selectedLocutor && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="text-center mb-6 p-4 border rounded-md bg-muted/30">
                    <h3 className="text-xl font-semibold">Detalhes da Locução</h3>
                    <p className="text-sm text-muted-foreground">
                      Locutor: <span className="font-semibold text-primary">{selectedLocutor.nome}</span> | Tipo: <span className="font-semibold text-primary">{getValues("tipoAudio") === "off" ? "Áudio em OFF" : "Áudio Produzido"}</span>
                    </p>
                  </div>

                  <FormField
                    control={control}
                    name="tituloPedido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título do Pedido <span className="text-xs text-muted-foreground">(para sua identificação)</span></FormLabel>
                        <FormControl><Input placeholder="Ex: Spot Dia das Mães Varejão" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="estiloLocucao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estilo de Locução</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione o estilo desejado" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {estilosLocucaoOpcoes.map(opcao => (
                              <SelectItem key={opcao.id} value={opcao.id}>{opcao.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchedEstiloLocucao === 'outro' && (
                    <FormField
                      control={control}
                      name="outroEstiloEspecificacao"
                      render={({ field }) => (
                        <FormItem className="animate-fadeIn">
                          <FormLabel>Especifique o Estilo "Outro"</FormLabel>
                          <FormControl><Input placeholder="Descreva o estilo aqui" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={control}
                    name="scriptText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex justify-between items-center">
                          <span>Roteiro da Locução</span>
                          <span className="text-xs text-muted-foreground">
                            {(getValues("scriptText") || "").split(/\s+/).filter(Boolean).length} palavras
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Digite ou cole aqui o texto para a locução..."
                            className="min-h-[150px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div>
                    <FormLabel className="text-base font-medium mb-2 block">Velocidade da Locução:</FormLabel>
                    <RadioGroup
                      defaultValue={velocidadeSelecionada}
                      onValueChange={(value) => setVelocidadeSelecionada(value as VelocidadeLocucaoTipo)}
                      className="flex flex-wrap gap-x-4 gap-y-2"
                    >
                      {Object.values(VELOCIDADE_LOCUCAO).map((velocidade) => (
                        <FormItem key={velocidade} className="flex items-center space-x-2">
                          <FormControl><RadioGroupItem value={velocidade} id={`vel-${velocidade}`} /></FormControl>
                          <Label htmlFor={`vel-${velocidade}`} className="font-normal cursor-pointer">{velocidade.replace('_', ' ')}</Label>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </div>

                  <FormField
                    control={control}
                    name="orientacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Orientações Adicionais <span className="text-xs text-muted-foreground">(opcional)</span></FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ex: Ênfase na palavra 'PROMOÇÃO', tom mais animado no final, etc."
                            className="min-h-[80px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator className="my-6" />
                  <div className="p-4 border rounded-lg bg-muted/40 shadow-sm">
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
                     {(profile?.credits ?? 0) < estimatedCredits && estimatedCredits > 0 && (
                      <p className="text-sm mt-3 text-destructive text-center">
                        Você não possui créditos suficientes ({profile?.credits ?? 0}). <Button variant="link" size="sm" className="p-0 h-auto text-destructive" onClick={() => navigate('/cliente/creditos')}>Adquirir mais.</Button>
                      </p>
                    )}
                  </div>
                </div>
              )}
               {currentStep === 3 && !selectedLocutor && (
                <div className="text-center py-8">
                    <p className="text-lg text-destructive mb-4">Locutor não selecionado.</p>
                    <Button variant="outline" onClick={() => setCurrentStep(2)}>Voltar para seleção de locutor</Button>
                </div>
               )}

              {/* Mensagens de feedback contextual no rodapé da Etapa 3, se necessário, fora do CardFooter principal */}
              {currentStep === 3 && selectedLocutor && (
                <div className="mt-4 space-y-1 text-right px-6 pb-4">
                  {(!(getValues("scriptText") || "").trim() || (getValues("scriptText") || "").trim().length < 10) && estimatedCredits > 0 && (
                     <p className="text-sm text-orange-600 dark:text-orange-500">
                      O roteiro deve ter pelo menos 10 caracteres.
                    </p>
                  )}
                  {estimatedCredits > (profile?.credits ?? 0) && (getValues("scriptText") || "").trim().length >= 10 && (
                    <p className="text-sm text-destructive">
                      Você não possui créditos suficientes para este pedido.
                    </p>
                  )}
                </div>
              )}

            </CardContent>
            <CardFooter className="flex justify-between items-center border-t pt-6">
              <div>
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={handlePreviousStep} disabled={isSubmitting}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {currentStep < 3 && (
                  <Button 
                    type="button" 
                    onClick={handleNextStep} 
                    disabled={
                      isSubmitting ||
                      (currentStep === 1 && !watchedTipoAudio) ||
                      (currentStep === 2 && (!watchedLocutorId || locutores.length === 0))
                    }
                  >
                    Avançar
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {currentStep === 3 && (
                  <Button
                    type="submit"
                    size="lg"
                    disabled={
                        isSubmitting || 
                        !isFormValid ||
                        !selectedLocutor || 
                        estimatedCredits === 0 ||
                        (profile?.credits ?? 0) < estimatedCredits
                    }
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-5 w-5" />
                    )}
                    {isEditMode ? `Enviar Alteração (${estimatedCredits} créditos)` : `Enviar Pedido (${estimatedCredits} créditos)`}
                  </Button>
                )}
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

// Ícone de Check para o indicador de etapas
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default GravarLocucaoPage; 