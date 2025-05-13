import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
// Calcular __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
    console.log(`Uploads serão salvos em: ${path.join(__dirname, '../public/uploads')}`);
    console.log(`Arquivos servidos de: /uploads/*`);
});
//# sourceMappingURL=server.js.map