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
import { PlayCircle, Send, Loader2, UserCircle, Users, ChevronLeft, ChevronRight, Heart, Filter, Star, AlertTriangle, FileAudio, XCircle } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDropzone } from 'react-dropzone';

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function GravarLocucaoPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Lógica de pré-seleção e edição
  const editingPedidoIdParam = searchParams.get('pedidoId');
  const locutorIdParam = searchParams.get('locutorId');
  // console.log('[GravarLocucaoPage] locutorIdParam da URL:', locutorIdParam);
  // console.log('[GravarLocucaoPage] editingPedidoIdParam da URL:', editingPedidoIdParam);

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
  const [isEditMode, setIsEditMode] = useState(!!editingPedidoIdParam);
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(editingPedidoIdParam);
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

  const { control, handleSubmit, setValue, reset, formState: { isSubmitting, isValid: isFormValid, errors }, watch, trigger, getValues, setError: setFormError } = formHook;

  // Definição das funções com useCallback ANTES dos useEffects que dependem delas
  const fetchLocutores = useCallback(async () => {
    if (!user) {
      setLocutores([]);
      setLoadingLocutores(false);
      setIdsLocutoresFavoritos([]);
      return;
    }
    setLoadingLocutores(true);
    setErrorLocutores(null);
    try {
      const { data: locutoresData, error: locutoresError } = await supabase
        .from('locutores')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (locutoresError) throw locutoresError;
      // Buscar demos para cada locutor
      const locutoresComDemos = await Promise.all((locutoresData || []).map(async (locutor) => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/locutor/${locutor.id}/demos`);
          if (!res.ok) return { ...locutor, demos: [] };
          const json = await res.json();
          return { ...locutor, demos: json.demos || [] } as Locutor & { demos: { url: string; estilo?: string }[] };
        } catch (e) {
          return { ...locutor, demos: [] } as Locutor & { demos: { url: string; estilo?: string }[] };
        }
      }));
      setLocutores(locutoresComDemos);

      if (user.id) {
        const { data: favoritosData, error: favoritosError } = await supabase
          .from('locutores_favoritos')
          .select('locutor_id')
          .eq('user_id', user.id);

        if (favoritosError) {
          // console.error("Erro ao buscar locutores favoritos:", favoritosError);
        } else {
          setIdsLocutoresFavoritos(favoritosData?.map(f => f.locutor_id) || []);
        }
      }

    } catch (error) {
      // console.error('Erro ao buscar locutores e/ou favoritos:', error);
      setErrorLocutores('Não foi possível carregar os locutores. Tente novamente mais tarde.');
      setLocutores([]);
      setIdsLocutoresFavoritos([]);
    } finally {
      setLoadingLocutores(false);
    }
  }, [user, supabase]);

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
        const locutorDoPedido = pedidoData.locutores as unknown as Locutor;
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

  const watchedTipoAudio = watch("tipoAudio");
  const watchedLocutorId = watch("locutorId");
  const watchedEstiloLocucao = watch("estiloLocucao");
  const watchedScriptText = watch("scriptText");

  // Efeito para carregar dados para edição OU aplicar pré-seleção
  useEffect(() => {
    // console.log('[GravarLocucaoPage] useEffect principal - isEditMode State:', isEditMode, 'preSelectedLocutorId State:', preSelectedLocutorId, 'Locutores Carregados:', locutores.length, 'Etapa Atual:', currentStep);
    if (isEditMode && editingPedidoId) {
      // console.log('[GravarLocucaoPage] Modo Edição ATIVO, buscando pedido:', editingPedidoId);
      if (!loadingPedidoParaEdicao && (!getValues("tituloPedido") || searchParams.get('pedidoId') !== editingPedidoId)) {
         fetchPedidoParaEdicao(editingPedidoId);
      }
    } else if (preSelectedLocutorId && !isEditMode) {
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
            // console.log('[GravarLocucaoPage] Locutor pré-selecionado definido no estado selectedLocutor:', locutor.nome);
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
    } else if (!isEditMode && !preSelectedLocutorId) {
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
  }, [isEditMode, editingPedidoId, preSelectedLocutorId, locutores, currentStep, searchParams, loadingPedidoParaEdicao, fetchPedidoParaEdicao, getValues, setValue, reset, setSelectedLocutor]);

  // Calcular locutores para a página atual - RESTAURADO AQUI
  const indexOfLastLocutor = currentPageLocutores * LOCUTORES_PER_PAGE;
  const indexOfFirstLocutor = indexOfLastLocutor - LOCUTORES_PER_PAGE;
  // currentLocutoresToDisplay é calculado depois, com base nos locutores filtrados.
  const totalLocutoresPages = Math.ceil(locutores.length / LOCUTORES_PER_PAGE); // Baseado no total de locutores, não filtrados ainda.

  // Este useEffect deve vir DEPOIS da definição de fetchLocutores
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
    // console.log('[GravarLocucaoPage] onSubmitForm - Valores recebidos:', values);
    // console.log('[GravarLocucaoPage] onSubmitForm - Locutor selecionado (estado):', selectedLocutor);
    // console.log('[GravarLocucaoPage] onSubmitForm - Locutor ID do formulário (getValues):', getValues('locutorId'));
    // console.log('[GravarLocucaoPage] onSubmitForm - Profile:', profile);
    // console.log('[GravarLocucaoPage] onSubmitForm - User:', user);
    if (!user || !profile) {
      toast.error("Erro de Autenticação", { description: "Usuário não autenticado. Faça login novamente." });
      return;
    }

    // Nova lógica de validação e obtenção do locutor para submissão
    const locutorIdFromForm = values.locutorId;
    if (!locutorIdFromForm) {
      toast.error("Erro de Validação", { description: "Nenhum locutor selecionado no formulário. Volte para a Etapa 2 e selecione um." });
      setCurrentStep(2); 
      return;
    }

    const locutorParaSubmissao = locutores.find(l => l.id === locutorIdFromForm);
    if (!locutorParaSubmissao) {
      toast.error("Erro de Validação", { description: "O locutor selecionado no formulário é inválido. Volte para a Etapa 2 e selecione um válido." });
      setValue("locutorId", "", { shouldValidate: true, shouldTouch: true }); // Limpa o campo inválido
      setSelectedLocutor(null); // Limpa também o estado React para consistência da UI
      setCurrentStep(2);
      return;
    }
    
    // Se chegou aqui, locutorParaSubmissao contém os dados do locutor válidos baseados no formulário.
    // Para garantir que a UI (como o resumo do locutor na Etapa 3) e o estado geral estejam consistentes,
    // podemos atualizar o estado selectedLocutor, embora a lógica de submissão usará locutorParaSubmissao.
    if (!selectedLocutor || selectedLocutor.id !== locutorParaSubmissao.id) {
        // Isso é mais uma sincronização para a UI, caso estivesse dessincronizada.
        // A lógica de submissão usará locutorParaSubmissao diretamente.
        setSelectedLocutor(locutorParaSubmissao);
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
        pedidoId: editingPedidoId,
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
        if (!isEditMode && (profile.saldoCalculadoCreditos ?? 0) < estimatedCredits) {
          toast.error("Créditos Insuficientes", { description: `Você precisa de ${estimatedCredits} créditos, mas seu saldo válido é de ${profile.saldoCalculadoCreditos ?? 0}.` });
          return;
        }
        if (!isEditMode && estimatedCredits === 0 && values.scriptText && values.scriptText.trim().length > 0) {
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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload-guia`, {
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
  const getLocutorDemos = (locutor: Locutor): { url: string; estilo?: string }[] => {
    return Array.isArray((locutor as any).demos) ? (locutor as any).demos as { url: string; estilo?: string }[] : [];
  };

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
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold">Selecione o Locutor</h2>
                    <p className="text-muted-foreground">Escolha a voz para o seu projeto.</p>
                  </div>

                  {/* Controle de Filtro de Favoritos com Button */}
                  <div className="flex justify-start my-4"> {/* Ajustado para justify-start, pode ser center ou end conforme preferência */}
                    <Button
                      type="button"
                      variant={mostrarApenasFavoritos ? "secondary" : "outline"}
                      onClick={() => {
                        const novoEstadoFiltro = !mostrarApenasFavoritos;
                        setMostrarApenasFavoritos(novoEstadoFiltro);
                        setCurrentPageLocutores(1); // Resetar paginação

                        const locutorIdAtual = getValues("locutorId");
                        if (locutorIdAtual) {
                          if (novoEstadoFiltro && !idsLocutoresFavoritos.includes(locutorIdAtual)) {
                            setSelectedLocutor(null);
                            setValue("locutorId", "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                            // Se já estiver na etapa de seleção de locutor, acionar validação para mostrar erro se campo ficou vazio
                            if (currentStep === 2) {
                              trigger("locutorId"); 
                            }
                          }
                        }
                      }}
                      className="flex items-center gap-2 group"
                    >
                      {mostrarApenasFavoritos ? (
                        <Star className="h-4 w-4 text-startt-blue fill-startt-blue transition-all group-hover:scale-110" />
                      ) : (
                        <Filter className="h-4 w-4 text-muted-foreground transition-all group-hover:text-startt-blue" />
                      )}
                      <span>
                        {mostrarApenasFavoritos ? "Mostrando Favoritos" : "Locutores Favoritos"}
                      </span>
                    </Button>
                  </div>

                  {loadingLocutores && (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-startt-blue" />
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
                      {/* Lógica de filtragem */}
                      {(() => {
                        const locutoresFiltrados = mostrarApenasFavoritos
                          ? locutores.filter(locutor => idsLocutoresFavoritos.includes(locutor.id))
                          : locutores;
                        
                        const locutoresPaginados = locutoresFiltrados.slice(indexOfFirstLocutor, indexOfLastLocutor);
                        const totalPagesFiltradas = Math.ceil(locutoresFiltrados.length / LOCUTORES_PER_PAGE);

                        if (locutoresFiltrados.length === 0 && mostrarApenasFavoritos) {
                          return (
                            <div className="text-center py-10">
                              <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
                              <p className="mt-2 font-semibold">Nenhum favorito encontrado</p>
                              <p className="text-sm text-muted-foreground">Você ainda não favoritou nenhum locutor. Clique no coração para adicionar.</p>
                            </div>
                          );
                        }
                        
                        if (locutoresPaginados.length === 0 && locutoresFiltrados.length > 0) {
                           // Isso pode acontecer se o usuário estiver em uma página que não existe mais após filtrar
                           // Melhor resetar para a primeira página em vez de mostrar nada.
                           // A lógica de resetar currentPageLocutores no onCheckedChange já deve ajudar com isso.
                           // Mas para segurança, podemos forçar aqui se locutoresPaginados está vazio mas filtrados não.
                           // Contudo, a paginação deve ser baseada em totalPagesFiltradas.
                        }


                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {locutoresPaginados.map((locutor) => {
                                const isFavorito = idsLocutoresFavoritos.includes(locutor.id);
                                return (
                                  <Card
                                    key={locutor.id}
                                    // Removido onClick daqui para não conflitar com o botão de favoritar. A seleção será pelo radio/hidden input.
                                    className={cn(
                                      "relative cursor-pointer transition-all duration-200 ease-in-out transform hover:shadow-xl hover:-translate-y-1 focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2",
                                      watchedLocutorId === locutor.id && "ring-2 ring-amber-500 shadow-xl -translate-y-1",
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
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation(); // Evitar que o clique no coração selecione o card
                                            toggleFavorito(locutor.id, isFavorito);
                                        }}
                                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive z-10" // Adicionado z-10
                                        aria-label={isFavorito ? "Desfavoritar locutor" : "Favoritar locutor"}
                                    >
                                        <Heart
                                            className={cn("h-5 w-5 transition-colors", isFavorito ? "fill-destructive text-destructive" : "text-gray-400 hover:text-destructive/80")}
                                        />
                                    </Button>
                                    <CardContent 
                                      className="p-0 flex flex-col flex-grow"
                                      onClick={() => { // Adicionado onClick aqui para selecionar o locutor
                                        setSelectedLocutor(locutor);
                                        setValue("locutorId", locutor.id, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                                      }}
                                    >
                                      <CardHeader className="p-3 flex-shrink-0">
                                        <div className="flex items-center space-x-3">
                                          <Avatar className="h-12 w-12 border-2 border-muted bg-background">
                                            <AvatarImage src={locutor.avatar_url || undefined} alt={locutor.nome} />
                                            <AvatarFallback className="text-xs text-white bg-background">
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
                                        {locutor.demos && locutor.demos.length > 0 ? (
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-xs mt-auto"
                                                onClick={e => e.stopPropagation()}
                                              >
                                                <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                                                Ouvir Demos
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64 p-3 flex flex-col gap-3">
                                              {getLocutorDemos(locutor).map((demo, i) => (
                                                <div key={i} className="flex flex-col items-start">
                                                  <span className="text-xs font-semibold text-muted-foreground mb-1">{demo.estilo || 'Estilo'}</span>
                                                  <audio controls className="h-8 w-full" aria-label={`Demo de áudio estilo ${demo.estilo}`}>
                                                    <source src={demo.url} />
                                                    Seu navegador não suporta o elemento de áudio.
                                                  </audio>
                                                </div>
                                              ))}
                                            </PopoverContent>
                                          </Popover>
                                        ) : (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-xs mt-auto"
                                            disabled
                                          >
                                            <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                                            Sem Demo
                                          </Button>
                                        )}
                                      </CardContent>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                            {totalPagesFiltradas > 1 && (
                              <div className="flex justify-center items-center space-x-2 mt-6 pt-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setCurrentPageLocutores(prev => Math.max(prev - 1, 1))}
                                  disabled={currentPageLocutores === 1}
                                  aria-label="Página anterior de locutores"
                                >
                                  <ChevronLeft className="h-5 w-5" />
                                </Button>

                                {/* Container para os pontos */}
                                <div className="flex items-center space-x-1.5">
                                  {Array.from({ length: totalPagesFiltradas }, (_, i) => (
                                    <button
                                      key={i}
                                      onClick={() => setCurrentPageLocutores(i + 1)} // Navegação direta
                                      className={cn(
                                        "h-2 w-2 rounded-full transition-all duration-150 ease-in-out",
                                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2", // Estilo de foco melhorado
                                        currentPageLocutores === i + 1
                                          ? "bg-gradient-to-r from-startt-blue to-startt-purple scale-125 transform" // Ponto ativo: cor primária e um pouco maior
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
                                  onClick={() => setCurrentPageLocutores(prev => Math.min(prev + 1, totalPagesFiltradas))}
                                  disabled={currentPageLocutores === totalPagesFiltradas}
                                  aria-label="Próxima página de locutores"
                                >
                                  <ChevronRight className="h-5 w-5" />
                                </Button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                  <FormField 
                    control={control} 
                    name="locutorId" 
                    render={({ field }) => ( 
                      <FormItem>
                        <FormControl><Input type="hidden" {...field} /></FormControl>
                        {/* <FormMessage className="text-center pt-2" /> Removido para locutorId, coberto pelo Popover */}
                      </FormItem> 
                    )} 
                  />
                </div>
              )}

              {/* ETAPA 3: FORMULÁRIO DE TEXTO E DETALHES */}
              {currentStep === 3 && selectedLocutor && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="text-center mb-6 p-4 rounded-md bg-muted/30">
                    <h3 className="text-xl font-semibold">Detalhes do Áudio</h3>
                    <p className="text-sm text-muted-foreground">
                      Locutor: <span className="font-semibold text-startt-blue">{selectedLocutor.nome}</span> | Tipo: <span className="font-semibold text-startt-blue">{getValues("tipoAudio") === "off" ? "Áudio em OFF" : "Áudio Produzido"}</span>
                    </p>
                  </div>

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
                        <FormMessage /> {/* Restaurado para Etapa 3 */}
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
                          <FormControl><Input placeholder="Descreva o estilo aqui" {...field} onBlur={() => trigger("outroEstiloEspecificacao")} /></FormControl>
                          <FormMessage /> {/* Restaurado para Etapa 3 */}
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
                          />
                        </FormControl>
                        <FormMessage /> {/* Restaurado para Etapa 3 */}
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
                            onBlur={() => trigger("orientacoes")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Áudio Guia */}
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
                            <p className="text-sm text-muted-foreground mb-1">Créditos Estimados:</p>
                            <p className="text-3xl font-bold text-foreground tabular-nums">
                            {estimatedCredits}
                            </p>
                        </div>
                    </div>
                     {(profile?.credits ?? 0) < estimatedCredits && estimatedCredits > 0 && (
                      <p className="text-sm mt-3 text-destructive text-center">
                        Você não tem créditos suficientes para este pedido.
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
                </div>
              )}

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
                                isSubmitting || 
                                !isFormValid ||
                                !selectedLocutor || 
                                estimatedCredits === 0 ||
                                (profile?.credits ?? 0) < estimatedCredits
                            }
                            className="bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90"
                          >
                            {isSubmitting ? (
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-5 w-5" />
                            )}
                            {isEditMode ? `Enviar Alteração (${estimatedCredits} créditos)` : `Enviar Pedido (${estimatedCredits} créditos)`}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {(!isFormValid && selectedLocutor && estimatedCredits > 0 && (profile?.credits ?? 0) >= estimatedCredits) && (
                        <TooltipContent side="top" align="center" className="bg-destructive text-destructive-foreground">
                          <p>Corrija os erros no formulário para enviar.</p>
                        </TooltipContent>
                      )}
                      {(estimatedCredits > 0 && (profile?.credits ?? 0) < estimatedCredits) && (
                         <TooltipContent side="top" align="center" className="bg-destructive text-destructive-foreground">
                          <p>Você não tem créditos suficientes para este pedido.</p>
                        </TooltipContent>
                      )}
                      {(estimatedCredits === 0 && (getValues("scriptText") || "").trim().length >= 10) && (
                        <TooltipContent side="top" align="center" className="bg-destructive text-destructive-foreground">
                          <p>Erro no cálculo de créditos. Verifique o roteiro.</p>
                        </TooltipContent>
                      )}
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