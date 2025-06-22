# 🔍 DEBUG HEALTH CHECK - EasyPanel

## ✅ **STATUS ATUAL:**
- ✅ Servidor iniciando corretamente na porta 80
- ✅ Variáveis de ambiente carregadas
- ✅ Rotas configuradas
- ❌ **EasyPanel não consegue fazer health check**

## 🚨 **PROBLEMA: "Service is not reachable"**

Isso indica que o EasyPanel não está conseguindo acessar o health check do container.

---

## 🔍 **VERIFICAÇÕES IMEDIATAS:**

### **1. VERIFICAR CONFIGURAÇÃO DO HEALTH CHECK NO EASYPANEL:**

#### **Opção A: Health Check HTTP (RECOMENDADO)**
```bash
# Path: /api/health
# Port: 80
# Method: GET
# Timeout: 30s
# Interval: 30s
# Retries: 3
```

#### **Opção B: Health Check TCP**
```bash
# Port: 80
# Timeout: 10s
# Interval: 30s
# Retries: 3
```

### **2. VERIFICAR SE O CONTAINER ESTÁ BINDANDO CORRETAMENTE:**

Nos logs, deveria aparecer:
```bash
✅ Servidor backend rodando na porta 80
✅ API disponível em: http://localhost:80/api/*
```

### **3. DOCKERFILE - VERIFICAR EXPOSE E CMD:**

```dockerfile
# Deve ter:
EXPOSE 80
CMD ["node", "dist-server/server.js"]

# NÃO deve ter comentários inline no CMD
```

---

## 🛠️ **SOLUÇÕES POSSÍVEIS:**

### **SOLUÇÃO 1: Melhorar Health Check Route**

Adicionar logs mais detalhados na rota de health:

```typescript
app.get('/api/health', (req, res) => {
  console.log('[Health Check] Requisição recebida');
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
  console.log('[Health Check] Resposta enviada');
});
```

### **SOLUÇÃO 2: Adicionar Health Check na Raiz**

```typescript
// Health check alternativo na raiz
app.get('/health', (req, res) => {
  console.log('[Health Check Root] Requisição recebida');
  res.status(200).json({ status: 'ok' });
});
```

### **SOLUÇÃO 3: Bind 0.0.0.0 (JÁ CONFIGURADO)**

```typescript
app.listen(PORT, '0.0.0.0', () => {
  // Já está correto
});
```

---

## 🔧 **CONFIGURAÇÃO DO EASYPANEL:**

### **HEALTH CHECK RECOMENDADO:**

```yaml
# No EasyPanel, configurar:
healthcheck:
  path: /api/health
  port: 80
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

**OU configuração alternativa:**

```yaml
healthcheck:
  path: /health
  port: 80
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

---

## 🚀 **AÇÕES IMEDIATAS:**

### **1. VERIFICAR CONFIGURAÇÃO DO HEALTH CHECK:**
- **Vá para**: EasyPanel > Seu Service > Settings > Health Check
- **Configure**:
  - **Path**: `/api/health`
  - **Port**: `80`
  - **Method**: `GET`
  - **Timeout**: `30`
  - **Interval**: `30`
  - **Retries**: `3`
  - **Start Period**: `60`

### **2. SE NÃO FUNCIONAR, TENTE:**
- **Path**: `/health` (raiz)
- **Port**: `80`

### **3. MONITORAR LOGS:**
Após configurar, monitore os logs para ver se aparecem:
```bash
[Health Check] Requisição recebida
[Health Check] Resposta enviada
```

### **4. TESTAR MANUALMENTE:**
Se o service estiver rodando, teste:
```bash
# Dentro do container ou via terminal EasyPanel:
curl http://localhost:80/api/health
curl http://localhost:80/health
```

---

## 🎯 **DIAGNÓSTICO FINAL:**

### **SE AINDA NÃO FUNCIONAR:**

1. **Desabilitar Health Check temporariamente** no EasyPanel
2. **Verificar se o service fica "running"** sem health check
3. **Testar acesso externo**: `https://startt.pontocomaudio.net/api/health`
4. **Reativar health check** com configuração correta

---

## 💡 **POSSÍVEL CAUSA RAIZ:**

**EasyPanel pode estar fazendo health check antes do servidor terminar de inicializar**

### **Solução**: 
- **Aumentar**: `start_period: 120s` (2 minutos)
- **Permitir**: Mais tempo para o servidor estar 100% pronto

---

## 🔍 **PRÓXIMOS PASSOS:**

1. ✅ Configurar health check no EasyPanel
2. ✅ Monitorar logs
3. ✅ Testar manualmente se necessário
4. ✅ Ajustar timeouts se necessário

**Esta configuração deve resolver o problema de "Service is not reachable"!** 🚀 