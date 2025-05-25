import { useState, useEffect } from 'react';
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
  Loader2,
  ShoppingCart
} from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { IMaskInput } from 'react-imask';

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, { message: 'Nova senha deve ter no mínimo 8 caracteres.' }),
  confirmPassword: z.string().min(8, { message: 'Confirmação de senha deve ter no mínimo 8 caracteres.' }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

const profileSchema = z.object({
  full_name: z.string().min(3, { message: 'Nome completo deve ter no mínimo 3 caracteres.' }),
  username: z.string().min(3, { message: 'Nome de usuário deve ter no mínimo 3 caracteres.' }),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function MeuPerfilPage() {
  const { user, profile, isLoading, isFetchingProfile, refreshProfile } = useAuth();
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Formulário de perfil
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: errorsProfile },
    reset: resetProfile,
    control: controlProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      username: profile?.username || '',
      cpf: profile?.cpf || '',
      cnpj: profile?.cnpj || '',
    },
  });

  useEffect(() => {
    resetProfile({
      full_name: profile?.full_name || '',
      username: profile?.username || '',
      cpf: profile?.cpf || '',
      cnpj: profile?.cnpj || '',
    });
  }, [profile, resetProfile]);

  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: data.full_name,
        username: data.username,
        cpf: data.cpf || null,
        cnpj: data.cnpj || null,
      }).eq('id', user?.id);
      if (error) {
        toast.error('Erro ao atualizar perfil', { description: error.message });
      } else {
        toast.success('Perfil atualizado com sucesso!');
        setIsEditing(false);
        await refreshProfile();
      }
    } catch (err: any) {
      toast.error('Erro inesperado ao atualizar perfil', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Formulário de alteração de senha
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: errorsPassword },
    reset: resetPassword,
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
      resetPassword();
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
            {isEditing ? (
              <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input id="full_name" {...registerProfile('full_name')} disabled={isSaving} className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border" />
                  {errorsProfile.full_name && <p className="text-sm text-destructive mt-1">{errorsProfile.full_name.message as string}</p>}
                </div>
                <div>
                  <Label htmlFor="username">Nome de Usuário</Label>
                  <Input id="username" {...registerProfile('username')} disabled={isSaving} className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border" />
                  {errorsProfile.username && <p className="text-sm text-destructive mt-1">{errorsProfile.username.message as string}</p>}
                </div>
                <div className="flex gap-2">
                  <Controller
                    name="cpf"
                    control={controlProfile}
                    render={({ field }) => (
                      <div className="w-1/2">
                        <Label htmlFor="cpf">CPF</Label>
                        <IMaskInput
                          mask="000.000.000-00"
                          unmask={false}
                          value={field.value}
                          onAccept={value => field.onChange(value)}
                          disabled={isSaving}
                          placeholder="000.000.000-00"
                          className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border w-full rounded"
                          autoComplete="off"
                        />
                        {errorsProfile.cpf && <p className="text-sm text-destructive mt-1">{errorsProfile.cpf.message as string}</p>}
                      </div>
                    )}
                  />
                  <Controller
                    name="cnpj"
                    control={controlProfile}
                    render={({ field }) => (
                      <div className="w-1/2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <IMaskInput
                          mask="00.000.000/0000-00"
                          unmask={false}
                          value={field.value}
                          onAccept={value => field.onChange(value)}
                          disabled={isSaving}
                          placeholder="00.000.000/0000-00"
                          className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border w-full rounded"
                          autoComplete="off"
                        />
                        {errorsProfile.cnpj && <p className="text-sm text-destructive mt-1">{errorsProfile.cnpj.message as string}</p>}
                      </div>
                    )}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button type="submit" disabled={isSaving} className="w-full">{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}</Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving} className="w-full">Cancelar</Button>
                </div>
              </form>
            ) : (
              <>
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
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input id="cpf" value={profile?.cpf || ''} readOnly className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border-none" />
                    </div>
                    <div className="w-1/2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input id="cnpj" value={profile?.cnpj || ''} readOnly className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button type="button" onClick={() => setIsEditing(true)} className="w-full">Editar</Button>
                  </div>
                </div>
              </>
            )}
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
            <Button variant="secondary" asChild className="mt-2 w-full sm:w-auto">
              <Link to="/comprar-creditos">
                <ShoppingCart className="mr-2 h-4 w-4" /> Comprar Mais Créditos
              </Link>
            </Button>
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
              if (!isOpen) resetPassword();
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
                <form onSubmit={handleSubmitPassword(onSubmitChangePassword)} className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      {...registerPassword('newPassword')}
                      disabled={isUpdatingPassword}
                      className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border-none"
                    />
                    {errorsPassword.newPassword && <p className="text-sm text-destructive mt-1">{errorsPassword.newPassword.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...registerPassword('confirmPassword')}
                      disabled={isUpdatingPassword}
                      className="mt-1 bg-background text-foreground placeholder:text-muted-foreground border-none"
                    />
                    {errorsPassword.confirmPassword && <p className="text-sm text-destructive mt-1">{errorsPassword.confirmPassword.message}</p>}
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