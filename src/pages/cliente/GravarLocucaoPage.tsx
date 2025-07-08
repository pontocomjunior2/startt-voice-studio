import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useGenerateAiAudio } from '@/hooks/mutations/use-generate-ai-audio.mutation.hook';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  UserCircle, Users, Heart, PlayCircle, ChevronLeft, ChevronRight, FileAudio, XCircle,
  Loader2, RefreshCw, Send, AlertTriangle, Star, Filter, User, Sparkles, Headphones, Download
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSpring, animated } from 'react-spring';
import { obterMensagemSucessoAleatoria } from '@/utils/messageUtils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PEDIDO_STATUS } from '@/types/pedido.type';
import { atualizarPedidoAction } from '@/actions/pedido-actions';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useFetchAllowedLocutores, type LocutorCatalogo } from '@/hooks/queries/use-fetch-allowed-locutores.hook';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import {
  VELOCIDADE_LOCUCAO,
  type VelocidadeLocucaoTipo,
  calcularTempoEstimadoSegundos,
  formatarSegundosParaMMSS,
} from "@/utils/locutionTimeUtils";
import { Badge } from '@/components/ui/badge';

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
  // console.log('[Zod superRefine] Data for validation:', JSON.stringify(data)); 

  // Validações para a Etapa 3 (após tipoAudio e locutorId serem preenchidos)
  if (data.tipoAudio && data.locutorId) {
    // console.log('[Zod superRefine] Condition for Step 3 met: tipoAudio AND locutorId are present.');
    
    if (data.tituloPedido === undefined || data.tituloPedido.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'O título do pedido deve ter pelo menos 3 caracteres.',
        path: ['tituloPedido'],
      });
    }
    if (data.estiloLocucao === undefined || data.estiloLocucao.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Por favor, selecione um estilo de locução.',
        path: ['estiloLocucao'],
      });
    }
    if (data.estiloLocucao === 'outro' && (data.outroEstiloEspecificacao === undefined || data.outroEstiloEspecificacao.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, especifique o estilo 'Outro'.",
        path: ['outroEstiloEspecificacao'],
      });
    }
    if (data.scriptText === undefined || data.scriptText.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'O roteiro deve ter pelo menos 10 caracteres.',
        path: ['scriptText'],
      });
    }
  } else {
    // console.log('[Zod superRefine] Condition for Step 3 NOT met. tipoAudio:', data.tipoAudio, 'locutorId:', data.locutorId);
  }
});

// const API_URL = import.meta.env.VITE_API_URL || '';

function GravarLocucaoPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: locutores = [], isLoading: loadingLocutores, isError: hasErrorLocutores, error: errorLocutores } = useFetchAllowedLocutores();

  // Lógica de pré-seleção e edição
  const editingPedidoIdParam = searchParams.get('pedidoId');
  const locutorIdParam = searchParams.get('locutorId');
  // console.log('[GravarLocucaoPage] locutorIdParam da URL:', locutorIdParam);
  // console.log('[GravarLocucaoPage] editingPedidoIdParam da URL:', editingPedidoIdParam);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedLocutor, setSelectedLocutor] = useState<LocutorCatalogo | null>(null);
  const [estimatedCredits, setEstimatedCredits] = useState(0);
  const [tempoEstimadoSegundos, setTempoEstimadoSegundos] = useState(0);
  const [velocidadeSelecionada, setVelocidadeSelecionada] = useState<VelocidadeLocucaoTipo>(VELOCIDADE_LOCUCAO.NORMAL);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Estados para modo de edição
  const [loadingPedidoParaEdicao, setLoadingPedidoParaEdicao] = useState(false);
  const [preSelectedLocutorId, setPreSelectedLocutorId] = useState<string | null>(null);
  // console.log('[GravarLocucaoPage] Estado preSelectedLocutorId inicial:', preSelectedLocutorId);

  // Estados para Favoritos
  const [idsLocutoresFavoritos, setIdsLocutoresFavoritos] = useState<string[]>([]);
  const [mostrarApenasFavoritos, setMostrarApenasFavoritos] = useState(false);

  // Estados para o Popover de aviso do botão Avançar
  const [isAdvanceBlockedPopoverOpen, setIsAdvanceBlockedPopoverOpen] = useState(false);
  const [popoverErrorMessage, setPopoverErrorMessage] = useState<string | null>(null);

  const { animatedSeconds } = useSpring({
    reset: true,
    from: { animatedSeconds: 0 },
    to: { animatedSeconds: tempoEstimadoSegundos },
    config: { duration: 500 },
  });

  const formHook = useForm<z.infer<typeof multiStepGravarLocucaoFormSchema>>({
    resolver: zodResolver(multiStepGravarLocucaoFormSchema),
    mode: 'all', 
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

  const { control, handleSubmit, setValue, reset, formState: { isSubmitting, errors }, watch, trigger, getValues, setError: setFormError } = formHook;

  const watchedScriptText = watch("scriptText");
  const watchedTipoAudio = watch("tipoAudio");

  const { mutate: generateAiAudio, isPending: isGeneratingAi } = useGenerateAiAudio();

  const [tipoGravacao, setTipoGravacao] = useState<'humana' | 'ia'>('humana');
  const [custoIa, setCustoIa] = useState(0);

  useEffect(() => {
    const currentScript = getValues("scriptText") || "";
    let newEstimatedCredits = 0;
    let newCustoIa = 0;

    if (tipoGravacao === 'humana') {
      const segundos = calcularTempoEstimadoSegundos(currentScript, velocidadeSelecionada);
      setTempoEstimadoSegundos(segundos);
      if (segundos > 0 || currentScript.trim() !== '') {
        const blocosDeCreditoBase = Math.max(1, Math.ceil(segundos / 40));
        newEstimatedCredits = watchedTipoAudio === 'produzido' ? blocosDeCreditoBase * 2 : blocosDeCreditoBase;
      }
    } else { // tipoGravacao === 'ia'
      newCustoIa = currentScript.trim().length;
    }

    setEstimatedCredits(newEstimatedCredits);
    setCustoIa(newCustoIa);
  }, [watchedScriptText, velocidadeSelecionada, tipoGravacao, watchedTipoAudio]);

  // Definição das funções com useCallback ANTES dos useEffects que dependem delas
  const fetchPedidoParaEdicao = useCallback(async (pedidoId: string) => {
    if (!user) {
      toast.error("Autenticação necessária", { description: "Faça login para editar seu pedido." });
      navigate("/login");
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
        .eq('user_id', user.id)
        .single();

      if (error || !pedidoData) {
        // console.error("Erro ao buscar pedido para edição:", error);
        toast.error("Erro ao Carregar Pedido", { description: "Não foi possível carregar os dados do pedido para edição. Verifique se o pedido existe e você tem permissão." });
        navigate("/cliente/meus-audios");
        return;
      }

      if (pedidoData.status !== PEDIDO_STATUS.PENDENTE) {
        toast.info("Edição Não Permitida", { description: `Este pedido não pode mais ser editado pois seu status é "${pedidoData.status}".` });
        navigate("/cliente/meus-audios");
        return;
      }

      let estiloLocucaoForm = pedidoData.estilo_locucao || '';
      let outroEstiloEspecificacaoForm = '';
      if (estiloLocucaoForm.startsWith('Outro: ')) {
        outroEstiloEspecificacaoForm = estiloLocucaoForm.substring('Outro: '.length);
        estiloLocucaoForm = 'outro';
      }

      reset({
        tipoAudio: pedidoData.tipo_audio as 'off' | 'produzido' | undefined,
        locutorId: pedidoData.locutor_id || '',
        tituloPedido: pedidoData.titulo || '',
        estiloLocucao: estiloLocucaoForm,
        outroEstiloEspecificacao: outroEstiloEspecificacaoForm,
        scriptText: pedidoData.texto_roteiro || '',
        orientacoes: pedidoData.orientacoes || '',
      });

      if (pedidoData.locutores) {
        const locutorDoPedido = pedidoData.locutores as unknown as LocutorCatalogo;
        if (locutorDoPedido && locutorDoPedido.id === pedidoData.locutor_id) {
          setSelectedLocutor(locutorDoPedido);
        }
      }
      
      toast.info("Modo de Edição", { description: `Editando pedido #${pedidoData.id.substring(0,8)}...` });

    } catch (err) {
      // console.error("Erro catastrófico ao buscar pedido para edição:", err);
      toast.error("Erro Crítico", { description: "Ocorreu um erro inesperado ao tentar carregar os dados do pedido." });
    } finally {
      setLoadingPedidoParaEdicao(false);
    }
  }, [user, supabase, navigate, reset, setSelectedLocutor, toast]);

  // useEffect para lidar com a pré-seleção de locutor via URL
  useEffect(() => {
    // console.log('[GravarLocucaoPage] useEffect [editingPedidoIdParam, locutorIdParam] - Modo Edição Param:', editingPedidoIdParam, 'Locutor Param:', locutorIdParam);
    if (!editingPedidoIdParam && locutorIdParam) {
      // console.log('[GravarLocucaoPage] Definindo preSelectedLocutorId para:', locutorIdParam);
      setPreSelectedLocutorId(locutorIdParam);
    } else if (editingPedidoIdParam) {
      // console.log('[GravarLocucaoPage] Modo edição, limpando preSelectedLocutorId se houver.');
      setPreSelectedLocutorId(null); 
    } else {
      // console.log('[GravarLocucaoPage] Sem modo edição e sem locutorIdParam, limpando preSelectedLocutorId.');
      setPreSelectedLocutorId(null);
    }
  }, [editingPedidoIdParam, locutorIdParam]);

  // Log para depurar erros do formulário
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      // console.log('[GravarLocucaoPage] Form errors:', errors);
    }
  }, [errors]);

  const watchedLocutorId = watch("locutorId");
  const watchedEstiloLocucao = watch("estiloLocucao");

  // Efeito para carregar dados para edição OU aplicar pré-seleção
  useEffect(() => {
    // console.log('[GravarLocucaoPage] useEffect principal - isEditMode State:', isEditMode, 'preSelectedLocutorId State:', preSelectedLocutorId, 'Locutores Carregados:', locutores.length, 'Etapa Atual:', currentStep);
    if (!!editingPedidoIdParam && editingPedidoIdParam) {
      // console.log('[GravarLocucaoPage] Modo Edição ATIVO, buscando pedido:', editingPedidoIdParam);
      if (!loadingPedidoParaEdicao && (!getValues("tituloPedido") || searchParams.get('pedidoId') !== editingPedidoIdParam)) {
         fetchPedidoParaEdicao(editingPedidoIdParam);
      }
    } else if (preSelectedLocutorId && !editingPedidoIdParam) {
      // console.log('[GravarLocucaoPage] Modo Novo Pedido com preSelectedLocutorId:', preSelectedLocutorId);
      
      const currentFormValues = getValues();
      if (currentFormValues.locutorId !== preSelectedLocutorId || currentFormValues.tituloPedido || currentFormValues.scriptText) {
        reset({
          ...currentFormValues,
          locutorId: preSelectedLocutorId, 
          tituloPedido: '',
          estiloLocucao: '',
          outroEstiloEspecificacao: '',
          scriptText: '',
          orientacoes: '',
        });
        // console.log('[GravarLocucaoPage] Formulário resetado/atualizado com preSelectedLocutorId:', preSelectedLocutorId);
      } else {
        if (currentFormValues.locutorId !== preSelectedLocutorId) {
            setValue('locutorId', preSelectedLocutorId, { shouldValidate: false, shouldDirty: true });
            // console.log('[GravarLocucaoPage] LocutorId setado no formulário via setValue para pré-seleção.');
        }
      }

      if (locutores.length > 0) {
        const locutor = locutores.find(l => l.id === preSelectedLocutorId);
        if (locutor) {
          if (selectedLocutor?.id !== locutor.id) {
            setSelectedLocutor(locutor);
            // console.log('[GravarLocucaoPage] Locutor pré-selecionado definido no estado selectedLocutor:', locutor.nome_artistico);
            if (currentStep === 1 && getValues("tipoAudio")) {
                // setCurrentStep(2); 
                // console.log('[GravarLocucaoPage] Tipo de áudio já existe, poderia avançar para etapa 2.');
            }
          }
        } else {
          // console.warn('[GravarLocucaoPage] ATENÇÃO: Locutor com ID pré-selecionado (', preSelectedLocutorId, ') NÃO encontrado na lista de locutores carregada. A pré-seleção pode não ser visível.');
          if(selectedLocutor?.id === preSelectedLocutorId) setSelectedLocutor(null); 
        }
      } else {
        // console.log('[GravarLocucaoPage] Lista de locutores ainda vazia ou não contém o ID. Aguardando carregamento/atualização para definir selectedLocutor.');
      }
    } else if (!editingPedidoIdParam && !preSelectedLocutorId) {
      // console.log('[GravarLocucaoPage] Modo Novo Pedido SEM pré-seleção.');
      const currentFormValues = getValues();

      // SÓ RESETAR SE ESTIVER NA PRIMEIRA ETAPA E O FORMULÁRIO TIVER ALGO QUE INDIQUE UM ESTADO "SUJO" DE UM PEDIDO ANTERIOR INCOMPLETO
      if (currentStep === 1 && (currentFormValues.locutorId || currentFormValues.tituloPedido || currentFormValues.scriptText || selectedLocutor)) {
        // console.log('[GravarLocucaoPage] Resetando formulário na ETAPA 1 para valores iniciais (novo pedido sem pré-seleção).');
        reset({ 
          tipoAudio: undefined,
          locutorId: '',
          tituloPedido: '',
          estiloLocucao: '',
          outroEstiloEspecificacao: '',
          scriptText: '',
          orientacoes: '',
        });
        setSelectedLocutor(null);
      } else if (currentStep > 1) {
        // console.log('[GravarLocucaoPage] Em Etapa > 1, não resetar formulário aqui. Locutor ID atual:', currentFormValues.locutorId);
      } else {
        // Etapa 1, mas formulário já está limpo ou em estado inicial. Não precisa resetar.
        // console.log('[GravarLocucaoPage] Etapa 1, formulário parece limpo, sem necessidade de reset explícito aqui.');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPedidoIdParam, preSelectedLocutorId, locutores, currentStep, searchParams, loadingPedidoParaEdicao, fetchPedidoParaEdicao, getValues, setValue, reset, setSelectedLocutor]);

  // Calcular locutores para a página atual - RESTAURADO AQUI
  const [currentPageLocutores, setCurrentPageLocutores] = useState(1);
  const LOCUTORES_PER_PAGE = 4;
  const indexOfLastLocutor = currentPageLocutores * LOCUTORES_PER_PAGE;
  const indexOfFirstLocutor = indexOfLastLocutor - LOCUTORES_PER_PAGE;
  // currentLocutoresToDisplay é calculado depois, com base nos locutores filtrados.
  
  useEffect(() => {
    const currentScript = getValues("scriptText") || "";
    
    if (tipoGravacao === 'humana') {
      const segundos = calcularTempoEstimadoSegundos(currentScript, velocidadeSelecionada);
      setTempoEstimadoSegundos(segundos);
      if (segundos === 0 && currentScript.trim() === '') {
        setEstimatedCredits(0);
        return;
      }
      const blocosDeCreditoBase = Math.max(1, Math.ceil(segundos / 40));
      const tipoAudio = getValues("tipoAudio");
      setEstimatedCredits(tipoAudio === 'produzido' ? blocosDeCreditoBase * 2 : blocosDeCreditoBase);
      setCustoIa(0);
    } else {
      const custo = currentScript.trim().length;
      setCustoIa(custo);
      setEstimatedCredits(0);
    }
  }, [watchedScriptText, velocidadeSelecionada, watch("tipoAudio"), getValues, tipoGravacao]);

  // Funções de navegação para paginação de locutores
  // Remover: const handleNextLocutoresPage = () => { ... }
  // Remover: const handlePreviousLocutoresPage = () => { ... }
  // Remover: const handlePlayPreview = (locutor: Locutor) => { ... }

  const toggleFavorito = async (locutorId: string, isFavoritoAtual: boolean) => {
    if (!user?.id) {
      toast.error("Erro de Autenticação", { description: "Você precisa estar logado para favoritar." });
      return;
    }

    if (isFavoritoAtual) {
      const { error } = await supabase
        .from('locutores_favoritos')
        .delete()
        .match({ user_id: user.id, locutor_id: locutorId });

      if (error) {
        toast.error("Erro ao Desfavoritar", { description: "Não foi possível remover o locutor dos favoritos." });
      } else {
        setIdsLocutoresFavoritos(prev => prev.filter(id => id !== locutorId));
        toast.success("Locutor Desfavoritado", { description: "Locutor removido dos seus favoritos." });
      }
    } else {
      const { error } = await supabase
        .from('locutores_favoritos')
        .insert({ user_id: user.id, locutor_id: locutorId });

      if (error) {
        if (error.code === '23505') { // Código de violação de chave única (já favorito)
          toast.info("Já Favoritado", { description: "Este locutor já estava nos seus favoritos." });
          if (!idsLocutoresFavoritos.includes(locutorId)) { // Garantir consistência do estado
             setIdsLocutoresFavoritos(prev => [...prev, locutorId]);
          }
        } else {
          toast.error("Erro ao Favoritar", { description: "Não foi possível adicionar o locutor aos favoritos." });
        }
      } else {
        setIdsLocutoresFavoritos(prev => [...prev, locutorId]);
        toast.success("Locutor Favoritado!", { description: "Locutor adicionado aos seus favoritos." });
      }
    }
  };

  const [audioGuiaFile, setAudioGuiaFile] = useState<File | null>(null);
  const [isUploadingGuia, setIsUploadingGuia] = useState(false);

  // Dropzone para Áudio Guia
  const onDropAudioGuia = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setAudioGuiaFile(acceptedFiles[0]);
    }
  }, []);
  const {
    getRootProps,
    getInputProps,
    isDragActive
  } = useDropzone({
    onDrop: onDropAudioGuia,
    accept: { 'audio/*': [] },
    multiple: false,
  });

  const onSubmitForm = async (values: z.infer<typeof multiStepGravarLocucaoFormSchema>) => {
    if (!user || !profile) {
      toast.error("Erro de Autenticação", { description: "Usuário não autenticado. Faça login novamente." });
      return;
    }
    
    if (tipoGravacao === 'ia') {
      if (!selectedLocutor || !selectedLocutor.ia_voice_id) {
        toast.error("Erro", { description: "Locutor habilitado para IA ou seu ID de voz não foi encontrado." });
        return;
      }
      
      generateAiAudio({
        texto_roteiro: values.scriptText || '',
        locutor_id: selectedLocutor.id,
        tituloPedido: values.tituloPedido || 'Pedido de IA',
        userId: user.id
      }, {
        onSuccess: () => {
          // A invalidação de queries já acontece no hook, então o refresh do profile aqui pode ser redundante, mas não prejudicial.
          refreshProfile(); 
          // Redireciona para a página de áudios após o sucesso
          navigate('/meus-audios');
        }
      });
      return; // Importante para não continuar com a lógica de gravação humana
    }

    // Lógica para gravação humana continua aqui...
    const locutorIdFromForm = values.locutorId;
    if (!locutorIdFromForm) {
      toast.error("Erro de Validação", { description: "Nenhum locutor selecionado no formulário. Volte para a Etapa 2 e selecione um." });
      setCurrentStep(2); 
      return;
    }

    const locutorParaSubmissao = locutores.find(l => l.id === locutorIdFromForm);
    if (!locutorParaSubmissao) {
      toast.error("Erro de Validação", { description: "O locutor selecionado no formulário é inválido. Volte para a Etapa 2 e selecione um válido." });
      setValue("locutorId", "", { shouldValidate: true, shouldTouch: true });
      setSelectedLocutor(null);
      setCurrentStep(2);
      return;
    }
    
    if (!selectedLocutor || selectedLocutor.id !== locutorParaSubmissao.id) {
        setSelectedLocutor(locutorParaSubmissao);
    }

    // Bloco de Validação para Gravação HUMANA
    if (tipoGravacao === 'humana' && !editingPedidoIdParam) {
      if ((profile?.saldo_gravacao ?? 0) < estimatedCredits) {
        toast.error("Créditos Insuficientes", { description: `Você precisa de ${estimatedCredits} créditos de gravação, mas seu saldo é de ${profile.saldo_gravacao ?? 0}.` });
        return;
      }
      if (estimatedCredits === 0) {
        if (values.scriptText && values.scriptText.trim().length > 0) {
        toast.error("Erro no Pedido", { description: "O roteiro parece válido, mas não foram calculados créditos. Verifique o texto." });
        return;
      }
        if (!values.scriptText || values.scriptText.trim().length < 10) {
        toast.error("Roteiro Inválido", { description: "O roteiro deve ter pelo menos 10 caracteres." });
        setFormError("scriptText", { type: "manual", message: "O roteiro deve ter pelo menos 10 caracteres." });
        return;
        }
      }
    }

    if (editingPedidoIdParam) {
      // Lógica para ATUALIZAR pedido
      // console.log("MODO EDIÇÃO - Atualizando pedido:", editingPedidoId, values);
      
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
        pedidoId: editingPedidoIdParam,
        titulo: values.tituloPedido || undefined, 
        tipoAudio: values.tipoAudio, 
        locutorId: locutorParaSubmissao.id, // USAR locutorParaSubmissao.id
        textoRoteiro: values.scriptText || '',
        estiloLocucao: estiloParaAction, 
        orientacoes: values.orientacoes || undefined,
      });

      // Tratar resultadoUpdate similar à exclusão e outras actions
      if (!resultadoUpdate) { // Checagem para o linter, embora next-safe-action deva sempre retornar um objeto
        // console.error('Resultado inesperado (undefined) da action de atualização.');
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
        // console.error("Estrutura de resultado inesperada da action de atualização:", resultadoUpdate);
        toast.error("Erro Desconhecido", { description: "Ocorreu um erro ao processar sua solicitação de atualização." });
      }
    } else {
      // Lógica para CRIAR novo pedido
      // Não precisamos mais gerar idPedidoSerialGerado aqui se a RPC ou trigger cuidam disso.

      try {
        // Validação de créditos continua importante antes de chamar a RPC
        if (!editingPedidoIdParam && (profile.saldo_gravacao ?? 0) < estimatedCredits) {
          toast.error("Créditos Insuficientes", { description: `Você precisa de ${estimatedCredits} créditos de gravação, mas seu saldo é de ${profile.saldo_gravacao ?? 0}.` });
          return;
        }
        if (!editingPedidoIdParam && estimatedCredits === 0 && values.scriptText && values.scriptText.trim().length > 0) {
          toast.error("Erro no Pedido", { description: "O roteiro parece válido, mas não foram calculados créditos. Verifique o texto." });
          return;
        }
        // Adicionei uma verificação para o tipo de áudio também, que é essencial para a RPC
        if (!values.tipoAudio) {
          toast.error("Erro de Validação", { description: "O tipo de áudio é obrigatório." });
          setCurrentStep(1); // Ou a etapa relevante para tipoAudio
          return;
        }

        let uploadedAudioGuiaUrl: string | null = null;
        if (audioGuiaFile) {
          setIsUploadingGuia(true);
          const uploadFormData = new FormData();
          uploadFormData.append('audioGuia', audioGuiaFile);
          try {
            const response = await fetch(`/api/upload-guia`, {
              method: 'POST',
              body: uploadFormData,
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao enviar áudio guia.' }));
              throw new Error(errorData.message || `Falha no upload do áudio guia: ${response.statusText}`);
            }
            const result = await response.json();
            if (result.success && result.filePath) {
              uploadedAudioGuiaUrl = result.filePath;
            } else {
              throw new Error(result.message || "Servidor não retornou o caminho do arquivo após upload do guia.");
            }
          } catch (uploadError: any) {
            console.error("Erro no upload do áudio guia:", uploadError);
            toast.error("Erro no Áudio Guia", { description: uploadError.message });
            setIsUploadingGuia(false);
            return;
          } finally {
            setIsUploadingGuia(false);
          }
        }

        const paramsRpc = {
          p_locutor_id: locutorParaSubmissao.id,
          p_texto_roteiro: values.scriptText || '',
          p_creditos_a_debitar: estimatedCredits,
          p_titulo: values.tituloPedido || '',
          p_tipo_audio: values.tipoAudio,
          p_estilo_locucao: values.estiloLocucao === 'outro' 
              ? `Outro: ${values.outroEstiloEspecificacao || ''}` 
              : values.estiloLocucao || '',
          p_orientacoes: values.orientacoes || '',
          p_velocidade_locucao: velocidadeSelecionada,
          p_tempo_estimado_segundos: tempoEstimadoSegundos,
          p_audio_guia_url: uploadedAudioGuiaUrl,
        };

        // console.log("[GravarLocucaoPage] Chamando RPC criar_pedido com params:", paramsRpc);
        const { data: rpcResultData, error: rpcError } = await supabase.rpc('criar_pedido_com_guia', paramsRpc);

        if (rpcError) {
          // console.error("[GravarLocucaoPage] Erro ao chamar RPC criar_pedido:", rpcError);
          toast.error("Erro ao Criar Pedido", { description: `Não foi possível processar seu pedido. Detalhes: ${rpcError.message}` });
          return;
        }

        // console.log("[GravarLocucaoPage] Resultado da RPC criar_pedido:", rpcResultData);

        if (rpcResultData && rpcResultData.status === 'error') {
          toast.error("Falha ao Criar Pedido", { description: rpcResultData.message || "Ocorreu um erro informado pelo servidor." });
          return;
        }

        if (rpcResultData && rpcResultData.status === 'success') {
          if (refreshProfile) refreshProfile(); // Atualiza o perfil (créditos) no AuthContext

          // A RPC retorna o UUID do novo pedido em 'pedido_id'.
          const idPedidoCriadoUUID = rpcResultData.pedido_id || 'ID não retornado';
          
          const mensagemSucessoAleatoria = obterMensagemSucessoAleatoria();
          toast.success("Pedido Enviado!", {
            description: `${mensagemSucessoAleatoria} Seu pedido (ID: ${idPedidoCriadoUUID.substring(0,8)}...) foi criado.`,
            duration: 7000,
          });
          reset(); // Limpa o formulário
          setCurrentStep(1); // Volta para a primeira etapa
          setSelectedLocutor(null);
          setEstimatedCredits(0);
          setAudioGuiaFile(null);
          navigate('/meus-audios');
        } else {
          // console.warn("[GravarLocucaoPage] Resposta inesperada da RPC criar_pedido:", rpcResultData);
          toast.error("Erro ao Criar Pedido", { description: "Resposta inesperada do servidor após criar o pedido." });
        }

      } catch (error: any) {
        // console.error("Erro ao criar pedido (catch geral):", error);
        toast.error("Erro Crítico ao Criar Pedido", { description: `Não foi possível criar seu pedido. Detalhes: ${error.message}` });
      }
    }
  };

  useEffect(() => {
    // console.log('[GravarLocucaoPage] Popover state changed:', isAdvanceBlockedPopoverOpen, popoverErrorMessage);
  }, [isAdvanceBlockedPopoverOpen, popoverErrorMessage]);

  const handleNextStep = async () => {
    // console.log('[handleNextStep] Called. Current step:', currentStep);
    let isValid = false;
    let errorMessageForPopover: string | null = null;

    if (currentStep === 1) {
      isValid = await trigger("tipoAudio");
      if (!getValues("tipoAudio")) {
        setFormError("tipoAudio", { type: "manual", message: "Selecione o tipo de áudio para prosseguir." });
        errorMessageForPopover = "Por favor, selecione o tipo de áudio.";
        isValid = false;
      }
    } else if (currentStep === 2) {
      // Para a Etapa 2, vamos validar locutorId. 
      // A chamada trigger("locutorId") é boa, mas a lógica principal de erro virá da nossa checagem manual.
      await trigger("locutorId"); // Aciona validação do Zod se houver, e atualiza formState
      const locId = getValues("locutorId");

      if (!locId) {
        setFormError("locutorId", { type: "manual", message: "Por favor, selecione um locutor." });
        errorMessageForPopover = "É necessário selecionar um locutor.";
        // setSelectedLocutor(null); // Já deve estar null ou será resetado se a validação falhar
        isValid = false;
      } else {
        const foundLocutor = locutores.find(l => l.id === locId);
        if (!foundLocutor) {
          setFormError("locutorId", { type: "manual", message: "Locutor selecionado é inválido." });
          errorMessageForPopover = "O locutor selecionado não foi encontrado.";
          isValid = false;
        } else {
          if (mostrarApenasFavoritos && !idsLocutoresFavoritos.includes(locId)) {
            setFormError("locutorId", { type: "manual", message: "Selecione um favorito ou desative o filtro." });
            errorMessageForPopover = "O locutor selecionado não está nos seus favoritos.";
            isValid = false;
          } else {
            setSelectedLocutor(foundLocutor); // Definir locutor selecionado APENAS se todas as validações passarem
            isValid = true;
          }
        }
      }
    }

    if (isValid) {
      // console.log('[handleNextStep] Step is valid, advancing.');
      setCurrentStep(prev => prev + 1);
      setIsAdvanceBlockedPopoverOpen(false); 
      setPopoverErrorMessage(null);
    } else if (errorMessageForPopover) {
      // console.log('[handleNextStep] Step is invalid. Setting popover error:', errorMessageForPopover);
      setPopoverErrorMessage(errorMessageForPopover);
      setIsAdvanceBlockedPopoverOpen(true);
    } else {
      // Se isValid é false, mas não temos uma errorMessageForPopover (ex: erro de Zod não manual)
      // Garantimos que o popover não fique aberto por um estado anterior.
      // console.log('[handleNextStep] Step is invalid (possibly Zod error), no specific popover message. Ensuring popover is closed.');
      setIsAdvanceBlockedPopoverOpen(false);
      setPopoverErrorMessage(null);
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Helper para demos do locutor (para evitar linter e problemas de tipagem)
  const getLocutorDemos = (locutor: LocutorCatalogo): { url: string; estilo?: string }[] => {
    return Array.isArray(locutor.demos) ? locutor.demos : [];
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  // [ESTADOS IA]
  const [iaDialogOpen, setIaDialogOpen] = useState(false);
  const [iaStep, setIaStep] = useState(0); // 0,1,2,3,4
  const [iaForm, setIaForm] = useState({
    // Etapa 1
    nomeProjetoIA: '',
    objetivoAudioIA: '',
    objetivoAudioOutroIA: '',
    publicoAlvoIA: '',
    // Etapa 2
    produtoTemaIA: '',
    beneficioPrincipalIA: '',
    pontosChaveIA: '',
    // Etapa 3
    estiloLocucaoIA: '',
    estiloLocucaoOutroIA: '',
    tomMensagemIA: '',
    duracaoAlvoIA: '',
    duracaoAlvoOutraIA: '',
    callToActionIA: '',
    // Etapa 4
    evitarIA: '',
    destacarIA: '',
    referenciasIA: '',
    infoAdicionalIA: '',
  });
  const [iaRoteiroGerado, setIaRoteiroGerado] = useState('');
  const [isGeneratingRoteiro, setIsGeneratingRoteiro] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);
  const [iaEditandoRoteiro, setIaEditandoRoteiro] = useState(false);
  const [ultimosInputsAssistenteIA, setUltimosInputsAssistenteIA] = useState<object | null>(null);
  const [roteiroSendoRegenerado, setRoteiroSendoRegenerado] = useState(false);

  const handleIaInput = (field: keyof typeof iaForm, value: string) => setIaForm(prev => ({ ...prev, [field]: value }));
  const handleIaNext = () => setIaStep(s => Math.min(s + 1, 3));
  const handleIaPrev = () => setIaStep(s => Math.max(s - 1, 0));
  const handleIaReset = () => {
    setIaStep(0);
    setIaForm({ nomeProjetoIA: '', objetivoAudioIA: '', objetivoAudioOutroIA: '', publicoAlvoIA: '', produtoTemaIA: '', beneficioPrincipalIA: '', pontosChaveIA: '', estiloLocucaoIA: '', estiloLocucaoOutroIA: '', tomMensagemIA: '', duracaoAlvoIA: '', duracaoAlvoOutraIA: '', callToActionIA: '', evitarIA: '', destacarIA: '', referenciasIA: '', infoAdicionalIA: '' });
    setIaRoteiroGerado('');
    setIaError(null);
    setIaEditandoRoteiro(false);
  };
  const handleIaSubmit = async () => {
    setIsGeneratingRoteiro(true);
    setIaError(null);
    try {
      const payload = { ...iaForm };
      const response = await fetch(`/api/gerar-roteiro-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success && data.roteiro) {
        setValue('scriptText', data.roteiro, { shouldValidate: true, shouldDirty: true });
        setValue('orientacoes', data.orientacoes || '', { shouldValidate: true, shouldDirty: true });
        setUltimosInputsAssistenteIA(payload);
        setIaDialogOpen(false);
        toast.success('Roteiro Gerado!', { description: 'Sugestões preenchidas. Revise o roteiro e as orientações.' });
        handleIaReset();
      } else {
        setIaError(data.error || 'Erro ao gerar roteiro.');
      }
    } catch (err: any) {
      setIaError('Erro ao conectar com a IA. Tente novamente.');
    } finally {
      setIsGeneratingRoteiro(false);
    }
  };
  const handleIaUsarRoteiro = () => {
    setValue('scriptText', iaRoteiroGerado, { shouldValidate: true, shouldDirty: true });
    setIaDialogOpen(false);
    handleIaReset();
  };
  const handleRegenerarRoteiro = async () => {
    if (!ultimosInputsAssistenteIA) {
      toast.info('Atenção', { description: 'Use o assistente para gerar o primeiro roteiro antes de regenerar.' });
      return;
    }
    setRoteiroSendoRegenerado(true);
    try {
      const response = await fetch(`/api/gerar-roteiro-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ultimosInputsAssistenteIA),
      });
      const data = await response.json();
      if (data.success && data.roteiro) {
        setValue('scriptText', data.roteiro, { shouldValidate: true, shouldDirty: true });
        setValue('orientacoes', data.orientacoes || '', { shouldValidate: true, shouldDirty: true });
        toast.success('Nova Versão Gerada!', { description: 'Sugestões preenchidas. Revise o roteiro e as orientações.' });
      } else {
        throw new Error(data.message || 'Não foi possível obter uma nova versão do roteiro.');
      }
    } catch (error: any) {
      toast.error('Erro ao Regenerar', { description: error.message });
    } finally {
      setRoteiroSendoRegenerado(false);
    }
  };

  // >>> ADICIONE ESTA LINHA AQUI <<<
  console.log('[DEBUG 2] ESTADO ATUAL DO LOCUTOR SELECIONADO:', selectedLocutor);

  const [filtroNome, setFiltroNome] = useState('');
  const [filtroEstilo, setFiltroEstilo] = useState('all');

  // Extrair estilos únicos a partir dos demos de todos os locutores
  const estilosUnicos = useMemo(() => {
    return Array.from(new Set(
      locutores.flatMap((l: LocutorCatalogo) => l.demos?.map(d => d.estilo).filter(Boolean) || [])
    ));
  }, [locutores]);

  const locutoresFiltrados: LocutorCatalogo[] = useMemo(() => {
    return locutores.filter((locutor: LocutorCatalogo) => {
      const nomeMatch = (locutor.nome_artistico || '').toLowerCase().includes(filtroNome.toLowerCase());
      const estiloMatch = filtroEstilo === 'all' || (locutor.demos?.some(d => d.estilo === filtroEstilo));
      return nomeMatch && estiloMatch;
    });
  }, [locutores, filtroNome, filtroEstilo]);

  // Função para selecionar locutor
  const handleSelectLocutor = (locutor: LocutorCatalogo) => {
    setSelectedLocutor(locutor);
    setValue('locutorId', locutor.id, { shouldValidate: true });
  };

  // Adicione no início do componente:
  const [modalAmostrasLocutorId, setModalAmostrasLocutorId] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState<HTMLAudioElement | null>(null);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <audio ref={audioPreviewRef} className="hidden" />
      
      <Card className="w-full max-w-3xl mx-auto shadow-xl border-none bg-card text-card-foreground">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent">Novo Áudio</CardTitle>
          <CardDescription className="text-lg text-startt-blue">
            Siga os passos para criar seu pedido.
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
                        currentStep === step ? "bg-gradient-to-r from-startt-blue to-startt-purple text-white border-startt-blue" : 
                        currentStep > step ? "bg-green-500 text-white border-green-600" : 
                        "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {currentStep > step ? <CheckIcon className="w-5 h-5" /> : step}
                    </div>
                    <span className={cn(
                      "text-xs mt-2",
                       currentStep === step ? "text-startt-blue font-semibold" : 
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
                                  "flex flex-col items-center justify-center p-8 rounded-lg transition-all duration-200 shadow-md bg-background text-foreground border-none",
                                  field.value === 'off' ? "bg-gradient-to-r from-startt-blue to-startt-purple text-white" : "",
                                  "hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-startt-blue/50",
                                  "disabled:opacity-50 disabled:cursor-not-allowed"
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
                                  "flex flex-col items-center justify-center p-8 rounded-lg transition-all duration-200 shadow-md bg-background text-foreground border-none",
                                  field.value === 'produzido' ? "bg-gradient-to-r from-startt-blue to-startt-purple text-white" : "",
                                  "hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-startt-blue/50",
                                  "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                              >
                                <Send className="mb-3 h-8 w-8" /> {/* Ícone pode ser melhorado */}
                                Áudio Produzido <span className="text-xs text-muted-foreground mt-1">(com trilha e efeitos)</span>
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        {/* <FormMessage className="text-center pt-2" /> Removido para tipoAudio, coberto pelo Popover */}
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* ETAPA 2: SELEÇÃO DE LOCUTOR */}
              {currentStep === 2 && (
                <div className="w-full max-w-2xl mx-auto">
                  {/* Filtros */}
                  <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
                    <div className="flex-1">
                      <Label htmlFor="filtro-nome">Buscar por nome</Label>
                      <Input
                        id="filtro-nome"
                        placeholder="Digite o nome do locutor..."
                        value={filtroNome}
                        onChange={e => setFiltroNome(e.target.value)}
                      />
                  </div>
                    <div className="flex-1">
                      <Label htmlFor="filtro-estilo">Filtrar por estilo</Label>
                      <Select value={filtroEstilo} onValueChange={setFiltroEstilo}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os estilos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {estilosUnicos.map(estilo => (
                            <SelectItem key={estilo} value={estilo}>{estilo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>
                    </div>
                  {/* Lista vertical de locutores filtrados */}
                  <div className="flex flex-col space-y-2">
                    {locutoresFiltrados.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">Nenhum locutor encontrado com os filtros selecionados.</div>
                  )}
                    {locutoresFiltrados.map(locutor => {
                      const estilos = Array.from(new Set(locutor.demos?.map(d => d.estilo).filter((e): e is string => Boolean(e))));
                      const estilosVisiveis = estilos.slice(0, 3);
                      const estilosExtras = estilos.length > 3 ? estilos.slice(3) : [];
                          return (
                        <Card key={locutor.id} className="flex flex-row items-center justify-between gap-2 px-3 py-2 min-h-[56px]">
                          <div className="flex items-center min-w-0 flex-1 gap-2">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={locutor.avatar_url || undefined} alt={locutor.nome_artistico || ''} />
                              <AvatarFallback className="text-base bg-gradient-to-r from-startt-blue to-startt-purple text-primary-foreground">
                                {(locutor.nome_artistico || 'L')?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate flex items-center gap-1 text-sm">
                                              {locutor.nome_artistico || 'Locutor'}
                                {locutor.ia_disponivel && (
                                  <span title="IA Instantânea disponível" aria-label="IA disponível" className="ml-1 text-yellow-500 text-base">✨</span>
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{locutor.bio || 'Voz profissional para seu projeto.'}</span>
                                          </div>
                                        </div>
                          <div className="flex flex-wrap gap-1 min-w-[120px] max-w-[160px] justify-center items-center">
                            {estilosVisiveis.length > 0 ? estilosVisiveis.map(estilo => (
                              <Badge key={estilo} variant="secondary" className="text-xs px-1.5 py-0.5">{estilo}</Badge>
                            )) : null}
                            {estilosExtras.length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 cursor-pointer">+{estilosExtras.length}</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="flex flex-col gap-1">
                                      {estilosExtras.map(estilo => (
                                        <span key={estilo}>{estilo}</span>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            </div>
                          <div className="flex gap-2 items-center">
                                <Button
                              type="button"
                                  variant="ghost"
                              size="sm"
                              onClick={() => setModalAmostrasLocutorId(locutor.id)}
                              aria-label={`Ouvir demos de ${locutor.nome_artistico}`}
                                >
                              <Headphones className="w-5 h-5 mr-1" /> Ouvir Demos
                                </Button>
                                <Button
                              type="button"
                              variant={selectedLocutor?.id === locutor.id ? "default" : "outline"}
                              onClick={e => { e.stopPropagation(); handleSelectLocutor(locutor); }}
                              aria-label={`Selecionar locutor ${locutor.nome_artistico}`}
                                >
                              {selectedLocutor?.id === locutor.id ? "Selecionado" : "Selecionar"}
                                </Button>
                              </div>
                          {/* Modal de demos */}
                          <Dialog open={modalAmostrasLocutorId === locutor.id} onOpenChange={open => {
                            if (!open) setModalAmostrasLocutorId(null);
                          }}>
                            <DialogContent className="max-w-lg w-full">
                              <DialogHeader>
                                <DialogTitle className="bg-clip-text text-transparent bg-gradient-to-r from-startt-blue to-startt-purple">
                                  Demos de {locutor.nome_artistico}
                                </DialogTitle>
                                <DialogDescription>
                                  {(locutor.demos || []).length > 0
                                    ? 'Ouça e baixe as diferentes demos de voz deste locutor.'
                                    : 'Nenhuma demo disponível para este locutor.'}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                {(locutor.demos || []).length > 0 ? (
                                  locutor.demos.map((demo, idx) => (
                                    <div key={demo.url} className="flex items-center gap-3">
                                      <span className="font-medium text-sm text-startt-blue min-w-[80px]">
                                        {demo.estilo || `Amostra ${idx + 1}`}
                                      </span>
                                      <audio
                                        controls
                                        className="w-full h-8"
                                        src={demo.url ?? ''}
                                        aria-label={`Amostra ${demo.estilo || idx + 1} de ${locutor.nome_artistico}`}
                                        onPlay={e => {
                                          const currentAudio = e.currentTarget;
                                          if (audioPlaying && audioPlaying !== currentAudio) {
                                            audioPlaying.pause();
                                          }
                                          setAudioPlaying(currentAudio);
                                        }}
                                      />
                                      <a
                                        href={demo.url ?? ''}
                                        download
                                        className="ml-2 text-muted-foreground hover:text-startt-purple"
                                        aria-label={`Baixar demo ${demo.estilo || idx + 1}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Download className="h-5 w-5" />
                                      </a>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-muted-foreground text-center py-4">Nenhuma demo disponível.</div>
                                )}
                              </div>
                              <DialogClose asChild>
                                <Button variant="secondary" className="mt-4 w-full">Fechar</Button>
                              </DialogClose>
                            </DialogContent>
                          </Dialog>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ETAPA 3: FORMULÁRIO DE TEXTO E DETALHES */}
              {currentStep === 3 && selectedLocutor && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="text-center mb-6 p-4 rounded-md bg-muted/30">
                    <h3 className="text-xl font-semibold">Detalhes do Áudio</h3>
                    <p className="text-sm text-muted-foreground">
                      Locutor: <span className="font-semibold text-startt-blue">{selectedLocutor.nome_artistico}</span> | Tipo: <span className="font-semibold text-startt-blue">{getValues("tipoAudio") === "off" ? "Áudio em OFF" : "Áudio Produzido"}</span>
                    </p>
                  </div>

                  {/* >>> Bloco de código inserido <<< */}
                  {selectedLocutor.ia_disponivel && (
                    <div className="p-4 border bg-card rounded-lg shadow-inner">
                      <Label className="text-base font-semibold text-foreground">Tipo de Gravação</Label>
                      <RadioGroup
                        value={tipoGravacao}
                        onValueChange={(value: 'humana' | 'ia') => setTipoGravacao(value)}
                        className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4"
                      >
                        <Label htmlFor="tipo-humana" className={cn("flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all", tipoGravacao === 'humana' ? 'border-primary bg-primary/10' : 'border-border')}>
                          <RadioGroupItem value="humana" id="tipo-humana" className="sr-only" />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex flex-col items-center gap-1" tabIndex={0}>
                                  <User className="h-6 w-6 mb-2" />
                                  <span className="font-bold">Gravação Humana</span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" sideOffset={8} className="bg-popover text-popover-foreground max-w-xs text-sm text-center shadow-lg border">
                                A interpretação e emoção de um artista profissional para o seu áudio. Ideal para comerciais, vídeos institucionais e projetos que exigem uma conexão genuína com o público.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Label htmlFor="tipo-ia" className={cn("flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all", tipoGravacao === 'ia' ? 'border-primary bg-primary/10' : 'border-border')}>
                          <RadioGroupItem value="ia" id="tipo-ia" className="sr-only" />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex flex-col items-center gap-1" tabIndex={0}>
                                  <Sparkles className="h-6 w-6 mb-2" />
                                  <span className="font-bold">✨ Gravar com IA</span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" sideOffset={8} className="bg-popover text-popover-foreground max-w-xs text-sm text-center shadow-lg border">
                                Entrega do áudio na hora gerado por nossa IA exclusiva e otimizada. Perfeito para testes de roteiro, vídeos para redes sociais e protótipos.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                      </RadioGroup>
                    </div>
                  )}

                  {/* O resto do formulário */}
                  <FormField
                    control={control}
                    name="tituloPedido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título do Pedido <span className="text-xs text-muted-foreground">(para sua identificação)</span></FormLabel>
                        <FormControl><Input placeholder="Ex: Spot Dia das Mães Varejão" {...field} onBlur={() => trigger("tituloPedido")} /></FormControl>
                        <FormMessage /> {/* Restaurado para Etapa 3 */}
                      </FormItem>
                    )}
                  />

                  {tipoGravacao === 'humana' && (
                    <FormField
                      control={control}
                      name="estiloLocucao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estilo de Locução</FormLabel>
                          <Select onValueChange={(value) => { field.onChange(value); trigger("estiloLocucao"); if (value !== 'outro') { trigger("outroEstiloEspecificacao"); } }} defaultValue={field.value}>
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
                  )}

                  {tipoGravacao === 'humana' && watchedEstiloLocucao === 'outro' && (
                    <FormField
                      control={control}
                      name="outroEstiloEspecificacao"
                      render={({ field }) => (
                        <FormItem className="animate-fadeIn">
                          <FormLabel>Especifique o Estilo "Outro"</FormLabel>
                          <FormControl><Input placeholder="Descreva o estilo aqui" {...field} onBlur={() => trigger("outroEstiloEspecificacao")} /></FormControl>
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
                          <span>Roteiro do Áudio</span>
                          <span className="text-xs text-muted-foreground">
                            {(getValues("scriptText") || "").split(/\s+/).filter(Boolean).length} palavras
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Digite ou cole aqui o texto para a locução..."
                            className="min-h-[150px] resize-y"
                            {...field}
                            onBlur={() => trigger("scriptText")}
                            onChange={e => {
                              field.onChange(e);
                              if (!e.target.value.trim()) setUltimosInputsAssistenteIA(null);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {currentStep === 3 && selectedLocutor && (
                    <div className="flex justify-end mt-2">
                      {ultimosInputsAssistenteIA === null ? (
                        <Button
                          type="button"
                          onClick={() => setIaDialogOpen(true)}
                          className="bg-gradient-to-r from-startt-blue to-startt-purple text-white font-semibold shadow-lg hover:opacity-90 px-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-startt-blue/70 transition-all"
                          tabIndex={0}
                          aria-label="Gerar roteiro com IA STARTT"
                        >
                          <Sparkles className="mr-2 h-4 w-4" /> Gerar Roteiro com IA STARTT
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleRegenerarRoteiro}
                          variant="outline"
                          disabled={roteiroSendoRegenerado}
                          className="border-startt-blue text-startt-blue hover:bg-startt-blue/10 hover:text-startt-blue font-semibold px-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-startt-blue/70 transition-all"
                          tabIndex={0}
                          aria-label="Tentar outra versão do roteiro com IA"
                        >
                          {roteiroSendoRegenerado ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                          Tentar Outra Versão (IA)
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {tipoGravacao === 'humana' && (
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
                  )}

                  {tipoGravacao === 'humana' && (
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
                              onBlur={() => trigger("orientacoes")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {tipoGravacao === 'humana' && (
                    <div className="my-6">
                      <Label htmlFor="audio-guia-dropzone" className="text-base font-semibold mb-2 block">
                        Áudio Guia (Opcional)
                      </Label>
                      <div
                        {...getRootProps()}
                        className={cn(
                          "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/70 transition-colors",
                          isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/30",
                          audioGuiaFile ? "border-green-500 bg-green-500/5" : ""
                        )}
                      >
                        <input {...getInputProps()} id="audio-guia-dropzone" />
                        {audioGuiaFile ? (
                          <div className="text-center">
                            <FileAudio className="mx-auto h-10 w-10 text-green-600 mb-2" />
                            <p className="font-medium text-sm">{audioGuiaFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(audioGuiaFile.size / 1024).toFixed(1)} KB</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 text-destructive hover:bg-destructive/10"
                              onClick={e => { e.stopPropagation(); setAudioGuiaFile(null); }}
                            >
                              <XCircle className="mr-1 h-4 w-4" /> Remover
                            </Button>
                          </div>
                        ) : isDragActive ? (
                          <div className="text-center text-startt-blue">
                            <FileAudio className="mx-auto h-10 w-10 mb-2 animate-bounce" />
                            <p className="font-medium">Solte o arquivo aqui...</p>
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <FileAudio className="mx-auto h-10 w-10 mb-2" />
                            <p className="font-medium">Arraste e solte um arquivo de áudio ou clique para selecionar</p>
                            <p className="text-xs">Formatos aceitos: mp3, wav, ogg, etc.</p>
                          </div>
                        )}
                      </div>
                      {isUploadingGuia && <p className="text-sm text-startt-blue mt-2 animate-pulse">Enviando áudio guia...</p>}
                    </div>
                  )}

                  <Separator className="my-6" />
                  <div className="p-4 rounded-lg bg-muted/40 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-around sm:items-center space-y-4 sm:space-y-0">
                        <div className='text-center sm:text-left px-2'>
                            <p className="text-sm text-muted-foreground mb-1">Tempo Estimado:</p>
                            <p className="text-3xl font-bold bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent tabular-nums">
                            <animated.span>
                                {animatedSeconds.to((val: number) => formatarSegundosParaMMSS(Math.round(val)))}
                            </animated.span>
                            </p>
                        </div>
                        <Separator orientation="vertical" className="hidden sm:block h-12 self-center bg-border/70" />
                        <div className='text-center sm:text-left px-2'>
                            <p className="text-sm text-muted-foreground mb-1">Custo Estimado:</p>
                            {tipoGravacao === 'humana' ? (
                              <p className="text-3xl font-bold text-foreground tabular-nums">
                                {estimatedCredits} <span className="text-lg">Créditos de Gravação</span>
                              </p>
                            ) : (
                              <p className="text-3xl font-bold text-foreground tabular-nums">
                                {(custoIa).toLocaleString('pt-BR')} <span className="text-lg">Créditos IA</span>
                              </p>
                            )}
                        </div>
                    </div>
                    {tipoGravacao === 'humana' && (profile?.saldo_gravacao ?? 0) < estimatedCredits && estimatedCredits > 0 && (
                      <div className="text-center mt-4 p-3 bg-destructive/10 rounded-md">
                        <p className="text-sm font-medium text-destructive">Você não tem créditos de gravação suficientes para este pedido.</p>
                        <Button type="button" onClick={() => navigate('/comprar-creditos')} className="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg hover:opacity-90" size="sm">Adicionar Créditos</Button>
                      </div>
                    )}
                    {tipoGravacao === 'ia' && (profile?.saldo_ia ?? 0) < custoIa && custoIa > 0 && (
                      <div className="text-center mt-4 p-3 bg-destructive/10 rounded-md">
                        <p className="text-sm font-medium text-destructive">Você não tem Créditos IA suficientes para este roteiro.</p>
                        <Button type="button" onClick={() => navigate('/comprar-creditos')} className="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg hover:opacity-90" size="sm">Adicionar Créditos</Button>
                      </div>
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
                </div>
              )}

              <Dialog open={iaDialogOpen} onOpenChange={open => { setIaDialogOpen(open); if (!open) handleIaReset(); }}>
                <DialogContent className="max-w-2xl w-full">
                  <DialogHeader>
                    <DialogTitle className="bg-clip-text text-transparent bg-gradient-to-r from-startt-blue to-startt-purple">Assistente de Roteiro IA STARTT</DialogTitle>
                    <DialogDescription>Responda algumas perguntas para nossa IA criar uma sugestão de roteiro.</DialogDescription>
                  </DialogHeader>
                  {iaStep < 4 && (
                    <div className="space-y-6">
                      {/* Etapa 1 */}
                      {iaStep === 0 && (
                        <>
                          <div>
                            <Label className="font-semibold">Nome do Projeto/Campanha (opcional)</Label>
                            <Input value={iaForm.nomeProjetoIA} onChange={e => handleIaInput('nomeProjetoIA', e.target.value)} placeholder="Ex: Lançamento Verão, Spot Institucional Dezembro" className="mt-1 text-foreground placeholder:text-muted-foreground" />
                          </div>
                          <div>
                            <Label className="font-semibold mt-4">Qual o principal objetivo deste áudio?</Label>
                            <Select value={iaForm.objetivoAudioIA} onValueChange={v => handleIaInput('objetivoAudioIA', v)}>
                              <SelectTrigger className="mt-1 text-foreground data-[placeholder]:text-muted-foreground"><SelectValue placeholder="Selecione o objetivo" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Aumentar vendas de um produto/serviço específico">Aumentar vendas de um produto/serviço específico</SelectItem>
                                <SelectItem value="Gerar leads / Captar contatos">Gerar leads / Captar contatos</SelectItem>
                                <SelectItem value="Fortalecer o reconhecimento da marca (Branding)">Fortalecer o reconhecimento da marca (Branding)</SelectItem>
                                <SelectItem value="Anunciar um evento, promoção ou novidade">Anunciar um evento, promoção ou novidade</SelectItem>
                                <SelectItem value="Educar ou informar o público sobre um tema">Educar ou informar o público sobre um tema</SelectItem>
                                <SelectItem value="Criar uma vinheta de identificação">Criar uma vinheta de identificação</SelectItem>
                                <SelectItem value="Mensagem institucional / Posicionamento">Mensagem institucional / Posicionamento</SelectItem>
                                <SelectItem value="Outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                            {iaForm.objetivoAudioIA === 'Outro' && (
                              <Input value={iaForm.objetivoAudioOutroIA} onChange={e => handleIaInput('objetivoAudioOutroIA', e.target.value)} placeholder="Especifique o objetivo:" className="mt-2 text-foreground placeholder:text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <Label className="font-semibold mt-4">Descreva seu público-alvo principal:</Label>
                            <Textarea value={iaForm.publicoAlvoIA} onChange={e => handleIaInput('publicoAlvoIA', e.target.value)} placeholder="Ex: Jovens adultos (18-25 anos) interessados em tecnologia e games; ou Mães (30-45 anos) buscando praticidade para o dia a dia." className="mt-1 text-foreground placeholder:text-muted-foreground" />
                          </div>
                        </>
                      )}
                      {/* Etapa 2 */}
                      {iaStep === 1 && (
                        <>
                          <div>
                            <Label className="font-semibold">Sobre o que é o áudio? (Detalhe o produto, serviço, evento ou tema)</Label>
                            <Textarea value={iaForm.produtoTemaIA} onChange={e => handleIaInput('produtoTemaIA', e.target.value)} placeholder="Ex: Nosso novo tênis de corrida 'Velocity X', super leve e com amortecimento responsivo. Ou: Evento de inauguração da loja no dia X às Y horas." className="mt-1 text-foreground placeholder:text-muted-foreground" />
                          </div>
                          <div>
                            <Label className="font-semibold mt-4">Qual o MAIOR benefício ou diferencial que você oferece?</Label>
                            <Input value={iaForm.beneficioPrincipalIA} onChange={e => handleIaInput('beneficioPrincipalIA', e.target.value)} placeholder="Ex: A única solução que economiza seu tempo; O melhor custo-benefício do mercado." className="mt-1 text-foreground placeholder:text-muted-foreground" />
                          </div>
                          <div>
                            <Label className="font-semibold mt-4">Informações que DEVEM constar no roteiro:</Label>
                            <Textarea value={iaForm.pontosChaveIA} onChange={e => handleIaInput('pontosChaveIA', e.target.value)} placeholder="Ex: Telefone: (XX)XXXX-XXXX, Site: www.exemplo.com, Oferta válida até DD/MM, Endereço: Rua X, 123." className="mt-1 text-foreground placeholder:text-muted-foreground" />
                          </div>
                        </>
                      )}
                      {/* Etapa 3 */}
                      {iaStep === 2 && (
                        <>
                          <div>
                            <Label className="font-semibold">Estilo de Locução (para a voz do locutor):</Label>
                            <Select value={iaForm.estiloLocucaoIA} onValueChange={v => handleIaInput('estiloLocucaoIA', v)}>
                              <SelectTrigger className="mt-1 text-foreground data-[placeholder]:text-muted-foreground"><SelectValue placeholder="Selecione o estilo de locução" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="padrao">Padrão</SelectItem>
                                <SelectItem value="impacto">Impacto</SelectItem>
                                <SelectItem value="jovem">Jovem</SelectItem>
                                <SelectItem value="varejo">Varejo</SelectItem>
                                <SelectItem value="institucional">Institucional</SelectItem>
                                <SelectItem value="up_festas">Up/Festas</SelectItem>
                                <SelectItem value="jornalistico">Jornalístico</SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                            {iaForm.estiloLocucaoIA === 'outro' && (
                              <Input value={iaForm.estiloLocucaoOutroIA || ''} onChange={e => handleIaInput('estiloLocucaoOutroIA', e.target.value)} placeholder="Especifique o estilo:" className="mt-2 text-foreground placeholder:text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <Label className="font-semibold mt-4">Tom da Mensagem (como o roteiro deve soar):</Label>
                            <Select value={iaForm.tomMensagemIA} onValueChange={v => handleIaInput('tomMensagemIA', v)}>
                              <SelectTrigger className="mt-1 text-foreground data-[placeholder]:text-muted-foreground"><SelectValue placeholder="Selecione o tom da mensagem" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Entusiasmado">Entusiasmado</SelectItem>
                                <SelectItem value="Confiante">Confiante</SelectItem>
                                <SelectItem value="Sério">Sério</SelectItem>
                                <SelectItem value="Informativo">Informativo</SelectItem>
                                <SelectItem value="Amigável">Amigável</SelectItem>
                                <SelectItem value="Divertido">Divertido</SelectItem>
                                <SelectItem value="Urgente">Urgente</SelectItem>
                                <SelectItem value="Inspirador">Inspirador</SelectItem>
                                <SelectItem value="Calmo">Calmo</SelectItem>
                                <SelectItem value="Sofisticado">Sofisticado</SelectItem>
                                <SelectItem value="Empático">Empático</SelectItem>
                                <SelectItem value="Direto">Direto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="font-semibold mt-4">Duração Alvo Aproximada:</Label>
                            <Select value={iaForm.duracaoAlvoIA} onValueChange={v => handleIaInput('duracaoAlvoIA', v)}>
                              <SelectTrigger className="mt-1 text-foreground data-[placeholder]:text-muted-foreground"><SelectValue placeholder="Selecione a duração" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Não importa">Não importa</SelectItem>
                                <SelectItem value="15 segundos">15 segundos</SelectItem>
                                <SelectItem value="30 segundos">30 segundos</SelectItem>
                                <SelectItem value="45 segundos">45 segundos</SelectItem>
                                <SelectItem value="60 segundos">60 segundos</SelectItem>
                                <SelectItem value="Outra">Outra (especificar)</SelectItem>
                              </SelectContent>
                            </Select>
                            {iaForm.duracaoAlvoIA === 'Outra' && (
                              <Input value={iaForm.duracaoAlvoOutraIA} onChange={e => handleIaInput('duracaoAlvoOutraIA', e.target.value)} placeholder="Especifique a duração:" className="mt-2 text-foreground placeholder:text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <Label className="font-semibold mt-4">O que você quer que o ouvinte FAÇA após ouvir?</Label>
                            <Input value={iaForm.callToActionIA} onChange={e => handleIaInput('callToActionIA', e.target.value)} placeholder="Ex: Acesse nosso site agora!; Ligue e agende!; Visite-nos!" className="mt-1 text-foreground placeholder:text-muted-foreground" />
                          </div>
                        </>
                      )}
                      {/* Etapa 4 */}
                      {iaStep === 3 && (
                        <>
                          <div>
                            <Label className="font-semibold">Palavras, frases ou abordagens a EVITAR (opcional):</Label>
                            <Textarea value={iaForm.evitarIA} onChange={e => handleIaInput('evitarIA', e.target.value)} placeholder="Ex: Não usar termos técnicos; evitar clichês; não mencionar concorrentes." className="mt-1 text-foreground placeholder:text-muted-foreground" />
                          </div>
                          <div>
                            <Label className="font-semibold mt-4">Slogan, URL ou contato a ser REPETIDO ou DESTACADO (opcional):</Label>
                            <Textarea value={iaForm.destacarIA} onChange={e => handleIaInput('destacarIA', e.target.value)} placeholder="Ex: www.suaempresa.com.br; Ligue: 0800-123-456; Slogan: Sua vida, nosso compromisso." className="mt-1 text-foreground placeholder:text-muted-foreground" />
                          </div>
                          <div>
                            <Label className="font-semibold mt-4">Referências de estilo que você gosta (opcional):</Label>
                            <Textarea value={iaForm.referenciasIA} onChange={e => handleIaInput('referenciasIA', e.target.value)} placeholder="Ex: Gosto do estilo do comercial X da marca Y; ou cole um link de exemplo." className="mt-1 text-foreground placeholder:text-muted-foreground" />
                          </div>
                          <div>
                            <Label className="font-semibold mt-4">Algo mais que a IA precise saber? (opcional)</Label>
                            <Textarea value={iaForm.infoAdicionalIA} onChange={e => handleIaInput('infoAdicionalIA', e.target.value)} placeholder="Conte aqui qualquer detalhe extra, contexto ou pedido especial." className="mt-1 text-foreground placeholder:text-muted-foreground" />
                          </div>
                        </>
                      )}
                      {iaError && <div className="text-destructive text-sm text-center mt-2">{iaError}</div>}
                    </div>
                  )}
                  {iaStep === 4 && (
                    <div className="space-y-4">
                      <Label className="font-semibold">Roteiro Gerado pela IA</Label>
                      <Textarea
                        value={iaRoteiroGerado}
                        onChange={e => iaEditandoRoteiro ? setIaRoteiroGerado(e.target.value) : undefined}
                        readOnly={!iaEditandoRoteiro}
                        className={cn("min-h-[180px] text-base text-foreground", iaEditandoRoteiro && "border-primary ring-2 ring-primary")}
                      />
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setIaEditandoRoteiro(e => !e)}>
                          {iaEditandoRoteiro ? 'Salvar Edição' : '✏️ Editar Roteiro'}
                        </Button>
                        <Button variant="outline" onClick={handleIaSubmit} disabled={isGeneratingRoteiro}>
                          🔄 Gerar Nova Versão
                        </Button>
                        <Button onClick={handleIaUsarRoteiro} className="bg-gradient-to-r from-startt-blue to-startt-purple text-white font-semibold shadow hover:opacity-90">
                          ✅ Usar este Roteiro
                        </Button>
                      </div>
                    </div>
                  )}
                  <DialogFooter className="mt-6">
                    {iaStep > 0 && iaStep < 4 && (
                      <Button variant="outline" onClick={handleIaPrev} disabled={isGeneratingRoteiro}>Anterior</Button>
                    )}
                    {iaStep < 3 && (
                      <Button onClick={handleIaNext} disabled={isGeneratingRoteiro ||
                        (iaStep === 0 && (!iaForm.objetivoAudioIA || !iaForm.publicoAlvoIA)) ||
                        (iaStep === 1 && (!iaForm.produtoTemaIA || !iaForm.beneficioPrincipalIA)) ||
                        (iaStep === 2 && (!iaForm.estiloLocucaoIA || !iaForm.tomMensagemIA || !iaForm.duracaoAlvoIA || !iaForm.callToActionIA))
                      }>
                        Próximo
                      </Button>
                    )}
                    {iaStep === 3 && (
                      <Button onClick={handleIaSubmit} disabled={isGeneratingRoteiro}>
                        {isGeneratingRoteiro ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : 'Gerar Roteiro'}
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </CardContent>
            <CardFooter className="flex justify-between items-center border-t pt-6">
              <TooltipProvider delayDuration={300}>
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
                    <Popover open={isAdvanceBlockedPopoverOpen} onOpenChange={setIsAdvanceBlockedPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          type="button" 
                          onClick={handleNextStep} 
                          disabled={isSubmitting}
                          className="bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90"
                        >
                          Avançar
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        side="top" 
                        align="center"
                        className="bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-gray-900 dark:text-gray-100 shadow-lg p-3 w-auto max-w-xs sm:max-w-sm animate-fadeIn"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="flex items-center">
                          <AlertTriangle className="h-5 w-5 mr-2 text-startt-blue flex-shrink-0" />
                          <p className="text-sm font-medium">{popoverErrorMessage}</p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  {currentStep === 3 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}> 
                          <Button
                            type="submit"
                            size="lg"
                            disabled={
                              isSubmitting || isGeneratingAi ||
                              // Validações explícitas que substituem isFormValid
                              !getValues("tituloPedido") ||
                              (getValues("tituloPedido") || '').trim().length < 3 ||
                              !getValues("estiloLocucao") ||
                              (getValues("estiloLocucao") === 'outro' && !(getValues("outroEstiloEspecificacao") || '').trim()) ||
                              !getValues("scriptText") ||
                              (getValues("scriptText") || '').trim().length < 10 ||
                              // Validações de Saldo
                                (tipoGravacao === 'humana' && (profile?.saldo_gravacao ?? 0) < estimatedCredits) ||
                              (tipoGravacao === 'ia' && (profile?.saldo_ia ?? 0) < custoIa)
                            }
                            className="bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90"
                          >
                            {(isSubmitting || isGeneratingAi) ? (
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-5 w-5" />
                            )}
                            {isSubmitting ? 'Enviando Pedido...' : (isGeneratingAi ? 'Gerando Áudio IA...' : 'Enviar Pedido')}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {!getValues("scriptText") || (getValues("scriptText") || '').trim().length < 10 ? (
                          <p>O roteiro deve ter pelo menos 10 caracteres.</p>
                        ) : !getValues("tituloPedido") || (getValues("tituloPedido") || '').trim().length < 3 ? (
                          <p>O título do pedido deve ter pelo menos 3 caracteres.</p>
                        ) : !getValues("estiloLocucao") ? (
                          <p>Por favor, selecione um estilo de locução.</p>
                        ) : getValues("estiloLocucao") === 'outro' && !(getValues("outroEstiloEspecificacao") || '').trim() ? (
                          <p>Por favor, especifique o estilo "Outro".</p>
                        ) : tipoGravacao === 'humana' && (profile?.saldo_gravacao ?? 0) < estimatedCredits ? (
                          <p>Créditos de gravação insuficientes.</p>
                        ) : tipoGravacao === 'ia' && (profile?.saldo_ia ?? 0) < custoIa ? (
                          <p>Créditos de IA insuficientes.</p>
                        ) : (
                          <p>Preencha todos os campos obrigatórios.</p>
                        )}
                        </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
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