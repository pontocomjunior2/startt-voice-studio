// src/utils/locutionTimeUtils.ts
export const VELOCIDADE_LOCUCAO = {
  PAUSADA: 'pausada',
  NORMAL: 'normal',
  RAPIDA: 'rapida',
} as const;

export type VelocidadeLocucaoTipo = typeof VELOCIDADE_LOCUCAO[keyof typeof VELOCIDADE_LOCUCAO];

const PALAVRAS_POR_MINUTO: Record<VelocidadeLocucaoTipo, number> = {
  [VELOCIDADE_LOCUCAO.PAUSADA]: 110, // Ajuste conforme necessário
  [VELOCIDADE_LOCUCAO.NORMAL]: 150,
  [VELOCIDADE_LOCUCAO.RAPIDA]: 190,
};

// Função para contar palavras de forma simples
const contarPalavras = (texto: string): number => {
  if (!texto || texto.trim().length === 0) {
    return 0;
  }
  return texto.trim().split(/\s+/).filter(Boolean).length; // Filtra strings vazias
};

// Função para calcular o tempo estimado em segundos
export const calcularTempoEstimadoSegundos = (texto: string, velocidade: VelocidadeLocucaoTipo): number => {
  const palavras = contarPalavras(texto);
  if (palavras === 0) {
    return 0;
  }
  const ppm = PALAVRAS_POR_MINUTO[velocidade];
  const minutosEstimados = palavras / ppm;
  return Math.round(minutosEstimados * 60); // Retorna em segundos, arredondado
};

// Função para formatar segundos em MM:SS
export const formatarSegundosParaMMSS = (totalSegundos: number): string => {
  // Tratar números negativos como zero
  if (totalSegundos < 0) {
    return '00:00';
  }
  
  // Arredondar para baixo para lidar com decimais
  const segundosInteiros = Math.floor(totalSegundos);
  const minutos = Math.floor(segundosInteiros / 60);
  const segundos = segundosInteiros % 60;
  const minutosFormatados = String(minutos).padStart(2, '0');
  const segundosFormatados = String(segundos).padStart(2, '0');
  return `${minutosFormatados}:${segundosFormatados}`;
}; 