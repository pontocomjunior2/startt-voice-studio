import { supabase } from '@/lib/supabaseClient'; // Importar supabase

// A função original como estava em GravarLocucaoPage.tsx
export async function gerarIdReferenciaUnico(supabaseClient: typeof supabase): Promise<string> {
  let idGerado: string;
  let colisoes = 0;
  const MAX_TENTATIVAS_COLISAO_POR_NIVEL = 10; 
  let numeroDeDigitos = 6; // Começa com 6 dígitos

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Gera uma string de dígitos aleatórios com o comprimento atual
    let randomNumberString = '';
    for (let i = 0; i < numeroDeDigitos; i++) {
      randomNumberString += Math.floor(Math.random() * 10).toString();
    }
    idGerado = `#${randomNumberString}`;

    const { data, error } = await supabaseClient
      .from('pedidos')
      .select('id_pedido_serial')
      .eq('id_pedido_serial', idGerado)
      .limit(1);

    if (error) {
      console.error('Erro ao verificar unicidade do id_pedido_serial:', error);
      throw new Error('Falha ao verificar unicidade do ID de referência. Tente novamente.');
    }

    if (!data || data.length === 0) { // ID é único
      break; 
    }

    // Colisão detectada
    colisoes++;
    if (colisoes >= MAX_TENTATIVAS_COLISAO_POR_NIVEL) {
      numeroDeDigitos++; // Aumenta o número de dígitos
      colisoes = 0;      // Reseta o contador de colisões para o novo nível de dígitos
      console.warn(
        `Muitas colisões (${MAX_TENTATIVAS_COLISAO_POR_NIVEL}) com ${numeroDeDigitos - 1} dígitos. Aumentando para ${numeroDeDigitos} dígitos.`
      );
    }
    // Log de colisão normal (antes de aumentar os dígitos)
    // else {
    //   console.warn(`Colisão de ID de referência: ${idGerado}. Tentando novamente (${colisoes}/${MAX_TENTATIVAS_COLISAO_POR_NIVEL} para ${numeroDeDigitos} dígitos)...`);
    // }
  }
  return idGerado;
} 