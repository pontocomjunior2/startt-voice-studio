import { z } from 'zod';

// Schema de validação para a criação e edição de pacotes
export const pacoteSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  valor: z.coerce.number().min(0, 'Valor deve ser maior ou igual a 0'),
  creditos_oferecidos: z.coerce.number().min(1, 'Créditos oferecidos deve ser maior que 0'),
  creditos_ia_oferecidos: z.coerce.number().min(0, 'Créditos IA oferecidos deve ser maior ou igual a 0'),
  ativo: z.boolean(),
  listavel: z.boolean(),
  locutores: z.array(z.string()).optional(),
  validade_dias: z.coerce.number().min(1).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  categoria: z.string().optional()
});

// Extrai o tipo TypeScript do schema Zod para usarmos em nossos componentes e hooks
export type PacoteFormValues = z.infer<typeof pacoteSchema>;