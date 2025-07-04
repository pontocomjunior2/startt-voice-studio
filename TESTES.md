# 🧪 Sistema de Testes Automatizados - PontoComAudio

## 📋 Visão Geral

Este documento descreve o sistema completo de testes automatizados implementado no PontoComAudio, garantindo qualidade e confiabilidade da aplicação.

## 🛠 Stack de Testes

### Ferramentas Principais
- **Vitest** - Framework de testes unitários e de integração
- **React Testing Library** - Testes de componentes React
- **MSW (Mock Service Worker)** - Mock de APIs externas
- **GitHub Actions** - CI/CD automatizado

### Tipos de Teste Implementados

#### 1. 🔧 Testes Unitários
Testam funções isoladas e componentes individuais:
- ✅ `src/utils/__tests__/creditUtils.test.ts` - Cálculos de créditos
- ✅ `src/utils/__tests__/locutionTimeUtils.test.ts` - Cálculos de tempo
- ✅ `src/utils/__tests__/messageUtils.test.ts` - Mensagens do sistema

#### 2. 🧩 Testes de Componentes
Testam comportamento da interface React:
- ✅ `src/components/__tests__/theme-toggle.test.tsx` - Toggle de tema

#### 3. 🔗 Testes de Integração
Testam fluxos completos com múltiplos componentes:
- ✅ Hooks de React Query com mocks de API
- ✅ Integração entre componentes e contextos

## 🚀 Como Executar os Testes

### Comandos Disponíveis

```bash
# Executar todos os testes uma vez
npm run test:run

# Executar testes em modo watch (desenvolvimento)
npm run test:watch

# Executar testes com interface visual
npm run test:ui

# Executar testes com cobertura
npm run test:coverage

# Executar apenas testes específicos
npm run test -- creditUtils
```

### Executar Testes Localmente

```bash
# 1. Instalar dependências (se ainda não fez)
npm install

# 2. Executar todos os testes
npm run test:run

# 3. Ver relatório de cobertura
npm run test:coverage
```

## 📊 Cobertura de Testes

### Funcionalidades Testadas

#### ✅ Sistema de Créditos
- Cálculo de créditos baseado no texto
- Validação de saldo suficiente
- Formatação de números

#### ✅ Cálculos de Tempo
- Estimativa de tempo de locução
- Diferentes velocidades de fala
- Formatação de tempo (MM:SS)

#### ✅ Interface de Usuário
- Componentes React básicos
- Toggle de tema
- Renderização correta

#### 🔄 Em Desenvolvimento
- Fluxo de autenticação completo
- Sistema de pagamentos (sandbox)
- Upload e processamento de arquivos
- Geração de áudio IA

## 🎯 Testes Críticos por Funcionalidade

### 💳 Sistema de Pagamentos
```typescript
// Exemplo de teste de pagamento
it('deve processar pagamento PIX corretamente', async () => {
  const pagamento = await processarPagamentoPIX({
    valor: 100.00,
    email: 'test@example.com'
  });
  
  expect(pagamento.status).toBe('pending');
  expect(pagamento.qr_code).toBeDefined();
});
```

### 🎵 Geração de Áudio
```typescript
// Exemplo de teste de IA
it('deve gerar áudio com IA', async () => {
  const audio = await gerarAudioIA({
    texto: 'Teste de locução',
    voz: 'alice',
    velocidade: 'normal'
  });
  
  expect(audio.url).toBeDefined();
  expect(audio.duracao).toBeGreaterThan(0);
});
```

### 👤 Autenticação
```typescript
// Exemplo de teste de auth
it('deve fazer login corretamente', async () => {
  const { user } = await login({
    email: 'test@example.com',
    password: 'senha123'
  });
  
  expect(user.id).toBeDefined();
  expect(user.email).toBe('test@example.com');
});
```

## 🔄 CI/CD Automático

### GitHub Actions
O sistema executa automaticamente:

1. **🔍 Testes Unitários** - Em cada push/PR
2. **🏗️ Build Testing** - Verifica se o código compila
3. **🔒 Segurança** - Auditoria de dependências
4. **🐳 Docker Build** - Testa criação da imagem

### Branches Monitoradas
- `main` - Produção
- `develop` - Desenvolvimento
- `feat/*` - Features em desenvolvimento

## 📝 Escrevendo Novos Testes

### Estrutura Padrão

```typescript
import { describe, it, expect } from 'vitest';
import { funcaoParaTestar } from '../minha-funcao';

describe('MinhaFuncao', () => {
  describe('cenario específico', () => {
    it('deve fazer algo específico', () => {
      // Arrange
      const input = 'valor de teste';
      
      // Act
      const resultado = funcaoParaTestar(input);
      
      // Assert
      expect(resultado).toBe('valor esperado');
    });
  });
});
```

### Testes de Componentes React

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MeuComponente } from '../MeuComponente';

it('deve renderizar e responder a cliques', () => {
  render(<MeuComponente />);
  
  const botao = screen.getByRole('button');
  fireEvent.click(botao);
  
  expect(screen.getByText('Clicado!')).toBeInTheDocument();
});
```

## 🎯 Próximos Passos

### Testes E2E (End-to-End)
- [ ] Instalar Playwright
- [ ] Criar jornadas completas do usuário
- [ ] Testar fluxos críticos (registro → compra → pedido)

### Testes de Performance
- [ ] Testes de carga da API
- [ ] Monitoramento de tempo de resposta
- [ ] Otimização baseada em métricas

### Monitoramento em Produção
- [ ] Sentry para erros em tempo real
- [ ] LogRocket para replay de sessões
- [ ] Alertas automáticos para falhas

## 🆘 Troubleshooting

### Problemas Comuns

**Testes falhando por timeout:**
```bash
# Aumentar timeout do Vitest
npm run test -- --testTimeout=30000
```

**Problemas com mocks:**
```bash
# Limpar cache do Vitest
npx vitest run --clearCache
```

**Erro de dependências:**
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

## 📈 Métricas de Qualidade

### Objetivos de Cobertura
- **Funções Críticas**: 100%
- **Componentes UI**: 80%
- **Hooks**: 90%
- **Utilitários**: 95%

### Status Atual
- ✅ Testes Unitários: **22 passando**
- ✅ Build Frontend: **Funcionando**
- ✅ Build Server: **Funcionando**
- 🔄 Cobertura: **Em expansão**

---

**💡 Dica:** Execute `npm run test:ui` para uma interface visual interativa dos testes! 