import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';

// Interface para os dados do dashboard, pode ser movida para um arquivo .type.ts se necessário
export interface AdminDashboardStats {
  activeclients: number; // Supabase RPCs tendem a retornar lowercase
  totalclientcredits: number;
  pendingorders: number;
  // Adicionar mais estatísticas se necessário, conforme o retorno da RPC
}

// Valor padrão para o estado inicial ou em caso de erro ao buscar dados
const defaultStats: AdminDashboardStats = {
  activeclients: 0,
  totalclientcredits: 0,
  pendingorders: 0,
};

const fetchAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');

  if (error) {
    console.error("Erro ao buscar estatísticas do dashboard via RPC:", error);
    toast.error("Erro ao Carregar Estatísticas", { 
      description: error.message || "Não foi possível carregar os dados do painel. Verifique a função RPC." 
    });
    // Em caso de erro, podemos optar por lançar o erro (React Query tratará)
    // ou retornar um estado padrão para a UI não quebrar completamente.
    // Lançar o erro é geralmente melhor para que isError e error sejam populados.
    throw new Error(error.message);
  }

  // A RPC pode retornar um array com um objeto, ou só o objeto.
  // Se for array, pegue o primeiro elemento.
  // Os nomes das colunas retornadas pela RPC devem ser lowercase por padrão no Postgres,
  // a menos que você use aspas duplas na definição da RPC (ex: SELECT count(*) AS "activeClients").
  // Ajuste os nomes aqui (activeclients vs activeClients) conforme o retorno real da sua RPC.
  const result = Array.isArray(data) ? data[0] : data;
  
  // DEBUG: Adicionando console.log para verificar o objeto 'result'
  console.log("[DEBUG] Resultado da RPC get_admin_dashboard_stats:", result);

  // Retorna os dados mapeados ou um estado padrão se 'result' for nulo/vazio
  return result ? 
    {
      activeclients: result.activeclients ?? 0,
      totalclientcredits: result.totalclientcredits ?? 0,
      pendingorders: result.pendingorders ?? 0,
      // Mapeie outros campos se houver
    } : 
    defaultStats;
};

export const useFetchAdminDashboardStats = () => {
  return useQuery<AdminDashboardStats, Error>({
    queryKey: ['adminDashboardStats'],
    queryFn: fetchAdminDashboardStats,
    // staleTime: 1000 * 60 * 5, // 5 minutos, por exemplo
    // placeholderData: defaultStats, // Para evitar UI piscando em re-fetches
  });
}; 