import type { NextApiRequest, NextApiResponse } from 'next';

// Para configurar o modelo Gemini, adicione no seu .env:
// GEMINI_MODEL=gemini-2.5-flash-preview-05-20
// GEMINI_API_KEY=xxxx

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }
  const {
    nomeProjetoIA,
    objetivoAudioIA,
    objetivoAudioOutroIA,
    publicoAlvoIA,
    produtoTemaIA,
    beneficioPrincipalIA,
    pontosChaveIA,
    estiloLocucaoIA,
    estiloLocucaoOutroIA,
    tomMensagemIA,
    duracaoAlvoIA,
    duracaoAlvoOutraIA,
    callToActionIA,
    evitarIA,
    destacarIA,
    referenciasIA,
    infoAdicionalIA,
  } = req.body;

  // Validação mínima dos principais campos obrigatórios
  if (!objetivoAudioIA || !publicoAlvoIA || !produtoTemaIA || !beneficioPrincipalIA || !pontosChaveIA || !estiloLocucaoIA || !tomMensagemIA || !duracaoAlvoIA || !callToActionIA) {
    return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes.' });
  }

  // Montar prompt detalhado para Gemini
  let prompt = `Você é um redator publicitário especialista em áudio. Crie um roteiro de locução para o seguinte briefing, considerando todas as informações fornecidas. Seja criativo, objetivo e siga as instruções do cliente.\n\n`;

  if (nomeProjetoIA) prompt += `Nome do Projeto/Campanha: ${nomeProjetoIA}\n`;
  prompt += `Objetivo: ${objetivoAudioIA}${objetivoAudioIA === 'Outro' && objetivoAudioOutroIA ? ` (${objetivoAudioOutroIA})` : ''}\n`;
  prompt += `Público-alvo: ${publicoAlvoIA}\n`;
  prompt += `Produto/Serviço/Evento/Tema: ${produtoTemaIA}\n`;
  prompt += `Benefício Principal/Diferencial: ${beneficioPrincipalIA}\n`;
  prompt += `Informações Essenciais: ${pontosChaveIA}\n`;
  prompt += `Estilo de Locução: ${estiloLocucaoIA === 'outro' && estiloLocucaoOutroIA ? `Outro (${estiloLocucaoOutroIA})` : estiloLocucaoIA}\n`;
  prompt += `Tom da Mensagem: ${tomMensagemIA}\n`;
  prompt += `Duração Alvo: ${duracaoAlvoIA}${duracaoAlvoIA === 'Outra' && duracaoAlvoOutraIA ? ` (${duracaoAlvoOutraIA})` : ''}\n`;
  prompt += `Call to Action: ${callToActionIA}\n`;
  if (evitarIA) prompt += `Evitar: ${evitarIA}\n`;
  if (destacarIA) prompt += `Slogan/URL/Contato a destacar: ${destacarIA}\n`;
  if (referenciasIA) prompt += `Referências de estilo: ${referenciasIA}\n`;
  if (infoAdicionalIA) prompt += `Informações adicionais: ${infoAdicionalIA}\n`;

  prompt += `\nO roteiro deve ser direto, criativo, adequado ao público e ao objetivo, e conter a chamada para ação no final.\n\nRoteiro:`;

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    if (!geminiApiKey) {
      return res.status(500).json({ success: false, error: 'Chave da API Gemini não configurada.' });
    }
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
    });
    const geminiData = await geminiRes.json();
    const roteiro = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (roteiro) {
      return res.status(200).json({ success: true, roteiro });
    } else {
      return res.status(500).json({ success: false, error: 'Não foi possível gerar o roteiro.' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Erro ao chamar a IA.' });
  }
} 