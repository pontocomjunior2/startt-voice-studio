import type { Request, Response } from 'express';
import express from 'express';
import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { staticPix } from 'pix-qrcode';

const router = express.Router();

// Cache simples em memória para o token
let interTokenCache: { access_token: string; expires_at: number } | null = null;

// Função para obter token OAuth2 do Inter
async function getInterToken() {
  const now = Date.now();
  if (interTokenCache && interTokenCache.expires_at > now + 60000) {
    return interTokenCache.access_token;
  }

  const INTER_CLIENT_ID = process.env.INTER_CLIENT_ID;
  const INTER_CLIENT_SECRET = process.env.INTER_CLIENT_SECRET;
  const INTER_CERT_PATH = process.env.INTER_CERT_PATH;
  const INTER_KEY_PATH = process.env.INTER_KEY_PATH;
  const INTER_TOKEN_URL = process.env.INTER_TOKEN_URL;

  if (!INTER_CLIENT_ID || !INTER_CLIENT_SECRET || !INTER_CERT_PATH || !INTER_KEY_PATH || !INTER_TOKEN_URL) {
    throw new Error('Configuração do Banco Inter ausente. Verifique as variáveis de ambiente.');
  }

  const cert = fs.readFileSync(path.resolve(INTER_CERT_PATH));
  const key = fs.readFileSync(path.resolve(INTER_KEY_PATH));

  const httpsAgent = new https.Agent({ cert, key });

  const params = new URLSearchParams();
  params.append('client_id', INTER_CLIENT_ID);
  params.append('client_secret', INTER_CLIENT_SECRET);
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'extrato.read pix.read pix.write cob.write cob.read');

  const { data } = await axios.post(
    INTER_TOKEN_URL,
    params,
    {
      httpsAgent,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  interTokenCache = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in * 1000),
  };
  return data.access_token;
}

// Função utilitária para gerar txid único
function gerarTxid(userId: string) {
  // Remove caracteres não alfanuméricos do userId
  const cleanUserId = String(userId).replace(/[^a-zA-Z0-9]/g, '');
  // Gera um sufixo aleatório para garantir o tamanho mínimo
  const randomSuffix = Math.random().toString(36).substring(2, 12); // 10 caracteres
  const timestamp = Date.now().toString();
  // Monta o txid base
  let base = `STARTT${cleanUserId}${timestamp}${randomSuffix}`;
  // Garante entre 26 e 35 caracteres (Inter exige esse range)
  if (base.length < 26) {
    base = base.padEnd(26, 'X');
  }
  if (base.length > 35) {
    base = base.substring(0, 35);
  }
  return base;
}

// Função para sanitizar strings Pix
function sanitizePixString(str: string, maxLength: number) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^A-Z0-9 ]/gi, '') // remove caracteres especiais
    .toUpperCase()
    .substring(0, maxLength);
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { pacoteId, valorCentavos, userIdCliente, cpf, cnpj } = req.body;
    if (!pacoteId || !valorCentavos || !userIdCliente) {
      res.status(400).json({ success: false, message: 'Dados obrigatórios ausentes.' });
      return;
    }

    const INTER_API_BASE_URL = process.env.INTER_API_BASE_URL;
    const INTER_PIX_COB_URL = process.env.INTER_PIX_COB_URL;
    const INTER_CERT_PATH = process.env.INTER_CERT_PATH;
    const INTER_KEY_PATH = process.env.INTER_KEY_PATH;
    const INTER_PIX_KEY = process.env.INTER_PIX_KEY;

    console.log({
      INTER_API_BASE_URL,
      INTER_PIX_COB_URL,
      INTER_CERT_PATH,
      INTER_KEY_PATH,
      INTER_PIX_KEY
    });

    if (!INTER_API_BASE_URL || !INTER_PIX_COB_URL || !INTER_CERT_PATH || !INTER_KEY_PATH || !INTER_PIX_KEY) {
      res.status(500).json({ success: false, message: 'Configuração do Banco Inter ausente.' });
      return;
    }

    const cert = fs.readFileSync(path.resolve(INTER_CERT_PATH));
    const key = fs.readFileSync(path.resolve(INTER_KEY_PATH));
    const httpsAgent = new https.Agent({ cert, key });

    const accessToken = await getInterToken();
    const txid = gerarTxid(userIdCliente);
    const valorReais = (valorCentavos / 100).toFixed(2);
    const expiracao = 3600; // 1 hora

    // Montar corpo da cobrança
    const devedor: any = { nome: 'Cliente STARTT Compra Creditos' };
    if (cpf) devedor.cpf = cpf;
    if (cnpj) devedor.cnpj = cnpj;

    const body = {
      calendario: { expiracao },
      devedor,
      valor: { original: valorReais },
      chave: INTER_PIX_KEY,
      solicitacaoPagador: `Pagamento créditos STARTT - Pacote ${pacoteId}`,
    };

    const { data } = await axios.post(
      INTER_PIX_COB_URL,
      body,
      {
        httpsAgent,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      }
    );

    // Gerar payload Copia e Cola (EMV)
    const recebedorNome = sanitizePixString(process.env.INTER_RECEBEDOR_NOME || 'STARTT SERVICOS DIGITAIS', 25);
    const recebedorCidade = sanitizePixString(process.env.INTER_RECEBEDOR_CIDADE || 'SAO PAULO', 15);
    let descricaoPix = 'CREDITOS STARTT';
    if (pacoteId) {
      const nomesPacote: Record<string, string> = {
        starter: 'STARTER',
        pro: 'PRO',
        premium: 'PREMIUM',
      };
      descricaoPix = nomesPacote[pacoteId] || pacoteId;
    }
    descricaoPix = sanitizePixString(descricaoPix, 30);
    const valorPix = String(Number(valorReais).toFixed(2));
    const pixResult = await staticPix({
      pixKey: INTER_PIX_KEY,
      merchant: recebedorNome,
      merchantCity: recebedorCidade,
      amount: valorPix,
      transactionId: txid,
      description: descricaoPix,
    });

    // LOGS DE VERIFICAÇÃO DA STRING EMV
    console.log('Tamanho da string:', pixResult.payload.length);
    console.log('Primeiros caracteres:', pixResult.payload.substring(0, 20));
    console.log('Últimos caracteres:', pixResult.payload.substring(pixResult.payload.length - 10));

    res.status(200).json({ success: true, data: { ...data, pixCopiaECola: pixResult.payload } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao gerar cobrança.', error });
  }
});

export default router;