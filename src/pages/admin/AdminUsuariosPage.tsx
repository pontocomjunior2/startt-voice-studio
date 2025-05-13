import React, { useState, useEffect } from 'react';
// import { supabase } from '../../lib/supabaseClient'; // Não mais necessário diretamente aqui
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
// import { Link } from 'react-router-dom'; // Não usado
import { Loader2 } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Hooks customizados do React Query
import { useFetchAdminUsers } from '../../hooks/queries/use-fetch-admin-users.hook';
import type { UserProfile } from '../../hooks/queries/use-fetch-admin-users.hook';
import { useUpdateUserCredits } from '../../hooks/mutations/use-update-user-credits.hook';
import { useUpdateUserRole } from '../../hooks/mutations/use-update-user-role.hook';

// A interface UserProfile agora é importada do hook use-fetch-admin-users.hook.ts
// interface UserProfile {
//   id: string;
//   updated_at?: string;
//   full_name?: string | null;
//   username?: string | null; 
//   credits?: number | null;
//   role?: string | null;
//   created_at?: string; 
// }

function AdminUsuariosPage() {
  // const [users, setUsers] = useState<UserProfile[]>([]); // Gerenciado pelo React Query
  // const [loadingUsers, setLoadingUsers] = useState(true); // Gerenciado pelo React Query

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<UserProfile | null>(null);
  const [newCreditAmount, setNewCreditAmount] = useState<string>('');
  // const [isUpdatingCredits, setIsUpdatingCredits] = useState(false); // Gerenciado pelo React Query mutation

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<UserProfile | null>(null);
  const [newUserRole, setNewUserRole] = useState<'cliente' | 'admin'>('cliente');
  // const [isUpdatingRole, setIsUpdatingRole] = useState(false); // Gerenciado pelo React Query mutation

  const [userFilter, setUserFilter] = useState('');

  // Usando o hook para buscar usuários
  const { data: users = [], isLoading: isLoadingUsers, isError: isFetchUsersError, error: fetchUsersError } = useFetchAdminUsers();

  // Usando os hooks para mutações
  const { mutate: updateUserCredits, isPending: isUpdatingCredits } = useUpdateUserCredits();
  const { mutate: updateUserRole, isPending: isUpdatingRole } = useUpdateUserRole();


  // useEffect(() => {
  //   fetchAllUsers(); // Não é mais necessário, React Query cuida disso
  // }, []);

  const openCreditModal = (user: UserProfile) => {
    setSelectedUserForCredit(user);
    setNewCreditAmount(user.credits?.toString() || '0');
    setIsCreditModalOpen(true);
  };

  const handleUpdateUserCredits = () => {
    if (!selectedUserForCredit || newCreditAmount === '') return;

    const newCredits = parseInt(newCreditAmount, 10);
    if (isNaN(newCredits) || newCredits < 0) {
      toast.error("Valor Inválido", { description: "Por favor, insira um número de créditos válido (maior ou igual a zero)." });
      return;
    }

    updateUserCredits({ 
      userId: selectedUserForCredit.id, 
      newCredits,
      userNameOrFullName: selectedUserForCredit.full_name || selectedUserForCredit.username
    }, {
      onSuccess: () => {
        setIsCreditModalOpen(false);
        // A invalidação de queries já é feita dentro do hook useUpdateUserCredits
      },
      // onError já é tratado no hook
    });
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
        // A invalidação de queries já é feita dentro do hook useUpdateUserRole
      },
      // onError já é tratado no hook
    });
  };

  const filteredUsers = users.filter(user => 
    (user.full_name?.toLowerCase().includes(userFilter.toLowerCase())) ||
    (user.username?.toLowerCase().includes(userFilter.toLowerCase()))
  );
  
  if (isFetchUsersError && fetchUsersError) {
    // O toast de erro já é disparado dentro do hook useFetchAdminUsers
    // Mas podemos mostrar uma mensagem na UI também se quisermos
    return <div className="p-4 text-red-500">Erro ao carregar usuários: {fetchUsersError.message}</div>;
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
          placeholder="Filtrar por nome ou email..."
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoadingUsers ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Carregando usuários...</p>
        </div>
      ) : (
        <div className="overflow-x-auto relative border border-border rounded-md">
          <Table>
            <TableCaption className="py-3">Lista de todos os usuários (clientes e administradores).</TableCaption>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome Completo</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuário/Email</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Créditos</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role Atual</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Última Atualização</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card divide-y divide-border">
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50 odd:bg-muted/20">
                  <TableCell className="font-medium px-4 py-3 whitespace-nowrap">{user.full_name || user.username || 'N/A'}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">{user.username || 'N/A'}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">{user.credits ?? 0}</TableCell>
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
                        onClick={() => openCreditModal(user)}
                        disabled={isUpdatingCredits || isUpdatingRole}
                    >
                      Ajustar Créditos
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openRoleModal(user)}
                        disabled={isUpdatingCredits || isUpdatingRole}
                    >
                      Alterar Role
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isCreditModalOpen} onOpenChange={(isOpen) => {
        setIsCreditModalOpen(isOpen);
        if (!isOpen) {
          setSelectedUserForCredit(null);
          setNewCreditAmount('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Créditos de {selectedUserForCredit?.full_name || selectedUserForCredit?.username}</DialogTitle>
            <DialogDescription>
              Créditos atuais: {selectedUserForCredit?.credits ?? 0}. Defina o novo saldo total de créditos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="credits-amount" className="text-right col-span-1">
                Novo Saldo
              </Label>
              <Input 
                id="credits-amount" 
                type="number"
                value={newCreditAmount}
                onChange={(e) => setNewCreditAmount(e.target.value)}
                className="col-span-3" 
                placeholder="Ex: 100"
                disabled={isUpdatingCredits}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isUpdatingCredits}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateUserCredits} disabled={isUpdatingCredits}>
              {isUpdatingCredits && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
              Salvar Alterações
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
            <Button type="button" onClick={handleUpdateUserRole} disabled={isUpdatingRole}>
              {isUpdatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default AdminUsuariosPage; 