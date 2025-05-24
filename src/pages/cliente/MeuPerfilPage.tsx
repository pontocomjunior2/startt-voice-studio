import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  UserCircle2,
  Mail,
  Wallet,
  History,
  ShieldCheck,
  KeyRound,
  Loader2
} from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, { message: 'Nova senha deve ter no mínimo 8 caracteres.' }),
  confirmPassword: z.string().min(8, { message: 'Confirmação de senha deve ter no mínimo 8 caracteres.' }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

function MeuPerfilPage() {
  const { user, profile, isLoading, isFetchingProfile } = useAuth();
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmitChangePassword = async (data: ChangePasswordFormData) => {
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });
      if (error) {
        throw error;
      }
      toast.success('Sua senha foi alterada com sucesso!');
      setIsChangePasswordModalOpen(false);
      reset();
    } catch (error: any) {
      toast.error('Erro ao Alterar Senha', {
        description: error.message || 'Não foi possível alterar sua senha. Tente novamente.',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (isLoading || isFetchingProfile || !profile || !user) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <span className="text-muted-foreground">Carregando perfil...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground container mx-auto max-w-4xl py-8 px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e da conta.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-1">
        {/* Card de Informações Pessoais */}
        <Card className="bg-card text-card-foreground border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5" /> Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4 mb-6">
              <Avatar className="h-24 w-24 bg-background">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || profile?.username || 'Avatar'} />
                <AvatarFallback className="text-3xl text-white bg-background">
                  {profile?.full_name?.charAt(0).toUpperCase() || profile?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {/* <Button variant="outline" size="sm" className="mt-2">Alterar Foto (Em breve)</Button> */}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input id="fullName" value={profile?.full_name || 'Não informado'} readOnly className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border-none" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || 'Não informado'} readOnly className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border-none" />
              </div>
              <div>
                <Label htmlFor="username">Nome de Usuário</Label>
                <Input id="username" value={profile?.username || 'Não informado'} readOnly className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border-none" />
              </div>
              <div>
                <Label htmlFor="joinedDate">Membro Desde</Label>
                <Input id="joinedDate" value={profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('pt-BR') : 'Não informado'} readOnly className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border-none" />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {/* <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Editar Perfil (Em breve)</Button> */}
          </CardFooter>
        </Card>

        {/* Card de Conta e Créditos */}
        <Card className="bg-card text-card-foreground border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" /> Minha Conta e Créditos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="mb-4">
              <Label className="text-sm font-medium text-muted-foreground">Saldo de Créditos</Label>
              <p className="text-2xl font-bold">{profile?.saldoCalculadoCreditos ?? 0}</p>
            </div>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link to="/historico-creditos">
                <History className="mr-2 h-4 w-4" />
                Ver Histórico de Créditos
              </Link>
            </Button>
            {/* <Button variant="default" className="w-full sm:w-auto mt-2" disabled>Comprar Créditos (Em breve)</Button> */}
          </CardContent>
        </Card>

        {/* Card de Segurança (com alteração de senha) */}
        <Card className="bg-card text-card-foreground border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Dialog open={isChangePasswordModalOpen} onOpenChange={(isOpen) => {
              if (!isOpen) reset();
              setIsChangePasswordModalOpen(isOpen);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <KeyRound className="mr-2 h-4 w-4" /> Alterar Senha
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Alterar Senha</DialogTitle>
                  <DialogDescription>
                    Defina uma nova senha para sua conta. Certifique-se de que seja forte e segura.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmitChangePassword)} className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      {...register('newPassword')}
                      disabled={isUpdatingPassword}
                      className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border-none"
                    />
                    {errors.newPassword && <p className="text-sm text-destructive mt-1">{errors.newPassword.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...register('confirmPassword')}
                      disabled={isUpdatingPassword}
                      className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border-none"
                    />
                    {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline" disabled={isUpdatingPassword}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isUpdatingPassword}>
                      {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Nova Senha
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="w-full justify-start" disabled>
              <Mail className="mr-2 h-4 w-4" /> Gerenciar Preferências de Notificação (Em breve)
            </Button>
            <Button variant="destructive" className="w-full justify-start" disabled>
              Excluir Minha Conta (Em breve)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MeuPerfilPage; 