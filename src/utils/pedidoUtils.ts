import { supabase } from '@/lib/supabaseClient'; // Importar supabase

// A função original como estava em GravarLocucaoPage.tsx
export async function gerarIdReferenciaUnico(supabaseClient: typeof supabase): Promise<string> {
  let idGerado: string;
  let colisoes = 0;
  const MAX_TENTATIVAS_COLISAO = 10; 

  while (true) {
    idGerado = `#${Math.random().toString().substring(2, 8).toUpperCase()}`;

    const { data, error } = await supabaseClient
      .from('pedidos')
      .select('id_pedido_serial')
      .eq('id_pedido_serial', idGerado)
      .single();

    if (error && error.code !== 'PGRST116') { 
      console.error('Erro ao verificar unicidade do id_pedido_serial:', error);
      throw new Error('Falha ao verificar unicidade do ID de referência. Tente novamente.');
    }

    if (!data) { 
      break;
    }

    colisoes++;
    if (colisoes >= MAX_TENTATIVAS_COLISAO) {
      console.error(`Muitas colisões (${colisoes}) ao gerar id_pedido_serial. Verifique a lógica ou a densidade de IDs.`);
      throw new Error('Não foi possível gerar um ID de referência único após várias tentativas.');
    }
    console.warn(`Colisão de ID de referência: ${idGerado}. Tentando novamente (${colisoes}/${MAX_TENTATIVAS_COLISAO})...`);
  }
  return idGerado;
} 