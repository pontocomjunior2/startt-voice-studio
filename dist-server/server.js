"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Carrega as variáveis de ambiente do arquivo .env na raiz do projeto.
// O __dirname aponta para o diretório do arquivo JS compilado (dist-server),
// então subimos um nível para encontrar o .env na raiz.
const envPath = path_1.default.resolve(__dirname, '../.env');
dotenv_1.default.config({ path: envPath });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const supabase_js_1 = require("@supabase/supabase-js");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Corrigindo o import para compatibilidade com CJS
const fileType = require('file-type');
// Em um ambiente de container (Docker/EasyPanel), as variáveis de ambiente
// são injetadas diretamente, então o `dotenv` não é necessário.
// dotenv.config({ path: path.resolve(__dirname, '../.env') });
// console.log(`[Servidor Express] Tentando carregar .env de: ${path.resolve(__dirname, '../.env')}`);
console.log('[Servidor Express] VITE_SUPABASE_URL lido:', process.env.VITE_SUPABASE_URL ? 'Definido' : 'NÃO DEFINIDO');
console.log('[Servidor Express] VITE_SUPABASE_ANON_KEY lido:', process.env.VITE_SUPABASE_ANON_KEY ? 'Definido' : 'NÃO DEFINIDO');
console.log('[Servidor Express] SUPABASE_SERVICE_ROLE_KEY lido:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Definido' : 'NÃO DEFINIDO');
// IMPORTS DOS HANDLERS/ROUTERS DEVEM VIR APÓS O dotenv.config!
const gerar_roteiro_ia_1 = __importDefault(require("./api/gerar-roteiro-ia"));
const gerar_pagamento_pix_mp_1 = __importDefault(require("./api/gerar-pagamento-pix-mp"));
const webhook_mp_pagamentos_1 = __importDefault(require("./api/webhook-mp-pagamentos"));
const app = (0, express_1.default)();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 3001; // Porta para o servidor backend
/**
 * Sanitiza um nome de arquivo ou componente de diretório para previnir path traversal.
 * - Remove caracteres especiais, incluindo `.` e `/`.
 * - Limita o tamanho.
 * - Substitui espaços por underscores.
 * @param {string} input - A string a ser sanitizada.
 * @returns {string} A string sanitizada.
 */
