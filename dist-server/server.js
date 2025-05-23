"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var multer_1 = __importDefault(require("multer"));
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var cors_1 = __importDefault(require("cors"));
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv_1 = __importDefault(require("dotenv"));
// Especificar o caminho para o arquivo .env na raiz do projeto
var envPath = path_1.default.resolve(__dirname, '../.env');
dotenv_1.default.config({ path: envPath });
console.log("[Servidor Express] Tentando carregar .env de: ".concat(envPath));
console.log('[Servidor Express] VITE_SUPABASE_URL lido:', process.env.VITE_SUPABASE_URL ? 'Definido' : 'NÃO DEFINIDO');
console.log('[Servidor Express] VITE_SUPABASE_ANON_KEY lido:', process.env.VITE_SUPABASE_ANON_KEY ? 'Definido' : 'NÃO DEFINIDO');
console.log('[Servidor Express] SUPABASE_SERVICE_ROLE_KEY lido:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Definido' : 'NÃO DEFINIDO');
var app = (0, express_1.default)();
var PORT = process.env.PORT || 3001; // Porta para o servidor backend
// Habilitar CORS para todas as origens (em produção, restrinja para o seu domínio frontend)
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
// Middleware para servir arquivos estáticos da pasta 'public' (onde os uploads estarão)
// Isso é útil se você acessar o backend diretamente ou se o frontend buscar os arquivos por aqui.
// O servidor Vite também servirá a pasta 'public' do projeto raiz.
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../public/uploads')));
// ================= ROTAS DE UPLOAD DEVEM VIR ANTES DE QUALQUER BODY PARSER =================
// Upload de avatar do locutor
var avatarStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        var uploadPath = path_1.default.join(__dirname, '../public/uploads/avatars');
        if (!fs_1.default.existsSync(uploadPath))
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        var uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        var ext = path_1.default.extname(file.originalname);
        cb(null, "avatar-".concat(uniqueSuffix).concat(ext));
    }
});
var uploadAvatar = (0, multer_1.default)({
    storage: avatarStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/'))
            cb(null, true);
        else
            cb(new Error('Apenas imagens são permitidas para avatar!'));
    }
});
app.post('/api/upload/avatar', uploadAvatar.single('avatar'), function (req, res) {
    if (!req.file) {
        res.status(400).json({ message: 'Nenhum arquivo enviado.' });
        return;
    }
    var url = "/uploads/avatars/".concat(req.file.filename);
    res.status(200).json({ url: url });
    return;
});
// Upload de demo de áudio do locutor (agora com nome customizado)
var demoStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        var uploadPath = path_1.default.join(__dirname, '../public/uploads/demos');
        if (!fs_1.default.existsSync(uploadPath))
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Receber nome do locutor e estilo via body ou query
        var nomeLocutor = req.body.nomeLocutor || req.query.nomeLocutor || 'locutor';
        var estilo = req.body.estilo || req.query.estilo || 'estilo';
        // Slugify para evitar caracteres inválidos
        nomeLocutor = String(nomeLocutor).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
        estilo = String(estilo).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
        var uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        var ext = path_1.default.extname(file.originalname);
        cb(null, "".concat(nomeLocutor, "-").concat(estilo, "-").concat(uniqueSuffix).concat(ext));
    }
});
var uploadDemo = (0, multer_1.default)({
    storage: demoStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('audio/'))
            cb(null, true);
        else
            cb(new Error('Apenas arquivos de áudio são permitidos para demo!'));
    }
});
app.post('/api/upload/demo', uploadDemo.single('demo'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var url, nomeLocutor, estilo, _a, locutores, locutorError, locutor_id, demoError, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!req.file) {
                    res.status(400).json({ message: 'Nenhum arquivo enviado.' });
                    return [2 /*return*/];
                }
                if (!supabase) {
                    res.status(500).json({ message: 'Supabase não configurado no backend.' });
                    return [2 /*return*/];
                }
                url = "/uploads/demos/".concat(req.file.filename);
                nomeLocutor = req.body.nomeLocutor || req.query.nomeLocutor;
                estilo = req.body.estilo || req.query.estilo;
                if (!nomeLocutor || !estilo) {
                    res.status(400).json({ message: 'nomeLocutor e estilo são obrigatórios.' });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, supabase
                        .from('locutores')
                        .select('id')
                        .ilike('nome', nomeLocutor)];
            case 2:
                _a = _b.sent(), locutores = _a.data, locutorError = _a.error;
                if (locutorError || !locutores || locutores.length === 0) {
                    res.status(404).json({ message: 'Locutor não encontrado para nome informado.' });
                    return [2 /*return*/];
                }
                locutor_id = locutores[0].id;
                return [4 /*yield*/, supabase
                        .from('locutor_demos')
                        .insert({
                        locutor_id: locutor_id,
                        estilo: estilo,
                        url: url,
                        data_criacao: new Date().toISOString(),
                    })];
            case 3:
                demoError = (_b.sent()).error;
                if (demoError) {
                    res.status(500).json({ message: 'Erro ao salvar demo no banco.', details: demoError.message });
                    return [2 /*return*/];
                }
                res.status(200).json({ url: url, nomeLocutor: nomeLocutor, estilo: estilo });
                return [3 /*break*/, 5];
            case 4:
                err_1 = _b.sent();
                res.status(500).json({ message: 'Erro inesperado ao salvar demo.', details: err_1.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Upload de Áudio Guia do Cliente
var guiaStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        var uploadPath = path_1.default.join(__dirname, '../public/uploads/guias');
        if (!fs_1.default.existsSync(uploadPath))
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        var uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        var ext = path_1.default.extname(file.originalname);
        cb(null, "audio-guia-".concat(uniqueSuffix).concat(ext));
    }
});
var uploadGuia = (0, multer_1.default)({
    storage: guiaStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('audio/'))
            cb(null, true);
        else
            cb(new Error('Apenas arquivos de áudio são permitidos para áudio guia!'));
    }
});
app.post('/api/upload-guia', uploadGuia.single('audioGuia'), function (req, res) {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
        return;
    }
    var filePath = "/uploads/guias/".concat(req.file.filename);
    res.status(200).json({ success: true, filePath: filePath });
});
// Upload de Áudio Guia da Revisão do Cliente
var guiaRevisaoStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        var uploadPath = path_1.default.join(__dirname, '../public/uploads/revisoes_guias');
        if (!fs_1.default.existsSync(uploadPath))
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        var uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        var ext = path_1.default.extname(file.originalname);
        cb(null, "audio-guia-revisao-".concat(uniqueSuffix).concat(ext));
    }
});
var uploadGuiaRevisao = (0, multer_1.default)({
    storage: guiaRevisaoStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('audio/'))
            cb(null, true);
        else
            cb(new Error('Apenas arquivos de áudio são permitidos para áudio guia de revisão!'));
    }
});
app.post('/api/upload-guia-revisao', uploadGuiaRevisao.single('audioGuia'), function (req, res) {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
        return;
    }
    var filePath = "/uploads/revisoes_guias/".concat(req.file.filename);
    res.status(200).json({ success: true, filePath: filePath });
});
// ================= FIM DAS ROTAS DE UPLOAD =================
// Adicionar body parser JSON para rotas de API que recebem JSON
app.use(express_1.default.json());
// Configuração do Multer para armazenamento de arquivos
var storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        // Ler o nome do cliente dos PARÂMETROS da URL
        var clientName = req.params.clientName || 'unknown_client';
        console.log('[Multer Destination] clientName (from PARAMS) determinado:', clientName);
        var sanitizedClientName = clientName
            .toLowerCase()
            .replace(/\s+/g, '_<0xC2><0xA0>') // Atenção: pode precisar ajustar sanitização para URL params
            .replace(/[^a-z0-9_.-]/g, '');
        var uploadPath = path_1.default.join(__dirname, '../public/uploads/audios', sanitizedClientName);
        // Criar o diretório do cliente se não existir
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Gerar um nome de arquivo único para evitar sobrescritas
        // Manter a extensão original do arquivo
        var uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        var fileExt = path_1.default.extname(file.originalname);
        var originalNameWithoutExt = path_1.default.basename(file.originalname, fileExt);
        // Poderia usar o ID do pedido aqui se enviado na requisição
        var finalFileName = "".concat(originalNameWithoutExt, "-").concat(uniqueSuffix).concat(fileExt);
        cb(null, finalFileName);
    }
});
var upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // Limite de 100MB por arquivo (ajuste conforme necessário)
    fileFilter: function (req, file, cb) {
        // Aceitar apenas arquivos de áudio
        if (!file.mimetype.startsWith('audio/')) {
            return cb(new Error('Apenas arquivos de áudio são permitidos!'));
        }
        cb(null, true);
    }
});
// Endpoint para upload de arquivos - AGORA COM :clientName NA ROTA
app.post('/api/upload/:clientName', function (req, res) {
    // Usar closure para acessar upload e tratar erros
    var uploader = upload.single('audioFile');
    uploader(req, res, function (err) {
        if (err instanceof multer_1.default.MulterError) {
            // Um erro do Multer ocorreu durante o upload.
            console.error("Erro do Multer:", err);
            return res.status(400).send({ message: "Erro do Multer: ".concat(err.message) });
        }
        else if (err) {
            // Um erro desconhecido ocorreu (ex: do fileFilter).
            console.error("Erro desconhecido no upload:", err);
            return res.status(400).send({ message: err.message || 'Erro ao processar arquivo.' });
        }
        // Se chegou aqui, o upload foi bem-sucedido (ou nenhum arquivo foi enviado)
        if (!req.file) {
            return res.status(400).send({ message: 'Nenhum arquivo enviado.' });
        }
        // Processar o arquivo e retornar o caminho
        // Ler o nome do cliente dos PARÂMETROS da URL
        var clientName = req.params.clientName || 'unknown_client';
        var sanitizedClientName = clientName
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_.-]/g, '');
        var relativeFilePath = "/uploads/audios/".concat(sanitizedClientName, "/").concat(req.file.filename);
        console.log('Arquivo recebido no backend:', req.file);
        console.log('Salvo em:', req.file.path);
        console.log('Caminho relativo retornado:', relativeFilePath);
        res.status(200).send({
            message: 'Arquivo enviado com sucesso!',
            filePath: relativeFilePath
        });
    });
});
// Importe seu cliente Supabase aqui. Exemplo:
// import { supabase } from './config/supabaseClient'; // Você precisará criar este arquivo ou inicializar o Supabase aqui.
// Por enquanto, vamos assumir que 'supabase' estará disponível no escopo.
// Substitua pela sua inicialização real do Supabase no backend:
var supabaseUrl = process.env.VITE_SUPABASE_URL;
// MODIFICADO: Usar a SERVICE_ROLE_KEY para o cliente do servidor
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Variáveis de ambiente Supabase (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) não definidas no servidor.");
    // process.exit(1); // Ou trate de outra forma
}
// @ts-ignore TODO: Add proper Supabase client initialization for server-side
var supabase = supabaseUrl && supabaseServiceKey ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey) : null;
// --- INÍCIO NOVA ROTA PARA UPLOAD DE REVISÕES ---
var revisaoStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        var clientUsername = req.params.clientUsername; // MODIFICADO: Ler dos parâmetros da URL
        if (!clientUsername) {
            return cb(new Error("Username do cliente não fornecido na URL para o diretório de revisão."), "");
        }
        var sanitizedClientName = clientUsername
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_.-]/g, '');
        var baseUploadDir = path_1.default.join(__dirname, '../public/uploads/audios');
        var clientDir = path_1.default.join(baseUploadDir, sanitizedClientName);
        var revisoesDir = path_1.default.join(clientDir, 'revisoes');
        if (!fs_1.default.existsSync(revisoesDir)) {
            fs_1.default.mkdirSync(revisoesDir, { recursive: true });
            console.log("[Revisao Multer Destination] Diret\u00F3rio de revis\u00F5es criado: ".concat(revisoesDir));
        }
        cb(null, revisoesDir);
    },
    filename: function (req, file, cb) {
        var timestamp = Date.now();
        var originalNameWithoutExt = path_1.default.parse(file.originalname).name;
        var fileExt = path_1.default.parse(file.originalname).ext;
        // Sanitiza o nome do arquivo original para evitar caracteres problemáticos
        var sanitizedOriginalName = originalNameWithoutExt.replace(/[^a-zA-Z0-9_.-]/g, '_');
        var finalFileName = "".concat(sanitizedOriginalName, "-").concat(timestamp).concat(fileExt);
        cb(null, finalFileName);
    }
});
var uploadRevisaoAudio = (0, multer_1.default)({
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
app.post('/api/revisoes/processar-upload/:clientUsername', function (req, res) {
    uploadRevisaoAudio(req, res, function (multerError) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, solicitacaoId, adminFeedback, novoStatusRevisao, pedidoId, clientUsername, relativeFilePathForDb, absoluteFilePathParaRollback, sanitizedClientName, _b, existingVersionsCount, countError, proximoNumeroVersao, insertError, updateSolicitacaoPayload, updateSolError, novoStatusPedidoPrincipal, updatePedidoError, dbError_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (multerError) {
                        console.error('Erro no upload de revisão com Multer:', multerError);
                        return [2 /*return*/, res.status(400).json({
                                success: false,
                                failure: multerError.message || 'Erro no upload do arquivo de revisão.'
                            })];
                    }
                    _a = req.body, solicitacaoId = _a.solicitacaoId, adminFeedback = _a.adminFeedback, novoStatusRevisao = _a.novoStatusRevisao, pedidoId = _a.pedidoId;
                    clientUsername = req.params.clientUsername;
                    console.log('[API /processar-upload REVISAO] clientUsername (from URL):', clientUsername);
                    console.log('[API /processar-upload REVISAO] Body recebido:', req.body);
                    if (req.file) {
                        console.log('[API /processar-upload REVISAO] Arquivo recebido:', req.file);
                    }
                    if (!solicitacaoId || !novoStatusRevisao || !clientUsername || !pedidoId) {
                        return [2 /*return*/, res.status(400).json({
                                success: false,
                                failure: 'Dados insuficientes para processar a revisão (solicitacaoId, novoStatusRevisao, clientUsername, pedidoId são obrigatórios).'
                            })];
                    }
                    if (!supabase) {
                        console.error('[API /processar-upload REVISAO] Cliente Supabase não inicializado no servidor.');
                        return [2 /*return*/, res.status(500).json({
                                success: false,
                                failure: 'Erro interno do servidor: Cliente Supabase não configurado.'
                            })];
                    }
                    relativeFilePathForDb = null;
                    absoluteFilePathParaRollback = null;
                    if (req.file) {
                        sanitizedClientName = clientUsername.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_.-]/g, '');
                        relativeFilePathForDb = "/uploads/audios/".concat(sanitizedClientName, "/revisoes/").concat(req.file.filename);
                        absoluteFilePathParaRollback = req.file.path;
                    }
                    else if (novoStatusRevisao === 'revisado_finalizado') {
                        console.error("[API /processar-upload REVISAO] Tentativa de processar '".concat(novoStatusRevisao, "' sem arquivo. Isso n\u00E3o deveria ocorrer aqui."));
                        throw new Error('Arquivo de áudio é obrigatório para finalizar a revisão neste ponto da API.');
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 10, , 11]);
                    if (!(relativeFilePathForDb && req.file)) return [3 /*break*/, 4];
                    return [4 /*yield*/, supabase
                            .from('versoes_audio_revisao')
                            .select('id', { count: 'exact', head: true })
                            .eq('solicitacao_id', solicitacaoId)];
                case 2:
                    _b = _c.sent(), existingVersionsCount = _b.count, countError = _b.error;
                    if (countError) {
                        console.error('[API /processar-upload REVISAO] Erro ao contar versões:', countError);
                        throw new Error("Erro ao determinar n\u00FAmero da vers\u00E3o: ".concat(countError.message));
                    }
                    proximoNumeroVersao = (existingVersionsCount || 0) + 1;
                    return [4 /*yield*/, supabase.from('versoes_audio_revisao').insert({
                            solicitacao_id: solicitacaoId,
                            audio_url: relativeFilePathForDb,
                            comentarios_admin: adminFeedback || null,
                            enviado_em: new Date().toISOString(),
                            numero_versao: proximoNumeroVersao,
                        })];
                case 3:
                    insertError = (_c.sent()).error;
                    if (insertError) {
                        console.error('[API /processar-upload REVISAO] Erro ao inserir em versoes_audio_revisao:', insertError);
                        throw new Error("Erro ao salvar detalhes do \u00E1udio: ".concat(insertError.message));
                    }
                    console.log("[API /processar-upload REVISAO] \u00C1udio de revis\u00E3o salvo no DB: ".concat(relativeFilePathForDb, ", Vers\u00E3o: ").concat(proximoNumeroVersao));
                    return [3 /*break*/, 5];
                case 4:
                    if (novoStatusRevisao === 'revisado_finalizado' && !req.file) {
                        console.error("[API /processar-upload REVISAO] Tentativa de processar '".concat(novoStatusRevisao, "' sem arquivo. Isso n\u00E3o deveria ocorrer aqui."));
                        throw new Error('Arquivo de áudio é obrigatório para finalizar a revisão neste ponto da API.');
                    }
                    _c.label = 5;
                case 5:
                    updateSolicitacaoPayload = {
                        status_revisao: novoStatusRevisao,
                        admin_feedback: adminFeedback || null,
                    };
                    // Adicionar data_conclusao_revisao apenas se o status for finalizador
                    if (novoStatusRevisao === 'revisado_finalizado' || novoStatusRevisao === 'negada') {
                        updateSolicitacaoPayload.data_conclusao_revisao = new Date().toISOString();
                    }
                    console.log('[API /processar-upload REVISAO] Payload para atualizar solicitacoes_revisao:', updateSolicitacaoPayload);
                    return [4 /*yield*/, supabase.from('solicitacoes_revisao')
                            .update(updateSolicitacaoPayload)
                            .eq('id', solicitacaoId)];
                case 6:
                    updateSolError = (_c.sent()).error;
                    if (updateSolError) {
                        console.error('[API /processar-upload REVISAO] Erro ao atualizar solicitacoes_revisao:', updateSolError);
                        throw new Error("Erro ao atualizar status da solicita\u00E7\u00E3o: ".concat(updateSolError.message));
                    }
                    console.log("[API /processar-upload REVISAO] solicitacoes_revisao atualizada para status: ".concat(novoStatusRevisao));
                    novoStatusPedidoPrincipal = null;
                    if (novoStatusRevisao === 'revisado_finalizado' || novoStatusRevisao === 'negada') {
                        novoStatusPedidoPrincipal = 'concluido';
                    }
                    else if (novoStatusRevisao === 'info_solicitada_ao_cliente') {
                        novoStatusPedidoPrincipal = 'aguardando_cliente';
                    }
                    else if (novoStatusRevisao === 'em_andamento_admin') {
                        novoStatusPedidoPrincipal = 'em_revisao';
                    }
                    if (!novoStatusPedidoPrincipal) return [3 /*break*/, 8];
                    console.log("[API /processar-upload REVISAO] Payload para atualizar pedidos: { status: ".concat(novoStatusPedidoPrincipal, " }, pedidoId: ").concat(pedidoId));
                    return [4 /*yield*/, supabase.from('pedidos')
                            .update({ status: novoStatusPedidoPrincipal })
                            .eq('id', pedidoId)];
                case 7:
                    updatePedidoError = (_c.sent()).error;
                    if (updatePedidoError) {
                        console.error("[API /processar-upload REVISAO] Erro ao atualizar pedidos.status para ".concat(novoStatusPedidoPrincipal, ":"), updatePedidoError);
                        console.warn("[API /processar-upload REVISAO] Revis\u00E3o processada, mas falha ao atualizar status do pedido principal ".concat(pedidoId, " para ").concat(novoStatusPedidoPrincipal, "."));
                    }
                    else {
                        console.log("[API /processar-upload REVISAO] Pedido ".concat(pedidoId, " atualizado para status: ").concat(novoStatusPedidoPrincipal));
                    }
                    return [3 /*break*/, 9];
                case 8:
                    console.warn("[API /processar-upload REVISAO] Nenhum novo status para o pedido principal foi definido para o status de revis\u00E3o: ".concat(novoStatusRevisao));
                    _c.label = 9;
                case 9: return [2 /*return*/, res.status(200).json({
                        success: true,
                        message: 'Revisão processada com sucesso.',
                        filePath: relativeFilePathForDb
                    })];
                case 10:
                    dbError_1 = _c.sent();
                    console.error('[API /processar-upload REVISAO] Erro nas operações de banco de dados:', dbError_1);
                    if (absoluteFilePathParaRollback && fs_1.default.existsSync(absoluteFilePathParaRollback)) {
                        fs_1.default.unlink(absoluteFilePathParaRollback, function (unlinkErr) {
                            if (unlinkErr)
                                console.error('[API /processar-upload REVISAO] Erro ao tentar remover arquivo após falha no DB:', unlinkErr);
                            else
                                console.log('[API /processar-upload REVISAO] Arquivo local removido devido à falha no DB (rollback).');
                        });
                    }
                    return [2 /*return*/, res.status(500).json({
                            success: false,
                            failure: "Erro ao processar dados da revis\u00E3o no banco: ".concat(dbError_1.message || 'Erro desconhecido')
                        })];
                case 11: return [2 /*return*/];
            }
        });
    }); });
});
// --- FIM NOVA ROTA PARA UPLOAD DE REVISÕES ---
// GET demos de um locutor
app.get('/api/locutor/:id/demos', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var locutor_id, _a, data, error, err_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                locutor_id = req.params.id;
                if (!supabase) {
                    res.status(500).json({ message: 'Supabase não configurado no backend.' });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, supabase
                        .from('locutor_demos')
                        .select('id, estilo, url, data_criacao')
                        .eq('locutor_id', locutor_id)
                        .order('data_criacao', { ascending: false })];
            case 2:
                _a = _b.sent(), data = _a.data, error = _a.error;
                if (error) {
                    res.status(500).json({ message: 'Erro ao buscar demos.', details: error.message });
                    return [2 /*return*/];
                }
                res.status(200).json({ demos: data });
                return [3 /*break*/, 4];
            case 3:
                err_2 = _b.sent();
                res.status(500).json({ message: 'Erro inesperado ao buscar demos.', details: err_2.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST criar demo para locutor
app.post('/api/locutor/:id/demos', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var locutor_id, _a, estilo, url, error, err_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                locutor_id = req.params.id;
                _a = req.body, estilo = _a.estilo, url = _a.url;
                if (!supabase) {
                    res.status(500).json({ message: 'Supabase não configurado no backend.' });
                    return [2 /*return*/];
                }
                if (!locutor_id || !estilo || !url) {
                    res.status(400).json({ message: 'locutor_id, estilo e url são obrigatórios.' });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, supabase
                        .from('locutor_demos')
                        .insert({
                        locutor_id: locutor_id,
                        estilo: estilo,
                        url: url,
                        data_criacao: new Date().toISOString(),
                    })];
            case 2:
                error = (_b.sent()).error;
                if (error) {
                    res.status(500).json({ message: 'Erro ao salvar demo.', details: error.message });
                    return [2 /*return*/];
                }
                res.status(200).json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                err_3 = _b.sent();
                res.status(500).json({ message: 'Erro inesperado ao salvar demo.', details: err_3.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
var supabaseAdmin = (0, supabase_js_1.createClient)(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// ROTA: Exclusão total de usuário (Auth + profiles)
app.post('/api/admin/delete-user', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, authError, _a, solicitacoes, solicitacoesError, solicitacaoIds, audioRevError, revisaoError, lotesError, pedidosError, dbError;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                userId = req.body.userId;
                if (!userId) {
                    res.status(400).json({ error: 'userId obrigatório' });
                    return [2 /*return*/];
                }
                if (process.env.ADMIN_SECRET && req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
                    res.status(403).json({ error: 'Acesso negado.' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, supabaseAdmin.auth.admin.deleteUser(userId)];
            case 1:
                authError = (_b.sent()).error;
                if (authError) {
                    console.error('[DeleteUser] Erro ao deletar do Auth:', authError);
                    // Se for erro 500 (Database error deleting user), apenas loga e segue
                    if (authError.status !== 500) {
                        res.status(500).json({ error: authError.message });
                        return [2 /*return*/];
                    }
                    console.warn('[DeleteUser] Ignorando erro 500 do Auth e continuando exclusão no banco.');
                }
                return [4 /*yield*/, supabaseAdmin
                        .from('solicitacoes_revisao')
                        .select('id')
                        .eq('user_id', userId)];
            case 2:
                _a = _b.sent(), solicitacoes = _a.data, solicitacoesError = _a.error;
                if (solicitacoesError) {
                    console.error('[DeleteUser] Erro ao buscar solicitacoes_revisao:', solicitacoesError);
                    res.status(500).json({ error: 'Erro ao buscar solicitações de revisão: ' + solicitacoesError.message });
                    return [2 /*return*/];
                }
                solicitacaoIds = (solicitacoes || []).map(function (s) { return s.id; });
                if (!(solicitacaoIds.length > 0)) return [3 /*break*/, 4];
                return [4 /*yield*/, supabaseAdmin
                        .from('versoes_audio_revisao')
                        .delete()
                        .in('solicitacao_id', solicitacaoIds)];
            case 3:
                audioRevError = (_b.sent()).error;
                if (audioRevError) {
                    console.error('[DeleteUser] Erro ao deletar versoes_audio_revisao:', audioRevError);
                    res.status(500).json({ error: 'Erro ao deletar versões de áudio de revisão: ' + audioRevError.message });
                    return [2 /*return*/];
                }
                _b.label = 4;
            case 4: return [4 /*yield*/, supabaseAdmin.from('solicitacoes_revisao').delete().eq('user_id', userId)];
            case 5:
                revisaoError = (_b.sent()).error;
                if (revisaoError) {
                    console.error('[DeleteUser] Erro ao deletar solicitacoes_revisao:', revisaoError);
                    res.status(500).json({ error: 'Erro ao deletar solicitações de revisão: ' + revisaoError.message });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, supabaseAdmin.from('lotes_creditos').delete().eq('user_id', userId)];
            case 6:
                lotesError = (_b.sent()).error;
                if (lotesError) {
                    console.error('[DeleteUser] Erro ao deletar lotes_creditos:', lotesError);
                    res.status(500).json({ error: 'Erro ao deletar lotes de créditos: ' + lotesError.message });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, supabaseAdmin.from('pedidos').delete().eq('user_id', userId)];
            case 7:
                pedidosError = (_b.sent()).error;
                if (pedidosError) {
                    console.error('[DeleteUser] Erro ao deletar pedidos:', pedidosError);
                    res.status(500).json({ error: 'Erro ao deletar pedidos: ' + pedidosError.message });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, supabaseAdmin.from('profiles').delete().eq('id', userId)];
            case 8:
                dbError = (_b.sent()).error;
                if (dbError) {
                    console.error('[DeleteUser] Erro ao deletar profile:', dbError);
                    res.status(500).json({ error: dbError.message });
                    return [2 /*return*/];
                }
                res.json({ success: true });
                return [2 /*return*/];
        }
    });
}); });
app.listen(PORT, function () {
    console.log("Servidor backend rodando na porta ".concat(PORT));
    console.log("Uploads ser\u00E3o salvos em: ".concat(path_1.default.join(__dirname, '../public/uploads')));
    console.log("Arquivos servidos de: /uploads/*");
});
//# sourceMappingURL=server.js.map