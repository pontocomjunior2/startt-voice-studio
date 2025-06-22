import { z } from 'zod';

// Schema de validação para a criação e edição de pacotes
export const pacoteSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  descricao: z.string().optional(),
  valor: z.coerce.number().min(0, { message: "O valor deve ser um número positivo." }),
  creditos_oferecidos: z.coerce.number().int().min(1, { message: "A quantidade de créditos deve ser no mínimo 1." }),
  ativo: z.boolean(),
  listavel: z.boolean(),
  locutores: z.array(z.string()).optional(),
  validade_dias: z.coerce.number().int().min(1, { message: "A validade deve ser de no mínimo 1 dia." }).optional().nullable(),
});

// Extrai o tipo TypeScript do schema Zod para usarmos em nossos componentes e hooks
export type PacoteFormValues = z.infer<typeof pacoteSchema>; 