function sanitizeFilename(input) {
    if (!input)
        return '';
    const sanitized = String(input)
        .normalize('NFD') // Normaliza caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .toLowerCase()
        .replace(/[^a-z0-9_-\s]/g, '') // Remove caracteres perigosos (exceto espaço, underscore, hifen)
        .trim()
        .replace(/\s+/g, '_') // Substitui espaços por underscore
        .substring(0, 50); // Limita o comprimento
    return sanitized;
}
// Configurar limites maiores para o Express
app.use(express_1.default.json({ limit: '150mb' }));
app.use(express_1.default.urlencoded({ limit: '150mb', extended: true }));
// Habilitar CORS de forma segura
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ALLOWED_ORIGINS || '').split(',')
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];
console.log('[CORS] Origens permitidas:', allowedOrigins);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Permitir requisições sem 'origin' (ex: Postman, apps mobile) ou se a origem estiver na lista
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`[CORS] Requisição bloqueada da origem: ${origin}`);
            callback(new Error('Não permitido por CORS'));
        }
    },
    credentials: true
}));
// Rate Limiter para todas as rotas da API
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // Limita cada IP a 200 requisições por janela de 15 minutos
    message: { success: false, message: 'Muitas requisições enviadas deste IP, por favor, tente novamente após 15 minutos.' },
    standardHeaders: true, // Retorna informação do limite nos headers `RateLimit-*`
    legacyHeaders: false, // Desabilita os headers obsoletos `X-RateLimit-*`
});
// Aplicar o rate limiter a todas as rotas que começam com /api
app.use('/api/', apiLimiter);
// --- SERVIR ARQUIVOS ESTÁTICOS ---
// 1. Servir uploads do diretório /public/uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../public/uploads')));
// 2. Servir os arquivos estáticos do build do frontend (React/Vite)
// O Express vai procurar por arquivos correspondentes aqui (ex: /assets/index-*.js)
app.use(express_1.default.static(path_1.default.join(__dirname, '../dist'), {
    // Cache de assets por 1 ano em produção
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
}));
// Middleware para detectar requisições muito grandes antes do multer
app.use('/api/upload', (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 100 * 1024 * 1024; // 100MB
    console.log(`[Body Size Check] Content-Length: ${contentLength} bytes (${(contentLength / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`[Body Size Check] Limite máximo: ${(maxSize / 1024 / 1024).toFixed(2)} MB`);
    if (contentLength > maxSize) {
        console.error(`[Body Size Check] Requisição rejeitada - muito grande: ${contentLength} > ${maxSize}`);
        return res.status(413).json({
            message: `Arquivo muito grande. Tamanho: ${(contentLength / 1024 / 1024).toFixed(2)}MB. Máximo permitido: 100MB.`,
            uploadedSize: contentLength,
            maxAllowed: maxSize
        });
    }
    next();
});
// Adicione aqui:
app.use(express_1.default.json());
// ================= ROTAS DE UPLOAD DEVEM VIR ANTES DE QUALQUER BODY PARSER =================
// Upload de avatar do locutor
const avatarStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path_1.default.join(__dirname, '../public/uploads/avatars');
        const safeBaseDir = path_1.default.resolve(__dirname, '../public/uploads');
        if (!fs_1.default.existsSync(safeBaseDir))
            fs_1.default.mkdirSync(safeBaseDir, { recursive: true });
        const finalUploadPath = path_1.default.resolve(uploadPath);
        if (!finalUploadPath.startsWith(safeBaseDir)) {
            return cb(new Error('Tentativa de gravação em diretório inválido.'), '');
        }
        if (!fs_1.default.existsSync(finalUploadPath))
            fs_1.default.mkdirSync(finalUploadPath, { recursive: true });
        cb(null, finalUploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    }
});
const uploadAvatar = (0, multer_1.default)({
    storage: avatarStorage,
    fileFilter: async (req, file, cb) => {
        // Atenção: fileFilter não tem acesso ao conteúdo final.
        // Esta validação pelo mimetype é uma primeira barreira.
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            // @ts-ignore
            cb(new Error('Apenas imagens são permitidas para avatar!'), false);
        }
    }
});
app.post('/api/upload/avatar', (req, res, next) => {
    uploadAvatar.single('avatar')(req, res, async (err) => {
        if (err)
            return next(err);
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
            }
            const type = await fileType.fromFile(req.file.path);
            if (!type || !type.mime.startsWith('image/')) {
                fs_1.default.unlinkSync(req.file.path);
                return res.status(400).json({ message: 'Tipo de arquivo inválido. Apenas imagens são permitidas.' });
            }
            const url = `/uploads/avatars/${req.file.filename}`;
            res.status(200).json({ url });
        }
        catch (error) {
            next(error);
        }
    });
});
// Upload de demo de áudio do locutor (agora com nome customizado)
const demoStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path_1.default.join(__dirname, '../public/uploads/demos');
        // Validação extra de segurança para garantir que o diretório base existe e é seguro
        const safeBaseDir = path_1.default.resolve(__dirname, '../public/uploads');
        if (!fs_1.default.existsSync(safeBaseDir))
            fs_1.default.mkdirSync(safeBaseDir, { recursive: true });
        const finalUploadPath = path_1.default.resolve(uploadPath);
        if (!finalUploadPath.startsWith(safeBaseDir)) {
            return cb(new Error('Tentativa de gravação em diretório inválido.'), '');
        }
        if (!fs_1.default.existsSync(finalUploadPath))
            fs_1.default.mkdirSync(finalUploadPath, { recursive: true });
        cb(null, finalUploadPath);
    },
    filename: function (req, file, cb) {
        // Receber nome do locutor e estilo via body ou query e SANITIZAR
        const nomeLocutor = sanitizeFilename(req.body.nomeLocutor || req.query.nomeLocutor || 'locutor');
        const estilo = sanitizeFilename(req.body.estilo || req.query.estilo || 'estilo');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname); // A extensão é considerada segura por path.extname
        cb(null, `${nomeLocutor}-${estilo}-${uniqueSuffix}${ext}`);
    }
});
const uploadDemo = (0, multer_1.default)({
    storage: demoStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        }
        else {
            // @ts-ignore
            cb(new Error('Apenas arquivos de áudio são permitidos para demo!'), false);
        }
    }
});
app.post('/api/upload/demo', (req, res, next) => {
    uploadDemo.single('demo')(req, res, async (err) => {
        if (err)
            return next(err);
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
            }
            const type = await fileType.fromFile(req.file.path);
            if (!type || !type.mime.startsWith('audio/')) {
                fs_1.default.unlinkSync(req.file.path);
                return res.status(400).json({ message: 'Tipo de arquivo inválido. Apenas áudios são permitidos.' });
            }
            if (!supabase) {
                return res.status(500).json({ message: 'Supabase não configurado no backend.' });
            }
            const url = `/uploads/demos/${req.file.filename}`;
            const nomeLocutor = req.body.nomeLocutor || req.query.nomeLocutor;
            const estilo = req.body.estilo || req.query.estilo;
            if (!nomeLocutor || !estilo) {
                return res.status(400).json({ message: 'nomeLocutor e estilo são obrigatórios.' });
            }
            const { data: locutores, error: locutorError } = await supabase
                .from('locutores')
                .select('id')
                .ilike('nome', nomeLocutor);
            if (locutorError || !locutores || locutores.length === 0) {
                return res.status(404).json({ message: 'Locutor não encontrado para nome informado.' });
            }
            const locutor_id = locutores[0].id;
            const { error: demoError } = await supabase
                .from('locutor_demos')
                .insert({
                locutor_id,
                estilo,
                url,
                data_criacao: new Date().toISOString(),
            });
            if (demoError)
                throw demoError;
            res.status(200).json({ url, nomeLocutor, estilo });
        }
        catch (error) {
            next(error);
        }
    });
});
// Upload de Áudio Guia do Cliente
const guiaStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path_1.default.join(__dirname, '../public/uploads/guias');
        const safeBaseDir = path_1.default.resolve(__dirname, '../public/uploads');
        if (!fs_1.default.existsSync(safeBaseDir))
            fs_1.default.mkdirSync(safeBaseDir, { recursive: true });
        const finalUploadPath = path_1.default.resolve(uploadPath);
        if (!finalUploadPath.startsWith(safeBaseDir)) {
            return cb(new Error('Tentativa de gravação em diretório inválido.'), '');
        }
        if (!fs_1.default.existsSync(finalUploadPath))
            fs_1.default.mkdirSync(finalUploadPath, { recursive: true });
        cb(null, finalUploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `audio-guia-${uniqueSuffix}${ext}`);
    }
});
const uploadGuia = (0, multer_1.default)({
    storage: guiaStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/'))
            cb(null, true);
        else
            cb(new Error('Apenas arquivos de áudio são permitidos para áudio guia!'));
    }
});
app.post('/api/upload-guia', (req, res, next) => {
    uploadGuia.single('audioGuia')(req, res, async (err) => {
        if (err)
            return next(err);
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
            }
            const type = await fileType.fromFile(req.file.path);
            if (!type || !type.mime.startsWith('audio/')) {
                fs_1.default.unlinkSync(req.file.path);
                return res.status(400).json({ success: false, message: 'Tipo de arquivo inválido. Apenas áudios são permitidos.' });
            }
            const filePath = `/uploads/guias/${req.file.filename}`;
            res.status(200).json({ success: true, filePath });
        }
        catch (error) {
            next(error);
        }
    });
});
// Upload de Áudio Guia da Revisão do Cliente
const guiaRevisaoStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path_1.default.join(__dirname, '../public/uploads/revisoes_guias');
        const safeBaseDir = path_1.default.resolve(__dirname, '../public/uploads');
        if (!fs_1.default.existsSync(safeBaseDir))
            fs_1.default.mkdirSync(safeBaseDir, { recursive: true });
        const finalUploadPath = path_1.default.resolve(uploadPath);
        if (!finalUploadPath.startsWith(safeBaseDir)) {
            return cb(new Error('Tentativa de gravação em diretório inválido.'), '');
        }
        if (!fs_1.default.existsSync(finalUploadPath))
            fs_1.default.mkdirSync(finalUploadPath, { recursive: true });
        cb(null, finalUploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `audio-guia-revisao-${uniqueSuffix}${ext}`);
    }
});
const uploadGuiaRevisao = (0, multer_1.default)({
    storage: guiaRevisaoStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/'))
            cb(null, true);
        else
            cb(new Error('Apenas arquivos de áudio são permitidos para áudio guia de revisão!'));
    }
});
app.post('/api/upload-guia-revisao', (req, res, next) => {
    uploadGuiaRevisao.single('audioGuia')(req, res, async (err) => {
        if (err)
            return next(err);
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
            }
            const type = await fileType.fromFile(req.file.path);
            if (!type || !type.mime.startsWith('audio/')) {
                fs_1.default.unlinkSync(req.file.path);
                return res.status(400).json({ success: false, message: 'Tipo de arquivo inválido. Apenas áudios são permitidos.' });
            }
            const filePath = `/uploads/revisoes_guias/${req.file.filename}`;
            res.status(200).json({ success: true, filePath });
        }
        catch (error) {
            next(error);
        }
    });
});
// ================= FIM DAS ROTAS DE UPLOAD =================
// Configuração de limite de upload via variável de ambiente
const MAX_UPLOAD_SIZE = process.env.MAX_UPLOAD_SIZE_MB ?
    parseInt(process.env.MAX_UPLOAD_SIZE_MB) * 1024 * 1024 :
    100 * 1024 * 1024; // Default: 100MB
console.log(`[Server Config] Limite máximo de upload: ${(MAX_UPLOAD_SIZE / 1024 / 1024).toFixed(0)}MB`);
// Configuração do Supabase Storage
const SUPABASE_BUCKET = 'pontocomaudio-uploads';
// Função para fazer upload para Supabase Storage
async function uploadToSupabaseStorage(file, folder) {
    if (!supabase) {
        console.error('[Supabase Storage] Cliente não configurado');
        return null;
    }
    try {
        const fileName = `${folder}/${Date.now()}-${file.originalname}`;
        const { data, error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });
        if (error) {
            console.error('[Supabase Storage] Erro no upload:', error);
            return null;
        }
        // Retornar URL pública
        const { data: publicUrl } = supabase.storage
            .from(SUPABASE_BUCKET)
            .getPublicUrl(fileName);
        console.log(`[Supabase Storage] Upload realizado: ${publicUrl.publicUrl}`);
        return publicUrl.publicUrl;
    }
    catch (error) {
        console.error('[Supabase Storage] Erro inesperado:', error);
        return null;
    }
}
// Configuração do Multer para armazenamento de arquivos
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const clientName = sanitizeFilename(req.params.clientName || 'unknown_client');
        console.log('[Multer Destination] clientName (sanitized) determinado:', clientName);
        const baseUploadDir = path_1.default.resolve(__dirname, '../public/uploads/audios');
        const uploadPath = path_1.default.join(baseUploadDir, clientName);
        if (!path_1.default.resolve(uploadPath).startsWith(baseUploadDir)) {
            return cb(new Error('Tentativa de gravação em diretório inválido.'), '');
        }
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExt = path_1.default.extname(file.originalname);
        const originalNameWithoutExt = path_1.default.basename(file.originalname, fileExt);
        const finalFileName = `${sanitizeFilename(originalNameWithoutExt)}-${uniqueSuffix}${fileExt}`;
        cb(null, finalFileName);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: MAX_UPLOAD_SIZE, // Usar variável de ambiente
        fieldSize: 50 * 1024 * 1024 // 50MB para campos
    },
    fileFilter: function (req, file, cb) {
        console.log(`[Upload Filter] Arquivo recebido: ${file.originalname}, MIME: ${file.mimetype}, Tamanho estimado: ${file.size || 'N/A'}`);
        // Aceitar apenas arquivos de áudio
        if (!file.mimetype.startsWith('audio/')) {
            console.error(`[Upload Filter] Arquivo rejeitado - MIME inválido: ${file.mimetype}`);
            return cb(new Error('Apenas arquivos de áudio são permitidos!'));
        }
        cb(null, true);
    }
});
// Endpoint para upload de arquivos - AGORA COM :clientName NA ROTA
app.post('/api/upload/:clientName', (req, res) => {
    console.log(`[Upload Endpoint] Iniciando upload para cliente: ${req.params.clientName}`);
    console.log(`[Upload Endpoint] Headers recebidos: Content-Length: ${req.headers['content-length']}, Content-Type: ${req.headers['content-type']}`);
    // Usar closure para acessar upload e tratar erros
    const uploader = upload.single('audioFile');
    uploader(req, res, function (err) {
        if (err instanceof multer_1.default.MulterError) {
            // Um erro do Multer ocorreu durante o upload.
            console.error("Erro do Multer:", err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).send({
                    message: `Arquivo muito grande. Tamanho máximo permitido: 100MB. Tamanho recebido: ${err.field}`
                });
            }
            return res.status(400).send({ message: `Erro do Multer: ${err.message}` });
        }
        else if (err) {
            // Um erro desconhecido ocorreu (ex: do fileFilter).
            console.error("Erro desconhecido no upload:", err);
            return res.status(400).send({ message: err.message || 'Erro ao processar arquivo.' });
        }
        // Se chegou aqui, o upload foi bem-sucedido (ou nenhum arquivo foi enviado)
        if (!req.file) {
            console.error("[Upload Endpoint] Nenhum arquivo foi recebido na requisição");
            return res.status(400).send({ message: 'Nenhum arquivo enviado.' });
        }
        // Processar o arquivo e retornar o caminho
        // Ler o nome do cliente dos PARÂMETROS da URL
        const clientName = req.params.clientName || 'unknown_client';
        const sanitizedClientName = clientName
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_.-]/g, '');
        const relativeFilePath = `/uploads/audios/${sanitizedClientName}/${req.file.filename}`;
        console.log('Arquivo recebido no backend:', req.file);
        console.log('Salvo em:', req.file.path);
        console.log('Caminho relativo retornado:', relativeFilePath);
        res.status(200).send({
            message: 'Arquivo enviado com sucesso!',
            filePath: relativeFilePath
        });
    });
});
// Nova rota para upload em chunks (para contornar limites de proxy)
app.post('/api/upload-chunked/:clientName', express_1.default.raw({ type: 'application/octet-stream', limit: '10mb' }), (req, res) => {
    const clientName = req.params.clientName;
    const chunkIndex = parseInt(req.headers['x-chunk-index']) || 0;
    const totalChunks = parseInt(req.headers['x-total-chunks']) || 1;
    const originalName = req.headers['x-original-name'] || 'upload.mp3';
    const uploadId = req.headers['x-upload-id'];
    if (!uploadId) {
        return res.status(400).json({ message: 'Upload ID é obrigatório.' });
    }
    console.log(`[Chunked Upload] Cliente: ${clientName}, Chunk: ${chunkIndex + 1}/${totalChunks}, Arquivo: ${originalName}`);
    const sanitizedClientName = clientName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_.-]/g, '');
    const tempDir = path_1.default.join(__dirname, '../temp/uploads', uploadId);
    const uploadDir = path_1.default.join(__dirname, '../public/uploads/audios', sanitizedClientName);
    // Criar diretórios se não existirem
    if (!fs_1.default.existsSync(tempDir)) {
        fs_1.default.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    // Salvar chunk
    const chunkPath = path_1.default.join(tempDir, `chunk-${chunkIndex}`);
    fs_1.default.writeFileSync(chunkPath, req.body);
    // Se é o último chunk, montar o arquivo final
    if (chunkIndex === totalChunks - 1) {
        const timestamp = Date.now();
        const randomSuffix = Math.round(Math.random() * 1E9);
        const fileExt = path_1.default.extname(originalName);
        const originalNameWithoutExt = path_1.default.basename(originalName, fileExt);
        const finalFileName = `${originalNameWithoutExt}-${timestamp}-${randomSuffix}${fileExt}`;
        const finalPath = path_1.default.join(uploadDir, finalFileName);
        // Combinar todos os chunks
        const writeStream = fs_1.default.createWriteStream(finalPath);
        for (let i = 0; i < totalChunks; i++) {
            const chunkData = fs_1.default.readFileSync(path_1.default.join(tempDir, `chunk-${i}`));
            writeStream.write(chunkData);
        }
        writeStream.end();
        // Limpar chunks temporários
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        const relativeFilePath = `/uploads/audios/${sanitizedClientName}/${finalFileName}`;
        console.log(`[Chunked Upload] Arquivo final criado: ${relativeFilePath}`);
        res.json({
            message: 'Upload concluído com sucesso!',
            filePath: relativeFilePath
        });
    }
    else {
        res.json({
            message: `Chunk ${chunkIndex + 1}/${totalChunks} recebido`,
            chunkIndex
        });
    }
});
// Importe seu cliente Supabase aqui. Exemplo:
// import { supabase } from './config/supabaseClient'; // Você precisará criar este arquivo ou inicializar o Supabase aqui.
// Por enquanto, vamos assumir que 'supabase' estará disponível no escopo.
// Substitua pela sua inicialização real do Supabase no backend:
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// MODIFICADO: Usar a SERVICE_ROLE_KEY para o cliente do servidor
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Variáveis de ambiente Supabase (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) não definidas no servidor.");
    // process.exit(1); // Ou trate de outra forma
}
// @ts-ignore TODO: Add proper Supabase client initialization for server-side
const supabase = supabaseUrl && supabaseServiceKey ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey) : null;
// Função para garantir que todos os diretórios necessários existam
function ensureDirectoriesExist() {
    const dirs = [
        path_1.default.join(__dirname, '../public'),
        path_1.default.join(__dirname, '../public/uploads'),
        path_1.default.join(__dirname, '../public/uploads/avatars'),
        path_1.default.join(__dirname, '../public/uploads/demos'),
        path_1.default.join(__dirname, '../public/uploads/guias'),
        path_1.default.join(__dirname, '../public/uploads/revisoes_guias'),
        path_1.default.join(__dirname, '../public/uploads/audios'),
        path_1.default.join(__dirname, '../temp'),
        path_1.default.join(__dirname, '../temp/uploads')
    ];
    dirs.forEach(dir => {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
            console.log(`[Server Init] Diretório criado: ${dir}`);
        }
    });
    // Verificar se o diretório dist existe
    const distPath = path_1.default.join(__dirname, '../dist');
    if (!fs_1.default.existsSync(distPath)) {
        console.warn(`[Server Init] AVISO: Diretório do frontend não encontrado: ${distPath}`);
    }
    else {
        console.log(`[Server Init] Diretório do frontend encontrado: ${distPath}`);
    }
}
// Executar a verificação de diretórios na inicialização
ensureDirectoriesExist();
// --- INÍCIO NOVA ROTA PARA UPLOAD DE REVISÕES ---
const revisaoStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const clientUsername = sanitizeFilename(req.params.clientUsername);
        if (!clientUsername) {
            return cb(new Error("Username do cliente inválido ou não fornecido na URL para o diretório de revisão."), "");
        }
        const baseUploadDir = path_1.default.resolve(__dirname, '../public/uploads/audios');
        const clientDir = path_1.default.join(baseUploadDir, clientUsername);
        const revisoesDir = path_1.default.join(clientDir, 'revisoes');
        if (!path_1.default.resolve(revisoesDir).startsWith(baseUploadDir)) {
            return cb(new Error('Tentativa de gravação em diretório inválido.'), '');
        }
        if (!fs_1.default.existsSync(revisoesDir)) {
            fs_1.default.mkdirSync(revisoesDir, { recursive: true });
            console.log(`[Revisao Multer Destination] Diretório de revisões criado: ${revisoesDir}`);
        }
        cb(null, revisoesDir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const originalNameWithoutExt = path_1.default.parse(file.originalname).name;
        const fileExt = path_1.default.parse(file.originalname).ext;
        const sanitizedOriginalName = sanitizeFilename(originalNameWithoutExt);
        const finalFileName = `${sanitizedOriginalName}-${timestamp}${fileExt}`;
        cb(null, finalFileName);
    }
});
const uploadRevisaoAudio = (0, multer_1.default)({
    storage: revisaoStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // Limite de 100MB (ajuste conforme necessário)
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        }
        else {
            // Este erro será pego pelo handler do multer na rota
            // @ts-ignore TODO: Fix multer callback error type
            cb(new Error('Tipo de arquivo inválido. Apenas áudios são permitidos para revisão.'), false);
        }
    }
}).single('revisaoAudioFile'); // Nome do campo no FormData da Server Action
app.post('/api/revisoes/processar-upload/:clientUsername', (req, res) => {
    uploadRevisaoAudio(req, res, async (multerError) => {
        if (multerError) {
            console.error('Erro no upload de revisão com Multer:', multerError);
            return res.status(400).json({
                success: false,
                failure: multerError.message || 'Erro no upload do arquivo de revisão.'
            });
        }
        // req.file estará presente se o upload for bem-sucedido
        // req.body conterá os outros campos do FormData
        const { solicitacaoId, adminFeedback, novoStatusRevisao, pedidoId } = req.body; // clientUsername virá de req.params
        const clientUsername = req.params.clientUsername; // Usar o clientUsername da URL
        console.log('[API /processar-upload REVISAO] clientUsername (from URL):', clientUsername);
        console.log('[API /processar-upload REVISAO] Body recebido:', req.body);
        if (req.file) {
            console.log('[API /processar-upload REVISAO] Arquivo recebido:', req.file);
        }
        if (!solicitacaoId || !novoStatusRevisao || !clientUsername || !pedidoId) {
            return res.status(400).json({
                success: false,
                failure: 'Dados insuficientes para processar a revisão (solicitacaoId, novoStatusRevisao, clientUsername, pedidoId são obrigatórios).'
            });
        }
        if (!supabase) {
            console.error('[API /processar-upload REVISAO] Cliente Supabase não inicializado no servidor.');
            return res.status(500).json({
                success: false,
                failure: 'Erro interno do servidor: Cliente Supabase não configurado.'
            });
        }
        let relativeFilePathForDb = null;
        let absoluteFilePathParaRollback = null;
        if (req.file) {
            const sanitizedClientName = clientUsername.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_.-]/g, '');
            relativeFilePathForDb = `/uploads/audios/${sanitizedClientName}/revisoes/${req.file.filename}`;
            absoluteFilePathParaRollback = req.file.path;
        }
        else if (novoStatusRevisao === 'revisado_finalizado') {
            console.error(`[API /processar-upload REVISAO] Tentativa de processar '${novoStatusRevisao}' sem arquivo. Isso não deveria ocorrer aqui.`);
            throw new Error('Arquivo de áudio é obrigatório para finalizar a revisão neste ponto da API.');
        }
        try {
            // 1. Inserir em versoes_audio_revisao (SE HOUVER ARQUIVO)
            if (relativeFilePathForDb && req.file) {
                const { count: existingVersionsCount, error: countError } = await supabase
                    .from('versoes_audio_revisao')
                    .select('id', { count: 'exact', head: true })
                    .eq('solicitacao_id', solicitacaoId);
                if (countError) {
                    console.error('[API /processar-upload REVISAO] Erro ao contar versões:', countError);
                    throw new Error(`Erro ao determinar número da versão: ${countError.message}`);
                }
                const proximoNumeroVersao = (existingVersionsCount || 0) + 1;
                const { error: insertError } = await supabase.from('versoes_audio_revisao').insert({
                    solicitacao_id: solicitacaoId,
                    audio_url: relativeFilePathForDb,
                    comentarios_admin: adminFeedback || null,
                    enviado_em: new Date().toISOString(),
                    numero_versao: proximoNumeroVersao,
                });
                if (insertError) {
                    console.error('[API /processar-upload REVISAO] Erro ao inserir em versoes_audio_revisao:', insertError);
                    throw new Error(`Erro ao salvar detalhes do áudio: ${insertError.message}`);
                }
                console.log(`[API /processar-upload REVISAO] Áudio de revisão salvo no DB: ${relativeFilePathForDb}, Versão: ${proximoNumeroVersao}`);
            }
            else if (novoStatusRevisao === 'revisado_finalizado' && !req.file) {
                console.error(`[API /processar-upload REVISAO] Tentativa de processar '${novoStatusRevisao}' sem arquivo. Isso não deveria ocorrer aqui.`);
                throw new Error('Arquivo de áudio é obrigatório para finalizar a revisão neste ponto da API.');
            }
            // 2. Atualizar solicitacoes_revisao
            const updateSolicitacaoPayload = {
                status_revisao: novoStatusRevisao,
                admin_feedback: adminFeedback || null,
            };
            // Adicionar data_conclusao_revisao apenas se o status for finalizador
            if (novoStatusRevisao === 'revisado_finalizado' || novoStatusRevisao === 'negada') {
                updateSolicitacaoPayload.data_conclusao_revisao = new Date().toISOString();
            }
            console.log('[API /processar-upload REVISAO] Payload para atualizar solicitacoes_revisao:', updateSolicitacaoPayload);
            const { error: updateSolError } = await supabase.from('solicitacoes_revisao')
                .update(updateSolicitacaoPayload)
                .eq('id', solicitacaoId);
            if (updateSolError) {
                console.error('[API /processar-upload REVISAO] Erro ao atualizar solicitacoes_revisao:', updateSolError);
                throw new Error(`Erro ao atualizar status da solicitação: ${updateSolError.message}`);
            }
            console.log(`[API /processar-upload REVISAO] solicitacoes_revisao atualizada para status: ${novoStatusRevisao}`);
            // 3. Atualizar pedidos.status
            let novoStatusPedidoPrincipal = null;
            if (novoStatusRevisao === 'revisado_finalizado' || novoStatusRevisao === 'negada') {
                novoStatusPedidoPrincipal = 'concluido';
            }
            else if (novoStatusRevisao === 'info_solicitada_ao_cliente') {
                novoStatusPedidoPrincipal = 'aguardando_cliente';
            }
            else if (novoStatusRevisao === 'em_andamento_admin') {
                novoStatusPedidoPrincipal = 'em_revisao';
            }
            if (novoStatusPedidoPrincipal) {
                console.log(`[API /processar-upload REVISAO] Payload para atualizar pedidos: { status: ${novoStatusPedidoPrincipal} }, pedidoId: ${pedidoId}`);
                const { error: updatePedidoError } = await supabase.from('pedidos')
                    .update({ status: novoStatusPedidoPrincipal })
                    .eq('id', pedidoId);
                if (updatePedidoError) {
                    console.error(`[API /processar-upload REVISAO] Erro ao atualizar pedidos.status para ${novoStatusPedidoPrincipal}:`, updatePedidoError);
                    console.warn(`[API /processar-upload REVISAO] Revisão processada, mas falha ao atualizar status do pedido principal ${pedidoId} para ${novoStatusPedidoPrincipal}.`);
                }
                else {
                    console.log(`[API /processar-upload REVISAO] Pedido ${pedidoId} atualizado para status: ${novoStatusPedidoPrincipal}`);
                }
            }
            else {
                console.warn(`[API /processar-upload REVISAO] Nenhum novo status para o pedido principal foi definido para o status de revisão: ${novoStatusRevisao}`);
            }
            return res.status(200).json({
                success: true,
                message: 'Revisão processada com sucesso.',
                filePath: relativeFilePathForDb
            });
        }
        catch (dbError) {
            console.error('[API /processar-upload REVISAO] Erro nas operações de banco de dados:', dbError);
            if (absoluteFilePathParaRollback && fs_1.default.existsSync(absoluteFilePathParaRollback)) {
                fs_1.default.unlink(absoluteFilePathParaRollback, (unlinkErr) => {
                    if (unlinkErr)
                        console.error('[API /processar-upload REVISAO] Erro ao tentar remover arquivo após falha no DB:', unlinkErr);
                    else
                        console.log('[API /processar-upload REVISAO] Arquivo local removido devido à falha no DB (rollback).');
                });
            }
            return res.status(500).json({
                success: false,
                failure: `Erro ao processar dados da revisão no banco: ${dbError.message || 'Erro desconhecido'}`
            });
        }
    });
});
// --- FIM NOVA ROTA PARA UPLOAD DE REVISÕES ---
// GET demos de um locutor
app.get('/api/locutor/:id/demos', async (req, res) => {
    const locutor_id = req.params.id;
    if (!supabase) {
        res.status(500).json({ message: 'Supabase não configurado no backend.' });
        return;
    }
    try {
        const { data, error } = await supabase
            .from('locutor_demos')
            .select('id, estilo, url, data_criacao')
            .eq('locutor_id', locutor_id)
            .order('data_criacao', { ascending: false });
        if (error) {
            res.status(500).json({ message: 'Erro ao buscar demos.', details: error.message });
            return;
        }
        res.status(200).json({ demos: data });
    }
    catch (err) {
        res.status(500).json({ message: 'Erro inesperado ao buscar demos.', details: err.message });
    }
});
// POST criar demo para locutor
app.post('/api/locutor/:id/demos', async (req, res) => {
    const locutor_id = req.params.id;
    const { estilo, url } = req.body;
    if (!supabase) {
        res.status(500).json({ message: 'Supabase não configurado no backend.' });
        return;
    }
    if (!locutor_id || !estilo || !url) {
        res.status(400).json({ message: 'locutor_id, estilo e url são obrigatórios.' });
        return;
    }
    try {
        const { error } = await supabase
            .from('locutor_demos')
            .insert({
            locutor_id,
            estilo,
            url,
            data_criacao: new Date().toISOString(),
        });
        if (error) {
            res.status(500).json({ message: 'Erro ao salvar demo.', details: error.message });
            return;
        }
        res.status(200).json({ success: true });
    }
    catch (err) {
        res.status(500).json({ message: 'Erro inesperado ao salvar demo.', details: err.message });
    }
});
const supabaseAdmin = (0, supabase_js_1.createClient)(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// ROTA: Exclusão total de usuário (Auth + profiles)
app.post('/api/admin/delete-user', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        res.status(400).json({ error: 'userId obrigatório' });
        return;
    }
    if (process.env.ADMIN_SECRET && req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
        res.status(403).json({ error: 'Acesso negado.' });
        return;
    }
    // Exclui do Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
        console.error('[DeleteUser] Erro ao deletar do Auth:', authError);
        // Se for erro 500 (Database error deleting user), apenas loga e segue
        if (authError.status !== 500) {
            res.status(500).json({ error: authError.message });
            return;
        }
        console.warn('[DeleteUser] Ignorando erro 500 do Auth e continuando exclusão no banco.');
    }
    // Buscar todos os IDs de solicitacoes_revisao do usuário
    const { data: solicitacoes, error: solicitacoesError } = await supabaseAdmin
        .from('solicitacoes_revisao')
        .select('id')
        .eq('user_id', userId);
    if (solicitacoesError) {
        console.error('[DeleteUser] Erro ao buscar solicitacoes_revisao:', solicitacoesError);
        res.status(500).json({ error: 'Erro ao buscar solicitações de revisão: ' + solicitacoesError.message });
        return;
    }
    const solicitacaoIds = (solicitacoes || []).map(s => s.id);
    if (solicitacaoIds.length > 0) {
        // Deletar todas as versoes_audio_revisao dessas solicitações
        const { error: audioRevError } = await supabaseAdmin
            .from('versoes_audio_revisao')
            .delete()
            .in('solicitacao_id', solicitacaoIds);
        if (audioRevError) {
            console.error('[DeleteUser] Erro ao deletar versoes_audio_revisao:', audioRevError);
            res.status(500).json({ error: 'Erro ao deletar versões de áudio de revisão: ' + audioRevError.message });
            return;
        }
    }
    // 2. Solicitações de revisão
    const { error: revisaoError } = await supabaseAdmin.from('solicitacoes_revisao').delete().eq('user_id', userId);
    if (revisaoError) {
        console.error('[DeleteUser] Erro ao deletar solicitacoes_revisao:', revisaoError);
        res.status(500).json({ error: 'Erro ao deletar solicitações de revisão: ' + revisaoError.message });
        return;
    }
    // 3. Lotes de créditos
    const { error: lotesError } = await supabaseAdmin.from('lotes_creditos').delete().eq('user_id', userId);
    if (lotesError) {
        console.error('[DeleteUser] Erro ao deletar lotes_creditos:', lotesError);
        res.status(500).json({ error: 'Erro ao deletar lotes de créditos: ' + lotesError.message });
        return;
    }
    // 4. Pedidos
    const { error: pedidosError } = await supabaseAdmin.from('pedidos').delete().eq('user_id', userId);
    if (pedidosError) {
        console.error('[DeleteUser] Erro ao deletar pedidos:', pedidosError);
        res.status(500).json({ error: 'Erro ao deletar pedidos: ' + pedidosError.message });
        return;
    }
    // 5. Outros dados relacionados (adicione aqui caso existam mais tabelas)
    // 6. Exclui do banco (profiles)
    const { error: dbError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    if (dbError) {
        console.error('[DeleteUser] Erro ao deletar profile:', dbError);
        res.status(500).json({ error: dbError.message });
        return;
    }
    res.json({ success: true });
});
// ROTA: Health Check para Docker/EasyPanel
app.get('/api/health', (req, res) => {
    console.log('[Health Check] Requisição recebida em /api/health');
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port: PORT,
        env: process.env.NODE_ENV || 'development'
    });
    console.log('[Health Check] Resposta enviada');
});
// ROTA: Health Check alternativo na raiz (backup)
app.get('/health', (req, res) => {
    console.log('[Health Check Root] Requisição recebida em /health');
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        port: PORT
    });
    console.log('[Health Check Root] Resposta enviada');
});
// ROTA: Geração de roteiro com IA Gemini
app.post('/api/gerar-roteiro-ia', gerar_roteiro_ia_1.default);
app.use(gerar_pagamento_pix_mp_1.default);
const webhookLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // 30 requests por minuto
    message: { success: false, message: 'Too many requests' }
});
app.use('/api/webhook-mp-pagamentos', webhookLimiter, webhook_mp_pagamentos_1.default);
app.get('/api/test-env', (req, res) => {
    res.json({
        INTER_CLIENT_ID: process.env.INTER_CLIENT_ID,
        INTER_CERT_PATH: process.env.INTER_CERT_PATH,
        INTER_KEY_PATH: process.env.INTER_KEY_PATH,
        INTER_API_URL: process.env.INTER_API_URL,
        // Não exponha secrets em produção!
    });
});
// Rota catch-all para servir o frontend React (SPA)
// DEVE vir depois de todas as rotas da API
app.get('*', (req, res, next) => {
    // Pular rotas da API para evitar conflitos
    if (req.path.startsWith('/api/')) {
        return next();
    }
    // Servir o index.html para qualquer outra rota que não seja um arquivo estático ou API
    const indexPath = path_1.default.join(__dirname, '../dist/index.html');
    if (fs_1.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        // Se o index.html não existe, o frontend não foi buildado corretamente
        res.status(500).json({ error: 'Arquivo principal do frontend não encontrado.' });
    }
});
// Middleware de Erro Global
// Deve ser o último middleware adicionado
app.use((err, req, res, next) => {
    console.error('[ERRO GLOBAL]', {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        errorName: err.name,
        errorMessage: err.message,
    });
    // Tratamento específico para erros de CORS
    if (err.message === 'Não permitido por CORS') {
        return res.status(403).json({
            success: false,
            error: 'Acesso negado pela política de CORS.'
        });
    }
    if (err instanceof multer_1.default.MulterError) {
        return res.status(400).json({
            success: false,
            error: `Erro de upload: ${err.message}.`,
            code: err.code
        });
    }
    if (res.headersSent) {
        return next(err);
    }
    res.status(err.status || 500).json({
        success: false,
        error: 'Ocorreu um erro inesperado no servidor. Por favor, tente novamente mais tarde.'
    });
});
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
app.listen(PORT, HOST, () => {
    console.log(`Servidor backend rodando em http://${HOST}:${PORT}`);
    console.log(`Frontend será servido em: http://localhost:${PORT}/`);
    console.log(`API disponível em: http://localhost:${PORT}/api/*`);
    console.log(`Uploads serão salvos em: ${path_1.default.join(__dirname, '../public/uploads')}`);
    console.log(`Arquivos servidos de: /uploads/*`);
});
//# sourceMappingURL=server.js.map