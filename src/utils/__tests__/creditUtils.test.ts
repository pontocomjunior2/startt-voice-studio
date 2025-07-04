import { describe, it, expect } from 'vitest';
import { estimateCreditsFromText } from '../creditUtils';

describe('creditUtils', () => {
  describe('estimateCreditsFromText', () => {
    it('deve calcular créditos corretamente para texto básico', () => {
      const texto = 'Este é um teste simples.';
      const creditos = estimateCreditsFromText(texto);
      expect(creditos).toBeGreaterThan(0);
      expect(typeof creditos).toBe('number');
    });

    it('deve retornar 0 para texto vazio', () => {
      const creditos = estimateCreditsFromText('');
      expect(creditos).toBe(0);
    });

    it('deve retornar 0 para texto apenas com espaços', () => {
      const creditos = estimateCreditsFromText('   ');
      expect(creditos).toBe(0);
    });

    it('deve calcular mais créditos para textos maiores', () => {
      const textoSmall = 'Pequeno';
      const textoLarge = `Este é um texto extremamente longo que contém muitas palavras e frases extensas para demonstrar claramente a diferença no cálculo de créditos baseado no tamanho do conteúdo textual. 
      Vamos adicionar ainda mais conteúdo para garantir que o algoritmo de cálculo de créditos funcione corretamente e produza resultados diferentes para textos de tamanhos significativamente distintos.
      Mais palavras, mais frases, mais conteúdo textual para processamento e análise pelo sistema de cálculo de créditos que deve considerar o tempo necessário para locução.
      Continuando com ainda mais texto para assegurar que temos palavras suficientes para ultrapassar o limite mínimo e gerar uma diferença mensurável no número de créditos calculados.
      Este parágrafo adicional serve para expandir ainda mais o conteúdo e garantir que o teste funcione adequadamente com uma diferença clara entre os dois textos comparados.`;
      
      const creditosSmall = estimateCreditsFromText(textoSmall);
      const creditosLarge = estimateCreditsFromText(textoLarge);
      
      expect(creditosLarge).toBeGreaterThan(creditosSmall);
    });

    it('deve retornar pelo menos 1 crédito para qualquer texto com palavras', () => {
      const textoMinimo = 'a';
      const creditos = estimateCreditsFromText(textoMinimo);
      expect(creditos).toBeGreaterThanOrEqual(1);
    });

    it('deve calcular créditos de forma consistente', () => {
      const texto = 'Teste de consistência para cálculo de créditos.';
      const creditos1 = estimateCreditsFromText(texto);
      const creditos2 = estimateCreditsFromText(texto);
      expect(creditos1).toBe(creditos2);
    });
  });
}); 