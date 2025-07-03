import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import fs from 'fs/promises';
import path from 'path';

// Helper function to convert a stream to a buffer
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// Função auxiliar para simplificar a resposta de erro
const sendError = (res: Response, message: string, status = 500) => {
  console.error(`[Gerar Audio IA] Erro: ${message}`);
  return res.status(status).json({ success: false, error: message });
};

export const gerarAudioIAHandler = async (req: Request, res: Response) => {
  let pedidoId: number | null = null; // Variável para armazenar o ID do pedido

  try {
    // 1. Receber e Validar Dados
    const { texto_roteiro, locutor_id, tituloPedido, userId } = req.body;
    if (!texto_roteiro || !locutor_id || !userId) {
      return sendError(res, 'Dados insuficientes: texto_roteiro, locutor_id e userId são obrigatórios.', 400);
    }

    // 2. Verificar Autenticação (simulada, pois a RPC usará o auth.uid() real)
    // No mundo real, um middleware de autenticação faria isso.

    // Buscar o ID da voz do locutor na tabela 'locutores'
    const { data: locutorData, error: locutorError } = await supabaseAdmin
      .from('locutores')
      .select('ia_voice_id, ia_disponivel')
      .eq('id', locutor_id)
      .single();

    if (locutorError || !locutorData) {
      return sendError(res, 'Locutor não encontrado ou não configurado para IA.', 404);
    }
    if (!locutorData.ia_disponivel || !locutorData.ia_voice_id) {
      return sendError(res, 'Este locutor não está disponível para geração de áudio por IA.', 403);
    }
    const { ia_voice_id } = locutorData;

    // 3. Criar o Pedido Inicial
    const custoIa = texto_roteiro.length;
    const { data: novoPedido, error: pedidoError } = await supabaseAdmin
      .from('pedidos')
      .insert({
        user_id: userId,
        locutor_id: locutor_id,
        texto_roteiro: texto_roteiro,
        titulo: tituloPedido || 'Pedido de Áudio IA',
        status: 'gerando_ia',
        gerado_por_ia: true,
        creditos_ia_debitados: custoIa,
        creditos_debitados: 0,
        tipo_audio: 'off_ia', // Novo tipo para diferenciar
      })
      .select('id')
      .single();

    if (pedidoError || !novoPedido) {
      return sendError(res, `Falha ao criar o registro do pedido: ${pedidoError?.message}`);
    }
    pedidoId = novoPedido.id; // Armazena o ID do pedido

    // 4. Debitar Créditos (Operação Atômica)
    const { error: debitoError } = await supabaseAdmin.rpc('debitar_creditos_ia', {
      p_user_id: userId,
      p_custo_ia: custoIa,
    });

    if (debitoError) {
      await supabaseAdmin.from('pedidos').update({ status: 'falhou', admin_notes: `Falha no débito de créditos: ${debitoError?.message}` }).eq('id', pedidoId);
      return sendError(res, `Saldo de Créditos IA insuficiente ou erro no débito: ${debitoError?.message}`, 402); // 402 Payment Required
    }

    // 5. Chamar a API da ElevenLabs com Stream
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      await supabaseAdmin.from('pedidos').update({ status: 'falhou', admin_notes: 'Chave de API da ElevenLabs não configurada no servidor.' }).eq('id', pedidoId);
      return sendError(res, 'Configuração do serviço de IA incompleta no servidor.');
    }

    const elevenlabs = new ElevenLabsClient({
      apiKey: apiKey,
    });
    
    const audioStream = await elevenlabs.textToSpeech.stream(
      ia_voice_id,
      {
        text: texto_roteiro,
        modelId: 'eleven_multilingual_v2',
      }
    );

    // ETAPA 5.5: Converter o stream para um Buffer
    const audioBuffer = await streamToBuffer(audioStream);

    // 6. Salvar o Áudio no Sistema de Arquivos Local
    const relativeDir = path.join('public', 'ia_audios', userId);
    const absoluteDir = path.resolve(relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    const fileName = `${pedidoId}.mp3`;
    const absoluteFilePath = path.join(absoluteDir, fileName);
    await fs.writeFile(absoluteFilePath, audioBuffer);
    
    // 7. Gerar a URL pública local
    const publicUrl = `/${path.join('ia_audios', userId, fileName).replace(/\\/g, '/')}`;

    // 8. Finalizar o Pedido com a URL local
    await supabaseAdmin.from('pedidos').update({
      status: 'concluido',
      audio_final_url: publicUrl
    }).eq('id', pedidoId);
    
    // 9. Retornar Sucesso
    res.status(200).json({ success: true, message: 'Áudio gerado com sucesso!', audioUrl: publicUrl, pedidoId });

  } catch (error: any) {
    console.error(`[Gerar Audio IA] Erro inesperado:`, error);
    const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    // Se o pedido já foi criado, tenta marcar como falho
    if (pedidoId) {
      await supabaseAdmin.from('pedidos').update({ status: 'falhou', admin_notes: `Erro inesperado no processo: ${errorMessage}` }).eq('id', pedidoId);
    }
    return sendError(res, `Erro inesperado: ${errorMessage}`);
  }
}; 