import express from 'express';
import multer from 'multer';

const app = express();
const PORT = 3002;

app.post('/api/upload/demo', multer().any(), (req, res) => {
  console.log('---- NOVO UPLOAD ----');
  if (Array.isArray(req.files)) {
    console.log('req.files:', req.files);
    req.files.forEach((f, i) => {
      console.log(`Arquivo[${i}]: fieldname=${f.fieldname}, originalname=${f.originalname}, mimetype=${f.mimetype}`);
    });
  } else {
    console.log('req.files NÃO é array:', req.files);
  }
  res.status(200).json({ files: req.files });
});

app.listen(PORT, () => {
  console.log(`Servidor de teste rodando na porta ${PORT}`);
});