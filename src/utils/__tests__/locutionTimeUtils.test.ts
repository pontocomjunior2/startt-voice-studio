import { describe, it, expect } from 'vitest';
import { 
  calcularTempoEstimadoSegundos,
  formatarSegundosParaMMSS,
  VELOCIDADE_LOCUCAO
} from '../locutionTimeUtils';

describe('locutionTimeUtils', () => {
  describe('calcularTempoEstimadoSegundos', () => {
    it('deve calcular tempo para velocidade normal', () => {
      const texto = 'Este é um teste de cálculo de tempo.';
      const tempo = calcularTempoEstimadoSegundos(texto, VELOCIDADE_LOCUCAO.NORMAL);
      expect(tempo).toBeGreaterThan(0);
      expect(typeof tempo).toBe('number');
    });

    it('deve calcular tempos diferentes para velocidades diferentes', () => {
      const texto = 'Teste de velocidade de locução para comparação de tempos diferentes.';
      
      const tempoPausada = calcularTempoEstimadoSegundos(texto, VELOCIDADE_LOCUCAO.PAUSADA);
      const tempoNormal = calcularTempoEstimadoSegundos(texto, VELOCIDADE_LOCUCAO.NORMAL);
      const tempoRapida = calcularTempoEstimadoSegundos(texto, VELOCIDADE_LOCUCAO.RAPIDA);
      
      expect(tempoPausada).toBeGreaterThan(tempoNormal);
      expect(tempoNormal).toBeGreaterThan(tempoRapida);
    });

    it('deve retornar 0 para texto vazio', () => {
      const tempo = calcularTempoEstimadoSegundos('', VELOCIDADE_LOCUCAO.NORMAL);
      expect(tempo).toBe(0);
    });

    it('deve calcular tempo proporcional ao tamanho do texto', () => {
      const textoSmall = 'Pequeno';
      const textoLarge = 'Este é um texto muito maior que deve resultar em um tempo de locução significativamente superior ao texto pequeno anterior.';
      
      const tempoSmall = calcularTempoEstimadoSegundos(textoSmall, VELOCIDADE_LOCUCAO.NORMAL);
      const tempoLarge = calcularTempoEstimadoSegundos(textoLarge, VELOCIDADE_LOCUCAO.NORMAL);
      
      expect(tempoLarge).toBeGreaterThan(tempoSmall);
    });
  });

  describe('formatarSegundosParaMMSS', () => {
    it('deve formatar segundos corretamente', () => {
      expect(formatarSegundosParaMMSS(0)).toBe('00:00');
      expect(formatarSegundosParaMMSS(30)).toBe('00:30');
      expect(formatarSegundosParaMMSS(60)).toBe('01:00');
      expect(formatarSegundosParaMMSS(90)).toBe('01:30');
      expect(formatarSegundosParaMMSS(3661)).toBe('61:01');
    });

    it('deve tratar números decimais arredondando para baixo', () => {
      expect(formatarSegundosParaMMSS(30.5)).toBe('00:30');
      expect(formatarSegundosParaMMSS(90.8)).toBe('01:30');
    });

    it('deve tratar números negativos como zero', () => {
      expect(formatarSegundosParaMMSS(-30)).toBe('00:00');
    });
  });

  describe('VELOCIDADE_LOCUCAO constants', () => {
    it('deve ter todas as velocidades definidas', () => {
      expect(VELOCIDADE_LOCUCAO.PAUSADA).toBeDefined();
      expect(VELOCIDADE_LOCUCAO.NORMAL).toBeDefined();
      expect(VELOCIDADE_LOCUCAO.RAPIDA).toBeDefined();
    });

    it('deve ter valores string válidos', () => {
      expect(typeof VELOCIDADE_LOCUCAO.PAUSADA).toBe('string');
      expect(typeof VELOCIDADE_LOCUCAO.NORMAL).toBe('string');
      expect(typeof VELOCIDADE_LOCUCAO.RAPIDA).toBe('string');
    });

    it('deve ter valores esperados', () => {
      expect(VELOCIDADE_LOCUCAO.PAUSADA).toBe('pausada');
      expect(VELOCIDADE_LOCUCAO.NORMAL).toBe('normal');
      expect(VELOCIDADE_LOCUCAO.RAPIDA).toBe('rapida');
    });
  });
}); 