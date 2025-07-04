import { describe, it, expect } from 'vitest';
import { obterMensagemSucessoAleatoria } from '../messageUtils';

describe('messageUtils', () => {
  describe('obterMensagemSucessoAleatoria', () => {
    it('deve retornar uma string não vazia', () => {
      const mensagem = obterMensagemSucessoAleatoria();
      expect(typeof mensagem).toBe('string');
      expect(mensagem.length).toBeGreaterThan(0);
    });

    it('deve retornar mensagens diferentes em chamadas múltiplas', () => {
      const mensagens = new Set();
      
      // Gerar 20 mensagens para testar aleatoriedade
      for (let i = 0; i < 20; i++) {
        mensagens.add(obterMensagemSucessoAleatoria());
      }
      
      // Deve ter pelo menos 2 mensagens diferentes
      expect(mensagens.size).toBeGreaterThan(1);
    });

    it('deve sempre retornar uma mensagem válida', () => {
      // Testar 10 vezes para garantir consistência
      for (let i = 0; i < 10; i++) {
        const mensagem = obterMensagemSucessoAleatoria();
        expect(mensagem).toBeTruthy();
        expect(typeof mensagem).toBe('string');
        expect(mensagem.trim()).toBe(mensagem); // Não deve ter espaços extras
      }
    });
  });
}); 