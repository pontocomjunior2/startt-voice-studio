import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { usePedidoParaEdicao } from '@/hooks/use-pedido-para-edicao.hook';
import { atualizarPedidoSchema as pedidoSchema } from '@/actions/pedido-actions';
import { useAuth } from '@/contexts/AuthContext';
import type { Locutor } from '@/types';

export default function GravarLocucaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingPedidoIdParam = searchParams.get('pedidoId');
  const locutorIdParam = searchParams.get('locutorId');
  const { profile } = useAuth();

  // Estados para controle da UI e lógica da página
  const [isEditMode, setIsEditMode] = useState(!!editingPedidoIdParam);
  const [currentStep, setCurrentStep] = useState(1);
  const [locutores, setLocutores] = useState<Locutor[]>([]);
  const [isLoadingLocutores, setIsLoadingLocutores] = useState(false);
  const [locutoresFavoritos, setLocutoresFavoritos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [stepValidated, setStepValidated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedLocutorObj, setSelectedLocutorObj] = useState<Locutor | null>(null);

  const initialSetupDone = useRef(false);

  const {
    pedido: pedidoParaEdicao,
    isLoading: loadingPedidoParaEdicao,
    error: erroCarregamentoPedido,
    isAllowedToEdit,
  } = usePedidoParaEdicao(editingPedidoIdParam);

  const formHook = useForm<PedidoFormData>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: {
      titulo: '',
      textoRoteiro: '',
      locutorId: '',
      tipoAudio: 'off',
      estiloLocucao: '',
      orientacoes: '',
      idioma: '',
      velocidadeLeitura: '',
      emocaoVoz: '',
      pedidoId: '',
    },
  });

  // useEffect para inicialização/setup do formulário (baseado nos parâmetros da URL)
  useEffect(() => {
    const currentLocutorIdBeforeReset = formHook.getValues('locutorId');
    console.log(
      '[GravarLocucaoPage] useEffect [URL_PARAMS_SETUP] STARTS',
      'EditMode Param:', editingPedidoIdParam,
      'Locutor Param:', locutorIdParam,
      'InitialSetupDone BEFORE logic:', initialSetupDone.current,
      'Current locutorId in form:', currentLocutorIdBeforeReset
    );

    setIsEditMode(!!editingPedidoIdParam);

    if (editingPedidoIdParam) {
      console.log('[GravarLocucaoPage] useEffect [URL_PARAMS_SETUP] - Modo Edição. Setting initialSetupDone = true.');
      initialSetupDone.current = true;
    } else if (locutorIdParam) {
      console.log('[GravarLocucaoPage] useEffect [URL_PARAMS_SETUP] - Novo pedido COM locutor da URL:', locutorIdParam, '. Setting initialSetupDone = true.');
      if (formHook.getValues('locutorId') !== locutorIdParam) { // Evitar reset desnecessário se já estiver correto
        console.log('[GravarLocucaoPage] Resetting form with locutorIdParam:', locutorIdParam);
        formHook.reset({
          ...formHook.getValues(),
          locutorId: locutorIdParam,
          pedidoId: '',
        });
      }
      initialSetupDone.current = true;
    } else {
      // Novo Pedido SEM Locutor Pré-selecionado pela URL
      console.log('[GravarLocucaoPage] useEffect [URL_PARAMS_SETUP] - Novo pedido SEM locutor da URL. Checking initialSetupDone.current...');
      if (!initialSetupDone.current) {
        console.log('[GravarLocucaoPage] useEffect [URL_PARAMS_SETUP] - InitialSetupDone is FALSE. WILL RESET FORM TOTALMENTE.');
        formHook.reset({
          titulo: '',
          textoRoteiro: '',
          locutorId: '', // Importante: locutorId é explicitamente limpo aqui
          tipoAudio: 'off',
          estiloLocucao: '',
          orientacoes: '',
          idioma: '',
          velocidadeLeitura: '',
          emocaoVoz: '',
          pedidoId: '',
        });
        initialSetupDone.current = true;
        console.log('[GravarLocucaoPage] useEffect [URL_PARAMS_SETUP] - FORM RESET DONE. initialSetupDone is NOW:', initialSetupDone.current);
      } else {
        console.log('[GravarLocucaoPage] useEffect [URL_PARAMS_SETUP] - InitialSetupDone is TRUE. NO RESET TOTAL. Current locutorId in form:', formHook.getValues('locutorId'));
      }
    }
    console.log('[GravarLocucaoPage] useEffect [URL_PARAMS_SETUP] ENDS. InitialSetupDone FINAL:', initialSetupDone.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPedidoIdParam, locutorIdParam]);

  // useEffect para lidar com dados de pedido para edição
  useEffect(() => {
    if (isEditMode && pedidoParaEdicao) {
      console.log('[GravarLocucaoPage] useEffect [EDIT_MODE_DATA] - Carregando dados do pedido para edição.', pedidoParaEdicao);
      const formData: PedidoFormData = {
        pedidoId: (pedidoParaEdicao as any).id_pedido || '',
        titulo: (pedidoParaEdicao as any).titulo || '',
        // ... (resto dos campos como antes)
        textoRoteiro: (pedidoParaEdicao as any).texto_roteiro || '',
        locutorId: (pedidoParaEdicao as any).id_locutor || '',
        tipoAudio: ((pedidoParaEdicao as any).tipo_audio === 'off' || (pedidoParaEdicao as any).tipo_audio === 'produzido') ? (pedidoParaEdicao as any).tipo_audio : 'off',
        idioma: (pedidoParaEdicao as any).idioma_locucao || '',
        estiloLocucao: (pedidoParaEdicao as any).estilo_locucao || '',
        velocidadeLeitura: (pedidoParaEdicao as any).velocidade_leitura || '',
        emocaoVoz: (pedidoParaEdicao as any).emocao_voz || '',
        orientacoes: (pedidoParaEdicao as any).observacoes_cliente || '',
      };
      formHook.reset(formData);
      // Potencialmente definir currentStep aqui se a edição deve começar em uma etapa específica
    }
  }, [isEditMode, pedidoParaEdicao, formHook.reset]);

  const onSubmitForm = async (data: PedidoFormData) => {
    if (isEditMode && !pedidoParaEdicao) {
      toast.error("Erro: Tentando atualizar um pedido que não foi carregado.");
      return;
    }
    if (isEditMode && !isAllowedToEdit) {
      toast.error("Erro: Você não tem permissão para atualizar este pedido.");
      return;
    }

    // **VERIFICAÇÃO DE CRÉDITOS ANTES DE SUBMETER**
    // Esta lógica seria implementada aqui ou na Server Action chamada.
    // const creditosNecessarios = calcularCreditosParaPedido(data); // Função hipotética
    // if (profile && profile.saldoCalculadoCreditos !== undefined && profile.saldoCalculadoCreditos < creditosNecessarios) {
    //   toast.error("Saldo Insuficiente", { 
    //     description: `Você precisa de ${creditosNecessarios} créditos, mas possui ${profile.saldoCalculadoCreditos}. Adicione mais créditos.` 
    //   });
    //   return;
    // }
    
    console.log("Dados do formulário a serem enviados:", data);
    toast.info("Lógica de submissão do formulário ainda não implementada.");
    // Aqui você chamaria a Server Action para criar ou atualizar o pedido.
    // Exemplo: const result = await criarOuAtualizarPedidoAction(data);
    // Tratar resultado...
  };

  if (isEditMode && loadingPedidoParaEdicao) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Carregando dados do pedido para edição...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1>NOVO TITULO GRANDE VISIVEL PARA TESTE CACHE VITE</h1>
      {/* TESTE CACHE 12345 */}
      <h1>{isEditMode ? 'Editar Pedido de Locução' : 'Novo Pedido de Locução'}</h1>
      <p>Modo: {isEditMode ? `Editando pedido ID: ${editingPedidoIdParam}` : "Criando novo pedido"}</p>
      {/* Aqui vai o restante do seu formulário e JSX */}
    </div>
  );
}

interface PedidoFormData {
  titulo?: string;
  textoRoteiro: string;
  locutorId: string;
  tipoAudio: 'off' | 'produzido';
  idioma?: string;
  estiloLocucao: string;
  velocidadeLeitura?: string;
  emocaoVoz?: string;
  orientacoes?: string;
  pedidoId: string;
} 