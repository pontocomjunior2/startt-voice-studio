import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useFetchAdminUsers } from '../../hooks/queries/use-fetch-admin-users.hook';
import type { UserProfile } from '../../hooks/queries/use-fetch-admin-users.hook';
import { useUpdateUserRole } from '../../hooks/mutations/use-update-user-role.hook';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ManageClientLocutoresModal } from '@/components/admin/manage-client-locutores-modal';

function AdminUsuariosPage() {
  const { profile: adminProfile } = useAuth();
  const queryClient = useQueryClient();

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedUserForAdjust, setSelectedUserForAdjust] = useState<UserProfile | null>(null);
  const [ajusteGravacao, setAjusteGravacao] = useState('0');
  const [ajusteIA, setAjusteIA] = useState('0');
  const [ajusteObservacao, setAjusteObservacao] = useState('');
  const [isAdjustingCredits, setIsAdjustingCredits] = useState(false);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<UserProfile | null>(null);
  const [newUserRole, setNewUserRole] = useState<'cliente' | 'admin'>('cliente');

  const [isLocutorModalOpen, setIsLocutorModalOpen] = useState(false);
  const [selectedUserForLocutores, setSelectedUserForLocutores] = useState<UserProfile | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const [userFilter, setUserFilter] = useState('');

  const { data: users = [], isLoading: isLoadingUsers, isError, error, refetch: refetchUsers } = useFetchAdminUsers();
  const { mutate: updateUserRole, isPending: isUpdatingRole } = useUpdateUserRole();

  const openAdjustModal = (user: UserProfile) => {
    setSelectedUserForAdjust(user);
    setAjusteGravacao('0');
    setAjusteIA('0');
    setAjusteObservacao('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustCredits = async () => {
    if (!selectedUserForAdjust) return;
    
    const gravacao = parseInt(ajusteGravacao, 10);
    const ia = parseInt(ajusteIA, 10);

    if (isNaN(gravacao) || isNaN(ia)) {
      toast.error("Valores inválidos. Por favor, insira apenas números.");
      return;
    }
    if (gravacao === 0 && ia === 0) {
      toast.error("Pelo menos um dos campos de crédito deve ser diferente de zero para o ajuste.");
      return;
    }
    if (!ajusteObservacao.trim()) {
      toast.error("A observação é obrigatória para qualquer ajuste de crédito.");
      return;
    }

    setIsAdjustingCredits(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_ajustar_creditos', {
        p_user_id: selectedUserForAdjust.id,
        p_creditos_gravacao_ajuste: gravacao,
        p_creditos_ia_ajuste: ia,
        p_observacao: ajusteObservacao,
      });

      if (rpcError) throw rpcError;
      
      toast.success("Créditos ajustados com sucesso!");
      setIsAdjustModalOpen(false);
      refetchUsers();

    } catch (err: any) {
      toast.error("Falha ao ajustar créditos", { description: err.message });
    } finally {
      setIsAdjustingCredits(false);
    }
  };

  const openRoleModal = (user: UserProfile) => {
    setSelectedUserForRoleChange(user);
    setNewUserRole(user.role === 'admin' ? 'admin' : 'cliente');
    setIsRoleModalOpen(true);
  };

  const handleUpdateUserRole = () => {
    if (!selectedUserForRoleChange) return;

    updateUserRole({
      userId: selectedUserForRoleChange.id,
      newRole: newUserRole,
      userNameOrFullName: selectedUserForRoleChange.full_name || selectedUserForRoleChange.username
    }, {
      onSuccess: () => {
        setIsRoleModalOpen(false);
      },
    });
  };

  const openDeleteDialog = (user: UserProfile) => {
    setSelectedUserForDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUserForDelete) return;
    setIsDeletingUser(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || '',
        },
        body: JSON.stringify({ userId: selectedUserForDelete.id }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Erro ao excluir usuário');
      toast.success('Usuário excluído com sucesso!');
      setIsDeleteDialogOpen(false);
      setSelectedUserForDelete(null);
      refetchUsers();
    } catch (err: any) {
      toast.error('Erro ao excluir usuário', { description: err.message });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.full_name?.toLowerCase().includes(userFilter.toLowerCase())) ||
    (user.username?.toLowerCase().includes(userFilter.toLowerCase()))
  );
  
  if (isError && error) {
    return <div className="p-4 text-red-500">Erro ao carregar usuários: {error.message}</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-foreground">Gerenciar Usuários</h1>
      </div>

      <Separator className="my-4" />

      <div className="mb-4">
        <Input 
          type="text"
          placeholder="Filtrar por nome ou usuário..."
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoadingUsers ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="ml-2">Carregando usuários...</p>
        </div>
      ) : (
        <div className="overflow-x-auto relative border border-border rounded-md admin-table-fix-dark-border">
          <Table>
            <TableCaption className="py-3">Lista de todos os usuários (clientes e administradores).</TableCaption>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Nome Completo</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Créd. Gravação</TableHead>
                <TableHead>Créd. IA</TableHead>
                <TableHead>Pacotes Ativos</TableHead>
                <TableHead>Role Atual</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card divide-y divide-border">
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50 odd:bg-muted/20">
                  <TableCell className="font-medium px-4 py-3 whitespace-nowrap">{user.full_name || 'N/A'}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">{user.username || 'N/A'}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">{user.saldo_gravacao ?? 0}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">{user.saldo_ia ?? 0}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.pacotes_ativos && user.pacotes_ativos.length > 0 ? (
                        user.pacotes_ativos.map(pacoteNome => (
                          <Badge key={pacoteNome} variant="outline" className="text-xs">
                            {pacoteNome}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                      {user.role || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">{user.updated_at ? new Date(user.updated_at).toLocaleDateString('pt-BR') : 'N/A'}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap space-x-2">
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openAdjustModal(user)}
                    >
                      Ajustar Créditos
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openRoleModal(user)}
                        disabled={isUpdatingRole}
                    >
                      Alterar Role
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUserForLocutores(user);
                        setIsLocutorModalOpen(true);
                      }}
                    >
                      Gerenciar Locutores
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(user)}
                      disabled={isDeletingUser}
                    >
                      Excluir Usuário
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isAdjustModalOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setSelectedUserForAdjust(null);
        setIsAdjustModalOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajustar Créditos para {selectedUserForAdjust?.full_name || selectedUserForAdjust?.username}</DialogTitle>
            <DialogDescription>
              Saldo atual: {selectedUserForAdjust?.saldo_gravacao ?? 0} (Gravação), {selectedUserForAdjust?.saldo_ia ?? 0} (IA).
              Insira valores positivos para adicionar e negativos para subtrair.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ajuste-gravacao" className="text-right col-span-1">Créd. Gravação</Label>
              <Input id="ajuste-gravacao" type="number" value={ajusteGravacao} onChange={(e) => setAjusteGravacao(e.target.value)} className="col-span-3" placeholder="Ex: 100 ou -50" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ajuste-ia" className="text-right col-span-1">Créd. IA</Label>
              <Input id="ajuste-ia" type="number" value={ajusteIA} onChange={(e) => setAjusteIA(e.target.value)} className="col-span-3" placeholder="Ex: 50000 ou -10000" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ajuste-observacao" className="text-right col-span-1 self-start pt-2">Observação*</Label>
              <Textarea id="ajuste-observacao" value={ajusteObservacao} onChange={(e) => setAjusteObservacao(e.target.value)} className="col-span-3" placeholder="Motivo do ajuste (obrigatório)" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={isAdjustingCredits}>Cancelar</Button></DialogClose>
            <Button type="button" onClick={handleAdjustCredits} disabled={isAdjustingCredits}>
              {isAdjustingCredits && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleModalOpen} onOpenChange={(isOpen) => {
        setIsRoleModalOpen(isOpen);
        if (!isOpen) {
          setSelectedUserForRoleChange(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Role de {selectedUserForRoleChange?.full_name || selectedUserForRoleChange?.username}</DialogTitle>
            <DialogDescription>
              Selecione a nova role para o usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select 
              value={newUserRole}
              onValueChange={(value: 'cliente' | 'admin') => setNewUserRole(value)}
              disabled={isUpdatingRole}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isUpdatingRole}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateUserRole} disabled={isUpdatingRole} className="bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90">
              {isUpdatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <b>{selectedUserForDelete?.full_name || selectedUserForDelete?.username}</b>? Esta ação é irreversível e removerá todos os dados do usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingUser}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeletingUser} className="bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90">
              {isDeletingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageClientLocutoresModal 
        user={selectedUserForLocutores}
        isOpen={isLocutorModalOpen}
        onClose={() => {
          setIsLocutorModalOpen(false);
          setSelectedUserForLocutores(null);
        }}
      />
    </div>
  );
}

export default AdminUsuariosPage; 