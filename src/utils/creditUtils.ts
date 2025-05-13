const WORDS_PER_SECOND = 2.5; // Média ajustável de palavras faladas por segundo
const SECONDS_PER_CREDIT = 40; // Segundos de áudio por crédito

export const estimateCreditsFromText = (text: string): number => {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  // Conta palavras de forma simples (separadas por espaço)
  const wordCount = text.trim().split(/\s+/).length;
  const estimatedSeconds = wordCount / WORDS_PER_SECOND;

  // Calcula créditos, arredondando para cima (Math.ceil)
  // Garante que seja pelo menos 1 crédito se houver texto e a estimativa for maior que 0 segundos
  if (estimatedSeconds === 0) {
    return 0; // Se não há segundos estimados (ex: texto só com espaços), custo é 0
  }
  const estimatedCredits = Math.ceil(estimatedSeconds / SECONDS_PER_CREDIT);
  return Math.max(1, estimatedCredits); // Custo mínimo de 1 crédito se houver texto processável
}; 