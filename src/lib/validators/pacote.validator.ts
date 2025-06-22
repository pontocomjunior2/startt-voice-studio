import { z } from 'zod';

// Schema de validação para a criação e edição de pacotes
export const pacoteSchema = z.object({
  nome: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  descricao: z.string().optional(),
  valor: z.coerce.number().min(0, { message: "O valor não pode ser negativo." }),
  creditos_oferecidos: z.coerce.number().int().min(1, { message: "A quantidade de créditos deve ser pelo menos 1." }),
  ativo: z.boolean(),
  listavel: z.boolean(),
  locutoresIds: z.array(z.string().uuid()),
});

// Extrai o tipo TypeScript do schema Zod para usarmos em nossos componentes e hooks
export type PacoteFormData = z.infer<typeof pacoteSchema>; 