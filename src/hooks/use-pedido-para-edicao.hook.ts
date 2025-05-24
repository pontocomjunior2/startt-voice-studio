import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Corrigir import do supabase para '@/lib/supabaseClient'
import type { Pedido, Locutor } from '@/types'; // Presume-se que este caminho está correto

// Interface para os dados do pedido completo com locutor, para edição
export interface PedidoParaEdicao extends Pedido {
  user_id: string;
  locutores: Locutor; // Supabase aninha o locutor aqui se a query estiver correta
}

export interface UsePedidoParaEdicaoResult {
  pedido: PedidoParaEdicao | null;
  isLoading: boolean;
  error: string | null;
  isAllowedToEdit: boolean;
}

export const usePedidoParaEdicao = (pedidoId: string | null | undefined, userId: string | null | undefined): UsePedidoParaEdicaoResult => {
  const [pedido, setPedido] = useState<PedidoParaEdicao | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAllowedToEdit, setIsAllowedToEdit] = useState(false);

  useEffect(() => {
    if (!pedidoId) {
      setIsLoading(false);
      // Não é mais responsabilidade do hook setar isEditMode
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

        if (pedidoCompleto.user_id !== userId) {
          setError("Você não tem permissão para editar este pedido.");
          setIsAllowedToEdit(false);
        } else if (String(pedidoCompleto.status) !== 'PENDENTE') {
          setError(`Este pedido não pode mais ser editado (status: ${pedidoCompleto.status}). Somente pedidos PENDENTES são editáveis.`);
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
  }, [pedidoId, userId]);

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