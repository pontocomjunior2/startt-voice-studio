# 📁 Configuração de Volumes Persistentes - EasyPanel

## 🎯 Objetivo
Manter todos os arquivos de upload **permanentemente**, mesmo após novos deploys.

## ⚙️ Configuração no EasyPanel

### 1. Acesse a seção "Mounts"
Na interface do EasyPanel, vá para a aba **"Mounts"** da sua aplicação.

### 2. Adicione os Volumes

#### **Volume 1: Uploads de Áudio**
```
Tipo: Volume
Nome: uploads-storage
Mount Path: /app/public/uploads
```

#### **Volume 2: Arquivos Temporários**
```
Tipo: Volume
Nome: temp-storage  
Mount Path: /app/temp
```

### 3. Salve e Deploy
Após adicionar os volumes, faça o deploy da aplicação.

## 📂 O que cada volume armazena

### `/app/public/uploads` (uploads-storage)
```
├── audios/              ← Áudios dos clientes
│   └── [cliente]/
│       ├── arquivo.mp3
│       └── revisoes/
├── avatars/             ← Avatars dos locutores
├── demos/               ← Demos dos locutores  
├── guias/               ← Áudios guia
└── revisoes_guias/      ← Revisões de áudio guia
```

### `/app/temp` (temp-storage)
```
└── uploads/             ← Chunks temporários de upload
```

## ✅ Benefícios

- 🔒 **Arquivos seguros**: Nunca são perdidos
- 🚀 **Performance**: Acesso local rápido
- 💰 **Sem custos**: Incluído no EasyPanel
- 🏠 **Local**: Como você desejou

## 🔍 Verificação

Após o deploy, você pode verificar se os volumes estão funcionando:

1. **Console do EasyPanel**: Acesse o terminal
2. **Execute**: `ls -la /app/public/uploads`
3. **Deve mostrar**: As pastas criadas automaticamente

## ⚠️ Importante

- Configure os volumes **ANTES** do primeiro deploy
- Se já fez deploy sem volumes, os arquivos existentes serão perdidos
- Uma vez configurado, os volumes persistem para sempre

---

**🎯 Resultado**: Armazenamento local persistente, exatamente como você queria! 