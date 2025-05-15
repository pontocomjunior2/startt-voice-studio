import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { usePedidoParaEdicao } from '@/hooks/use-pedido-para-edicao.hook';

export default function GravarLocucaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingPedidoIdParam = searchParams.get('pedidoId');

  const [isEditMode, setIsEditMode] = useState(!!editingPedidoIdParam);

  const {
    pedido: pedidoParaEdicao,
    isLoading: loadingPedidoParaEdicao,
    error: erroCarregamentoPedido,
    isAllowedToEdit,
  } = usePedidoParaEdicao(editingPedidoIdParam);

  const formHook = useForm<any>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: {
      nomeProjeto: '',
      textoLocucao: '',
    },
  });

  useEffect(() => {
    setIsEditMode(!!editingPedidoIdParam);
  }, [editingPedidoIdParam]);

  useEffect(() => {
    if (isEditMode) {
      if (!loadingPedidoParaEdicao) {
        if (erroCarregamentoPedido || !isAllowedToEdit) {
          toast.error(erroCarregamentoPedido || "Não é possível editar este pedido. Verifique as permissões ou o status do pedido.");
          router.push('/inicio/meus-audios');
        } else if (pedidoParaEdicao) {
          const formData = {
            nomeProjeto: pedidoParaEdicao.nome_projeto,
            textoLocucao: pedidoParaEdicao.texto_original,
            locutorId: pedidoParaEdicao.locutor_id,
            tipoServico: pedidoParaEdicao.tipo_servico,
            idioma: pedidoParaEdicao.idioma_locucao,
            estiloLocucao: pedidoParaEdicao.estilo_locucao,
            velocidadeLeitura: pedidoParaEdicao.velocidade_leitura,
            emocaoVoz: pedidoParaEdicao.emocao_voz,
            instrucoesAdicionais: pedidoParaEdicao.observacoes_cliente || '',
          };
          formHook.reset(formData);
          toast.success("Dados do pedido carregados para edição.");
        }
      }
    } else {
    }
  }, [
    isEditMode,
    loadingPedidoParaEdicao,
    pedidoParaEdicao,
    erroCarregamentoPedido,
    isAllowedToEdit,
    formHook,
    router,
  ]);

  const onSubmitForm = async (data: any) => {
    if (isEditMode && !pedidoParaEdicao) {
      toast.error("Erro: Tentando atualizar um pedido que não foi carregado.");
      return;
    }
    if (isEditMode && !isAllowedToEdit) {
      toast.error("Erro: Você não tem permissão para atualizar este pedido.");
      return;
    }

    console.log("Dados do formulário:", data);
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
    </div>
  );
} 