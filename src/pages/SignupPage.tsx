import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner";
import { IMaskInput } from 'react-imask';
import { useState } from 'react';
import { LoginForm } from './LoginPage';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, type ControllerRenderProps } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Validação Zod robusta
const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/;
const signupSchema = z.object({
  fullName: z.string().min(3, { message: "Nome completo deve ter no mínimo 3 caracteres." }),
  companyName: z.string().min(2, { message: "Nome da empresa deve ter no mínimo 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  username: z.string().min(3, { message: "Nome de usuário deve ter no mínimo 3 caracteres." }),
  whatsapp: z.string().regex(phoneRegex, { message: "Formato de WhatsApp inválido. Use (XX)XXXXX-XXXX ou (XX)XXXX-XXXX." }),
  password: z.string()
    .min(6, { message: "Senha deve ter no mínimo 6 caracteres." })
    .regex(/[0-9]/, { message: "Senha deve conter pelo menos um número." })
    .regex(/[a-zA-Z]/, { message: "Senha deve conter pelo menos uma letra." }),
  confirmPassword: z.string().min(6, { message: "Confirmação de senha é obrigatória." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

function SignupPage() {
  const { signUp, isProcessing } = useAuth();
  const navigate = useNavigate();
  const [showConfirmEmailAlert, setShowConfirmEmailAlert] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: "",
      companyName: "",
      email: "",
      username: "",
      whatsapp: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SignupFormData) {
    console.log('Valores recebidos no submit:', values);
    const { error } = await signUp({ 
      email: values.email, 
      password: values.password, 
      options: { 
        data: { 
          username: values.username, 
          full_name: values.fullName,
          company_name: values.companyName,
          whatsapp: values.whatsapp
        } 
      }
    });

    if (error) {
      if (error.message && error.message.toLowerCase().includes('rate limit')) {
        toast.error('Você realizou muitas tentativas de cadastro em pouco tempo. Aguarde alguns minutos e tente novamente.', {
          duration: 8000,
        });
      } else {
        toast.error(error.message || 'Ocorreu um erro inesperado no cadastro.');
      }
    } else {
      setShowConfirmEmailAlert(true);
      toast.success("Cadastro Realizado!", {
        description: "Verifique seu e-mail para confirmar a conta.",
      });
      form.reset();
    }
  }

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
        <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-center drop-shadow-lg bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent">
          Sua Voz, Amplificada.
        </h1>
        <p className="text-center text-lg lg:text-xl opacity-90 max-w-md drop-shadow text-text-muted">
          A plataforma completa para suas gravações profissionais.
        </p>
      </div>

      {/* Coluna Direita: Formulário */}
      <div className="flex flex-col items-center justify-center p-2 sm:p-4 lg:p-6 bg-background min-h-screen md:min-h-0">
        {/* Alerta e Login após cadastro */}
        {showConfirmEmailAlert ? (
          <>
            <div
              role="alert"
              aria-live="assertive"
              className="fixed inset-0 z-50 flex justify-center items-start pt-12 px-2 animate-fade-in"
              style={{ pointerEvents: 'none' }}
            >
              <div className="relative max-w-md w-full bg-gradient-to-br from-startt-blue to-startt-purple text-white rounded-3xl shadow-2xl border-2 border-startt-blue flex flex-col items-center gap-3 p-6 pointer-events-auto">
                <button aria-label="Fechar notificação" className="absolute top-3 right-3 text-white/70 hover:text-white text-xl font-bold transition-colors" style={{ pointerEvents: 'auto' }} onClick={() => { setShowConfirmEmailAlert(false); navigate('/login'); }}>
                  ×
                </button>
                <div className="text-4xl mb-1">🎉</div>
                <div className="w-full text-center">
                  <span className="block font-bold text-2xl mb-1">Bem Vindo(a) ao Startt!</span>
                  <span className="block font-semibold text-lg mb-2">Sua conta foi criada com sucesso.</span>
                  <span className="block text-base mb-2">Para ativar seu acesso, basta clicar no link que enviamos para seu e-mail.</span>
                  <span className="block text-sm mb-1">Não encontrou? Confira as pastas <b>Spam</b> ou <b>Lixo Eletrônico</b>.</span>
                  <span className="block text-sm mb-2">Qualquer dúvida, estamos prontos para ajudar no WhatsApp!</span>
                </div>
                <a href="https://wa.me/5527992643922" target="_blank" rel="noopener noreferrer" className="mt-2 px-4 py-2 rounded-full bg-white text-startt-blue font-bold shadow hover:bg-gray-100 transition-colors text-base flex items-center gap-2" aria-label="Falar com suporte no WhatsApp">
                  <svg className="w-6 h-6" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="256" cy="256" r="222" fill="#25D366" stroke="#ECECEC" strokeWidth="20"/>
                    <path d="M256 128c-70.7 0-128 57.3-128 128 0 22.1 5.7 43.1 16.5 61.7l-17.4 63.7 65.2-17.1C210.2 380.3 232.6 384 256 384c70.7 0 128-57.3 128-128S326.7 128 256 128zm70.7 170.7c-3 8.4-17.6 16.1-24.2 17.2-6.2 1-14.1 1.5-22.7-1.4-5.2-1.7-11.8-3.8-20.4-7.5-35.9-15.5-59.3-52.1-61.1-54.5-1.8-2.4-14.6-19.5-14.6-37.3 0-17.8 9.1-26.5 12.3-29.9 3.2-3.4 7-4.2 9.3-4.2 2.3 0 4.6.1 6.6.1 2.1 0 5-0.8 7.8 6 3 7.2 10.2 24.8 11.1 26.6.9 1.8 1.5 3.9.3 6.3-1.2 2.4-1.8 3.9-3.5 6.2-1.7 2.3-3.6 5.1-5.1 6.8-1.7 2-3.5 4.1-1.5 8 2 3.9 8.9 14.6 19.1 23.7 13.1 11.6 24.1 15.2 28 16.9 3.9 1.7 6.2 1.4 8.5-0.8 2.3-2.2 9.8-11.4 12.4-15.3 2.6-3.9 5.2-3.2 8.7-1.9 3.6 1.3 22.7 10.7 26.6 12.6 3.9 1.9 6.5 2.9 7.4 4.5.9 1.6.9 9.2-2.1 17.6z" fill="#fff"/>
                  </svg>
                  Falar com Suporte
                </a>
              </div>
            </div>
            <LoginForm confirmEmailMessage={
              <>
                <span className="font-semibold">Confirme seu e-mail para ativar sua conta.</span><br />
                Para concluir seu cadastro, acesse o e-mail informado e clique no link de confirmação enviado pela nossa equipe.<br />
                Se não encontrar o e-mail na caixa de entrada, verifique também as pastas de <b>Spam</b> ou <b>Lixo Eletrônico</b>.<br />
                Caso tenha dificuldades ou não localize o e-mail, entre em contato com nosso atendimento pelo WhatsApp.
              </>
            } />
          </>
        ) : (
          <>
            {/* Exibir SOMENTE o formulário de cadastro se o popup não foi exibido e o form não foi enviado */}
            {!form.formState.isSubmitted && (
              <>
                {/* Logo para mobile */}
                <div className="md:hidden mb-4 text-center">
                  <img
                    src="/startt-logo-transp.png"
                    alt="STARTT"
                    className="mx-auto h-8"
                    width={80}
                    height={32}
                    loading="lazy"
                  />
                </div>
                <Card className="w-full max-w-md shadow-lg rounded-2xl border-none p-2 sm:p-4 max-h-[90vh] overflow-y-auto flex flex-col justify-center">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                      <CardHeader className="pb-1">
                        <CardTitle className="text-xl font-bold tracking-tight mb-1">Crie sua Conta</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground mb-1">Bem-vindo! Preencha os campos abaixo para começar a usar a plataforma.</CardDescription>
                        <span className="text-xs text-muted-foreground">Todos os campos são obrigatórios.</span>
                      </CardHeader>
                      <CardContent className="pt-0 pb-0 space-y-1">
                        {/* Nome Completo */}
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Nome Completo</FormLabel>
                              <FormControl>
                                <Input placeholder="Seu Nome Completo" {...field} disabled={isProcessing} autoComplete="name" className="h-8 rounded text-sm text-gray-200 focus:text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Nome da Empresa */}
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Nome da Empresa</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome da Empresa" {...field} disabled={isProcessing} autoComplete="organization" className="h-8 rounded text-sm text-gray-200 focus:text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Email */}
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="seu@email.com" {...field} disabled={isProcessing} autoComplete="email" className="h-8 rounded text-sm text-gray-200 focus:text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Nome de Usuário */}
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Nome de Usuário</FormLabel>
                              <FormControl>
                                <Input placeholder="seu_usuario" {...field} disabled={isProcessing} autoComplete="username" className="h-8 rounded text-sm text-gray-200 focus:text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* WhatsApp */}
                        <Controller
                          name="whatsapp"
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel className="text-xs">WhatsApp</FormLabel>
                              <FormControl>
                                <IMaskInput
                                  mask="(00) 00000-0000"
                                  unmask={false}
                                  value={field.value}
                                  onAccept={value => field.onChange(value)}
                                  disabled={isProcessing}
                                  placeholder="(11) 91234-5678"
                                  className="h-8 rounded text-sm w-full border border-input bg-transparent px-3 py-1 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-gray-200 focus:text-white"
                                  autoComplete="tel"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Senha */}
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="******" {...field} disabled={isProcessing} autoComplete="new-password" className="h-8 rounded text-sm text-gray-200 focus:text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Confirmar Senha */}
                        <FormField
                          control={form.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Confirmar Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="******" {...field} disabled={isProcessing} autoComplete="new-password" className="h-8 rounded text-sm text-gray-200 focus:text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                      <CardFooter className="flex-col gap-2 pt-1 pb-2">
                        <Button type="submit" className="w-full h-9 text-sm font-semibold bg-primary hover:bg-primary/90 rounded shadow" disabled={isProcessing || !form.formState.isValid}>
                          {isProcessing ? 'Criando conta...' : 'Criar Conta'}
                        </Button>
                        <p className="mt-1 text-center text-xs text-muted-foreground">
                          Já tem uma conta? {" "}
                          <Link to="/login" className="font-medium text-primary hover:underline">
                            Faça login
                          </Link>
                        </p>
                      </CardFooter>
                    </form>
                  </Form>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SignupPage; 