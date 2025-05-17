import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { usePedidoParaEdicao } from '@/hooks/use-pedido-para-edicao.hook';
import { atualizarPedidoSchema as pedidoSchema } from '@/actions/pedido-actions';

export default function GravarLocucaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingPedidoIdParam = searchParams.get('pedidoId');
  const locutorIdParam = searchParams.get('locutorId');

  const [isEditMode, setIsEditMode] = useState(!!editingPedidoIdParam);
  const [preSelectedLocutorId, setPreSelectedLocutorId] = useState<string | null>(null);

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

  useEffect(() => {
    setIsEditMode(!!editingPedidoIdParam);
    if (!editingPedidoIdParam && locutorIdParam) {
      setPreSelectedLocutorId(locutorIdParam);
    } else {
      setPreSelectedLocutorId(null);
    }
  }, [editingPedidoIdParam, locutorIdParam]);

  useEffect(() => {
    if (isEditMode) {
      if (!loadingPedidoParaEdicao) {
        if (erroCarregamentoPedido || !isAllowedToEdit) {
          toast.error(erroCarregamentoPedido || "Não é possível editar este pedido. Verifique as permissões ou o status do pedido.");
          router.push('/inicio/meus-audios');
        } else if (pedidoParaEdicao) {
          const formData: PedidoFormData = {
            pedidoId: (pedidoParaEdicao as any).id_pedido || '',
            titulo: (pedidoParaEdicao as any).titulo || '',
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
          toast.success("Dados do pedido carregados para edição.");
        }
      }
    } else if (preSelectedLocutorId) {
      const newFormData = {
        titulo: '',
        textoRoteiro: '',
        locutorId: preSelectedLocutorId,
        tipoAudio: 'off' as 'off' | 'produzido',
        estiloLocucao: '',
        orientacoes: '',
        idioma: '',
        velocidadeLeitura: '',
        emocaoVoz: '',
        pedidoId: '',
      };
      formHook.reset(newFormData);
    } else {
      const initialFormData = {
        titulo: '',
        textoRoteiro: '',
        locutorId: '',
        tipoAudio: 'off' as 'off' | 'produzido',
        estiloLocucao: '',
        orientacoes: '',
        idioma: '',
        velocidadeLeitura: '',
        emocaoVoz: '',
        pedidoId: '',
      };
      formHook.reset(initialFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isEditMode,
    loadingPedidoParaEdicao,
    pedidoParaEdicao,
    erroCarregamentoPedido,
    isAllowedToEdit,
    formHook,
    router,
    preSelectedLocutorId,
  ]);

  const onSubmitForm = async (data: PedidoFormData) => {
    if (isEditMode && !pedidoParaEdicao) {
      toast.error("Erro: Tentando atualizar um pedido que não foi carregado.");
      return;
    }
    if (isEditMode && !isAllowedToEdit) {
      toast.error("Erro: Você não tem permissão para atualizar este pedido.");
      return;
    }
    // Lógica de submissão do formulário aqui
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