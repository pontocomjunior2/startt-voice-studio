import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// Calcular __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Especificar o caminho para o arquivo .env na raiz do projeto
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
console.log(`[Servidor Express] Tentando carregar .env de: ${envPath}`);
console.log('[Servidor Express] VITE_SUPABASE_URL lido:', process.env.VITE_SUPABASE_URL ? 'Definido' : 'NÃO DEFINIDO');
console.log('[Servidor Express] VITE_SUPABASE_ANON_KEY lido:', process.env.VITE_SUPABASE_ANON_KEY ? 'Definido' : 'NÃO DEFINIDO');
console.log('[Servidor Express] SUPABASE_SERVICE_ROLE_KEY lido:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Definido' : 'NÃO DEFINIDO');
const app = express();
const PORT = process.env.PORT || 3001; // Porta para o servidor backend
// Habilitar CORS para todas as origens (em produção, restrinja para o seu domínio frontend)
app.use(cors());
// Middleware para servir arquivos estáticos da pasta 'public' (onde os uploads estarão)
// Isso é útil se você acessar o backend diretamente ou se o frontend buscar os arquivos por aqui.
// O servidor Vite também servirá a pasta 'public' do projeto raiz.
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
// Configuração do Multer para armazenamento de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ler o nome do cliente dos PARÂMETROS da URL
        const clientName = req.params.clientName || 'unknown_client';
        console.log('[Multer Destination] clientName (from PARAMS) determinado:', clientName);
        const sanitizedClientName = clientName
            .toLowerCase()
            .replace(/\s+/g, '_<0xC2><0xA0>') // Atenção: pode precisar ajustar sanitização para URL params
            .replace(/[^a-z0-9_.-]/g, '');
        const uploadPath = path.join(__dirname, '../public/uploads/audios', sanitizedClientName);
        // Criar o diretório do cliente se não existir
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Gerar um nome de arquivo único para evitar sobrescritas
        // Manter a extensão original do arquivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExt = path.extname(file.originalname);
        const originalNameWithoutExt = path.basename(file.originalname, fileExt);
        // Poderia usar o ID do pedido aqui se enviado na requisição
        const finalFileName = `${originalNameWithoutExt}-${uniqueSuffix}${fileExt}`;
        cb(null, finalFileName);
    }
});
const upload = multer({
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
app.post('/api/upload/:clientName', (req, res) => {
    // Usar closure para acessar upload e tratar erros
    const uploader = upload.single('audioFile');
    uploader(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Um erro do Multer ocorreu durante o upload.
            console.error("Erro do Multer:", err);
            return res.status(400).send({ message: `Erro do Multer: ${err.message}` });
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
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
// --- INÍCIO NOVA ROTA PARA UPLOAD DE REVISÕES ---
const revisaoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const clientUsername = req.params.clientUsername; // MODIFICADO: Ler dos parâmetros da URL
        if (!clientUsername) {
            return cb(new Error("Username do cliente não fornecido na URL para o diretório de revisão."), "");
        }
        const sanitizedClientName = clientUsername
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_.-]/g, '');
        const baseUploadDir = path.join(__dirname, '../public/uploads/audios');
        const clientDir = path.join(baseUploadDir, sanitizedClientName);
        const revisoesDir = path.join(clientDir, 'revisoes');
        if (!fs.existsSync(revisoesDir)) {
            fs.mkdirSync(revisoesDir, { recursive: true });
            console.log(`[Revisao Multer Destination] Diretório de revisões criado: ${revisoesDir}`);
        }
        cb(null, revisoesDir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const originalNameWithoutExt = path.parse(file.originalname).name;
        const fileExt = path.parse(file.originalname).ext;
        // Sanitiza o nome do arquivo original para evitar caracteres problemáticos
        const sanitizedOriginalName = originalNameWithoutExt.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const finalFileName = `${sanitizedOriginalName}-${timestamp}${fileExt}`;
        cb(null, finalFileName);
    }
});
const uploadRevisaoAudio = multer({
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
            if (absoluteFilePathParaRollback && fs.existsSync(absoluteFilePathParaRollback)) {
                fs.unlink(absoluteFilePathParaRollback, (unlinkErr) => {
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
app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
    console.log(`Uploads serão salvos em: ${path.join(__dirname, '../public/uploads')}`);
    console.log(`Arquivos servidos de: /uploads/*`);
});
//# sourceMappingURL=server.js.map