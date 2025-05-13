import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type ControllerRenderProps } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Schema de validação Zod para o formulário de cadastro
const signupFormSchema = z.object({
  fullName: z.string().min(1, { message: "O nome completo é obrigatório." }),
  username: z.string().min(1, { message: "O nome de usuário é obrigatório." })
    .min(3, { message: "O nome de usuário deve ter pelo menos 3 caracteres."})
    .regex(/^[a-z0-9_.]+$/, { message: "Nome de usuário pode conter apenas letras minúsculas, números, \'_\' ou \'.\'" }),
  email: z.string().email({ message: "Por favor, insira um endereço de e-mail válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  confirmPassword: z.string().min(6, { message: "A confirmação da senha deve ter pelo menos 6 caracteres." })
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"], // Associa o erro ao campo confirmPassword
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

function SignupPage() {
  const { signUp, isProcessing } = useAuth(); // Removido authError, será tratado pelo toast
  const navigate = useNavigate();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SignupFormValues) {
    // isProcessing será true durante a chamada a signUp
    const { error } = await signUp({ 
      email: values.email, 
      password: values.password, 
      options: { 
        data: { 
          username: values.username, 
          full_name: values.fullName 
        } 
      }
    });

    if (error) {
      toast.error(error.message || 'Ocorreu um erro inesperado no cadastro.');
    } else {
      toast.success("Cadastro Realizado!", {
        description: "Verifique seu e-mail para confirmar a conta.",
      });
      form.reset(); // Limpar formulário
      // navigate('/login'); // Opcional: redirecionar após sucesso
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="text-2xl font-bold tracking-tight">Criar Conta</CardTitle>
              <CardDescription>
                Preencha os campos abaixo para criar sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Campo Nome Completo */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }: { field: ControllerRenderProps<SignupFormValues, 'fullName'> }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu Nome Completo" {...field} disabled={isProcessing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo Nome de Usuário */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }: { field: ControllerRenderProps<SignupFormValues, 'username'> }) => (
                  <FormItem>
                    <FormLabel>Nome de Usuário</FormLabel>
                    <FormControl>
                      <Input placeholder="seu_usuario" {...field} disabled={isProcessing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
              {/* Campo Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }: { field: ControllerRenderProps<SignupFormValues, 'email'> }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} disabled={isProcessing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo Senha */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }: { field: ControllerRenderProps<SignupFormValues, 'password'> }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} disabled={isProcessing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo Confirmar Senha */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }: { field: ControllerRenderProps<SignupFormValues, 'confirmPassword'> }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} disabled={isProcessing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? 'Criando conta...' : 'Criar Conta'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta? {' '}
                <Button variant="link" asChild className="p-0 h-auto">
                  <Link to="/login" className="underline underline-offset-4 hover:text-primary">
                    Faça login
                  </Link>
                </Button>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

export default SignupPage; 