import { zodResolver } from "@hookform/resolvers/zod";
import { type ControllerRenderProps, useForm } from "react-hook-form";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

// Schema de validação Zod
const formSchema = z.object({
  email: z.string().email({
    message: "Por favor, insira um endereço de e-mail válido.",
  }),
  password: z.string().min(6, { // Exemplo: mínimo de 6 caracteres
    message: "A senha deve ter pelo menos 6 caracteres.",
  }),
});

type LoginFormValues = z.infer<typeof formSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const { signInWithPassword, isProcessing } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setErrorMessage(null);
    try {
      const { error } = await signInWithPassword({ 
        email: values.email, 
        password: values.password 
      });

      if (!error) {
        navigate("/dashboard");
      } else {
        setErrorMessage(error.message || "Credenciais inválidas.");
      }
    } catch (error: any) {
      console.error("Erro inesperado durante o login:", error);
      setErrorMessage(error.message || "Ocorreu um erro inesperado. Tente novamente.");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Login</CardTitle>
          <CardDescription>
            Acesse sua conta para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }: { field: ControllerRenderProps<LoginFormValues, 'email'> }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }: { field: ControllerRenderProps<LoginFormValues, 'password'> }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input placeholder="******" {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {errorMessage && (
                <p className="text-sm font-medium text-destructive">
                  {errorMessage}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
           <p className="text-sm text-muted-foreground">
             Não tem uma conta?{" "}
             <Button variant="link" asChild className="p-0 h-auto">
               <Link to="/signup">Cadastre-se</Link>
             </Button>
           </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default LoginPage; 