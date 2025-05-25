"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// Cache simples em memória para o token
let interTokenCache = null;
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
    const cert = fs_1.default.readFileSync(path_1.default.resolve(INTER_CERT_PATH));
    const key = fs_1.default.readFileSync(path_1.default.resolve(INTER_KEY_PATH));
    const httpsAgent = new https_1.default.Agent({ cert, key });
    const params = new URLSearchParams();
    params.append('client_id', INTER_CLIENT_ID);
    params.append('client_secret', INTER_CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'extrato.read pix.read pix.write cob.write cob.read');
    const { data } = await axios_1.default.post(INTER_TOKEN_URL, params, {
        httpsAgent,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    interTokenCache = {
        access_token: data.access_token,
        expires_at: now + (data.expires_in * 1000),
    };
    return data.access_token;
}
// Função utilitária para gerar txid único
function gerarTxid(userId) {
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
router.post('/', async (req, res) => {
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
        const cert = fs_1.default.readFileSync(path_1.default.resolve(INTER_CERT_PATH));
        const key = fs_1.default.readFileSync(path_1.default.resolve(INTER_KEY_PATH));
        const httpsAgent = new https_1.default.Agent({ cert, key });
        const accessToken = await getInterToken();
        const txid = gerarTxid(userIdCliente);
        const valorReais = (valorCentavos / 100).toFixed(2);
        const expiracao = 3600; // 1 hora
        // Montar corpo da cobrança
        const devedor = { nome: 'Cliente STARTT Compra Creditos' };
        if (cpf)
            devedor.cpf = cpf;
        if (cnpj)
            devedor.cnpj = cnpj;
        const body = {
            calendario: { expiracao },
            devedor,
            valor: { original: valorReais },
            chave: INTER_PIX_KEY,
            solicitacaoPagador: `Pagamento créditos STARTT - Pacote ${pacoteId}`,
        };
        const { data } = await axios_1.default.post(INTER_PIX_COB_URL, body, {
            httpsAgent,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
        });
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao gerar cobrança.', error });
    }
});
exports.default = router;
//# sourceMappingURL=gerar-pix-inter.js.map