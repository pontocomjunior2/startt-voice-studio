import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client'; // Presume-se que este caminho está correto
import type { Pedido, Locutor } from '@/types'; // Presume-se que este caminho está correto
import { useUser } from '@clerk/nextjs'; // Presume-se que este é o hook de autenticação

// Interface para os dados do pedido completo com locutor, para edição
export interface PedidoParaEdicao extends Pedido {
  locutores: Locutor; // Supabase aninha o locutor aqui se a query estiver correta
}

export interface UsePedidoParaEdicaoResult {
  pedido: PedidoParaEdicao | null;
  isLoading: boolean;
  error: string | null;
  isAllowedToEdit: boolean;
}

export const usePedidoParaEdicao = (pedidoId: string | null | undefined): UsePedidoParaEdicaoResult => {
  const [pedido, setPedido] = useState<PedidoParaEdicao | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAllowedToEdit, setIsAllowedToEdit] = useState(false);
  const { user, isSignedIn } = useUser(); // isSignedIn pode ser útil para verificar o estado de autenticação

  useEffect(() => {
    if (!pedidoId) {
      setIsLoading(false);
      // Não é mais responsabilidade do hook setar isEditMode
      return;
    }

    // Se temos um pedidoId, mas o usuário não está logado (após a verificação inicial do useUser)
    // ou se o estado do usuário ainda não está definido (isSignedIn === undefined/false e user === null)
    // podemos tratar como um estado de carregamento ou erro leve até que o user esteja definido.
    if (isSignedIn === false || !user) {
       // Se isSignedIn for explicitamente false, o usuário não está logado.
       // Se user for null e isSignedIn não for true, também indica que não podemos prosseguir.
      if (isSignedIn === false) {
        setError("Usuário não autenticado para carregar o pedido.");
      }
      setIsLoading(false);
      return;
    }
    
    const fetchPedido = async () => {
      setIsLoading(true);
      setError(null);
      setPedido(null);
      setIsAllowedToEdit(false);

      try {
        const { data: pedidoData, error: pedidoError } = await supabase
          .from('pedidos')
          .select(
            `*,
            locutores (
              id,
              nome_artistico,
              genero,
              tom_voz,
              estilos_locucao,
              idiomas_falados,
              amostra_audio_url
            )`
          )
          .eq('id', pedidoId)
          .single();

        if (pedidoError) {
          console.error('Erro Supabase ao buscar pedido:', pedidoError);
          throw new Error(`Erro ao buscar pedido: ${pedidoError.message}`);
        }
        if (!pedidoData) {
          throw new Error("Pedido não encontrado.");
        }

        if (!pedidoData.locutores || Array.isArray(pedidoData.locutores)) {
            console.error('Dados do locutor ausentes ou em formato inesperado:', pedidoData.locutores);
            throw new Error("Dados do locutor inválidos ou não encontrados para este pedido.");
        }
        
        const pedidoCompleto = pedidoData as PedidoParaEdicao;

        if (pedidoCompleto.user_id !== user.id) {
          setError("Você não tem permissão para editar este pedido.");
          setIsAllowedToEdit(false);
        } else if (pedidoCompleto.status_pedido !== 'PENDENTE') {
          setError(`Este pedido não pode mais ser editado (status: ${pedidoCompleto.status_pedido}). Somente pedidos PENDENTES são editáveis.`);
          setIsAllowedToEdit(false);
        } else {
          setPedido(pedidoCompleto);
          setIsAllowedToEdit(true);
        }
      } catch (e: any) {
        console.error("Falha ao buscar pedido para edição:", e);
        setError(e.message || "Ocorreu um erro desconhecido ao buscar os dados do pedido para edição.");
        setPedido(null);
        setIsAllowedToEdit(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPedido();
  }, [pedidoId, user, isSignedIn]); // Adicionado isSignedIn às dependências

  return { pedido, isLoading, error, isAllowedToEdit };
};

// Função auxiliar para ser usada no componente para determinar se está em modo de edição
// Não faz parte do hook em si, mas pode ser exportada do mesmo arquivo se conveniente.
// Ou pode ser lógica dentro do useEffect do componente.
// const determineEditMode = (pedidoId: string | null | undefined): boolean => !!pedidoId;

// Adicionei um setIsEditMode(false) no início do useEffect quando não há pedidoId.
// A lógica de setIsEditMode(true) deve ser gerenciada no componente `GravarLocucaoPage.tsx`
// com base na presença de `editingPedidoIdParam`.
// Removi a tentativa de chamar setIsEditMode de dentro do hook, pois ele não deve controlar estados da UI do componente dessa forma. 