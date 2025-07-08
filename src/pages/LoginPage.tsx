import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
  CardFooter,
  CardHeader
} from "@/components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

// Schema de validação Zod
const formSchema = z.object({
  identifier: z.string().min(3, { message: "Informe seu email ou nome de usuário." }),
  password: z.string().min(6, {
    message: "A senha deve ter pelo menos 6 caracteres.",
  }),
});

type LoginFormValues = z.infer<typeof formSchema>;

// Componente reutilizável de formulário de login
export function LoginForm({ onSuccess, showConfirmEmailAlert, confirmEmailMessage }: {
  onSuccess?: () => void;
  showConfirmEmailAlert?: boolean;
  confirmEmailMessage?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithPassword, isProcessing } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEmailAlert, setShowEmailAlert] = useState(false);
  const [identifierPlaceholder, setIdentifierPlaceholder] = useState("seu@email.com ou seu_usuario");
  const [passwordPlaceholder, setPasswordPlaceholder] = useState("******");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setErrorMessage(null);
    setShowEmailAlert(false);
    try {
      const { error } = await signInWithPassword({
        identifier: values.identifier,
        password: values.password,
      });

      if (!error) {
        if (onSuccess) {
          onSuccess();
        } else {
          const from = location.state?.from || "/dashboard";
          navigate(from, { replace: true });
        }
      } else {
        // Detecta erro de e-mail não confirmado do Supabase
        if (
          error.message?.toLowerCase().includes("email") &&
          error.message?.toLowerCase().includes("confirm")
        ) {
          setShowEmailAlert(true);
        }
        setErrorMessage(error.message || "Credenciais inválidas.");
      }
    } catch (error: any) {
      console.error("Erro inesperado durante o login:", error);
      setErrorMessage(error.message || "Ocorreu um erro inesperado. Tente novamente.");
    }
  }

  return (
    <>
      {(showConfirmEmailAlert || showEmailAlert) && (
        <div
          role="alert"
          aria-live="assertive"
          className="w-full max-w-md mb-4 rounded-lg border border-startt-blue bg-startt-blue/10 text-startt-blue px-4 py-3 flex items-center gap-3 shadow-lg animate-fade-in"
        >
          <svg className="w-6 h-6 text-startt-blue shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
          <div>
            {confirmEmailMessage || (
              <>
                <span className="font-semibold">Confirme seu e-mail para ativar sua conta.</span><br />
                Para concluir seu cadastro, acesse o e-mail informado e clique no link de confirmação enviado pela nossa equipe.<br />
                Se não encontrar o e-mail na caixa de entrada, verifique também as pastas de <b>Spam</b> ou <b>Lixo Eletrônico</b>.<br />
                Caso tenha dificuldades ou não localize o e-mail, entre em contato com nosso atendimento pelo WhatsApp.
              </>
            )}
          </div>
        </div>
      )}
      <Card className="w-full max-w-md shadow-lg rounded-2xl border-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="pb-2">
              <h2 className="text-3xl lg:text-4xl font-bold mb-1 text-center drop-shadow-lg bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent">
                Acesse sua conta
              </h2>
              <CardDescription className="text-base text-muted-foreground mb-1 text-center">
                Bem-vindo de volta!<br />
                Faça login para acessar a plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-0 space-y-2">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">Email ou Nome de Usuário</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={identifierPlaceholder} 
                        {...field} 
                        autoComplete="username" 
                        className="h-9 rounded-md text-base" 
                        onFocus={() => setIdentifierPlaceholder("")}
                        onBlur={() => setIdentifierPlaceholder("seu@email.com ou seu_usuario")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">Senha</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={passwordPlaceholder} 
                        {...field} 
                        type="password" 
                        autoComplete="current-password" 
                        className="h-9 rounded-md text-base" 
                        onFocus={() => setPasswordPlaceholder("")}
                        onBlur={() => setPasswordPlaceholder("******")}
                      />
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
              <Button type="submit" className="w-full h-10 text-base font-semibold bg-primary hover:bg-primary/90 rounded-md shadow-md" disabled={isProcessing}>
                {isProcessing ? "Entrando..." : "Entrar"}
              </Button>
              <div className="flex justify-end mt-2">
                <Link to="/esqueceu-senha" className="text-sm text-primary hover:underline self-end focus:outline-none focus:ring-2 focus:ring-primary/60 rounded">
                  Esqueci minha senha
                </Link>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3 pt-2 pb-4">
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <Link to="/signup" className="font-medium text-primary hover:underline">
                  Cadastre-se
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}

// Página de login padrão
export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col md:grid md:grid-cols-2">
      {/* Coluna Esquerda: Branding/Visual */}
      <div className="relative hidden md:flex flex-col items-center justify-center bg-background p-8 text-foreground border-r-4 border-startt-blue overflow-hidden">
        <img
          src="/startt-logo-transp.png"
          alt="STARTT"
          className="w-48 lg:w-64 mb-6 drop-shadow-2xl"
          width={240}
          height={96}
          loading="lazy"
        />
        <h1 className="text-2xl lg:text-3xl font-bold mb-3 text-center drop-shadow-lg bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent">
          Seu projeto, com a voz que ele merece.
        </h1>
        <p className="text-center text-lg lg:text-xl opacity-90 max-w-md drop-shadow text-text-muted">
          A plataforma completa para suas gravações profissionais.
        </p>
      </div>

      {/* Coluna Direita: Formulário */}
      <div className="flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-background min-h-screen md:min-h-0">
        {/* Logo para mobile */}
        <div className="md:hidden mb-6 text-center">
          <img
            src="/startt-logo-transp.png"
            alt="STARTT"
            className="mx-auto h-10"
            width={100}
            height={40}
            loading="lazy"
          />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}