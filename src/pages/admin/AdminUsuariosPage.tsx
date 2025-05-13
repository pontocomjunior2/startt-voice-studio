import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient'; // Ajuste o caminho se necessário
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
  // DialogTrigger, // Não vamos usar trigger direto, o botão abre via estado
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
} from "@/components/ui/select"; // Adicionado para o Select de Role
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react'; // Adicionado Loader2
import { Separator } from "@/components/ui/separator"; // Adicionado Separator

interface UserProfile {
  id: string;
  updated_at?: string;
  full_name?: string | null;
  username?: string | null; // Mantido, pode ser email também
  credits?: number | null;
  role?: string | null;
  created_at?: string; // Adicionado para ordenação
}

function AdminUsuariosPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<UserProfile | null>(null);
  const [newCreditAmount, setNewCreditAmount] = useState<string>('');
  const [isUpdatingCredits, setIsUpdatingCredits] = useState(false);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<UserProfile | null>(null);
  const [newUserRole, setNewUserRole] = useState<'cliente' | 'admin'>('cliente');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const [userFilter, setUserFilter] = useState('');

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, credits, role, updated_at')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }
      if (data) {
         const usersData = data.map(user => ({
           ...user,
           created_at: user.updated_at
         }))
         setUsers(usersData as UserProfile[]); 
      }
      
    } catch (err: any) {
      console.error("Erro ao buscar usuários:", err);
      const description = err.message || "Não foi possível carregar os usuários.";
      toast.error("Erro ao Carregar Usuários", { 
        description: `${description}${err.details ? ` (Detalhes: ${err.details})` : ''}${err.hint ? ` (Sugestão: ${err.hint})` : ''}` 
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const openCreditModal = (user: UserProfile) => {
    setSelectedUserForCredit(user);
    setNewCreditAmount(user.credits?.toString() || '0');
    setIsCreditModalOpen(true);
  };

  const handleUpdateUserCredits = async () => {
    if (!selectedUserForCredit || newCreditAmount === '') return;

    const newCredits = parseInt(newCreditAmount, 10);
    if (isNaN(newCredits) || newCredits < 0) {
      toast.error("Valor Inválido", { description: "Por favor, insira um número de créditos válido (maior ou igual a zero)." });
      return;
    }

    setIsUpdatingCredits(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', selectedUserForCredit.id);

      if (error) throw error;

      toast.success("Créditos Atualizados", { description: `Créditos de ${selectedUserForCredit.full_name || selectedUserForCredit.username} atualizados para ${newCredits}.` });
      setIsCreditModalOpen(false);
      fetchAllUsers();
    } catch (err: any) {
      console.error("Erro ao atualizar créditos:", err);
      toast.error("Erro ao Atualizar Créditos", { description: err.message || "Não foi possível atualizar os créditos." });
    } finally {
      setIsUpdatingCredits(false);
    }
  };

  const openRoleModal = (user: UserProfile) => {
    console.log("openRoleModal chamado para o usuário:", user); // LINHA DE DEBUG
    setSelectedUserForRoleChange(user);
    setNewUserRole(user.role === 'admin' ? 'admin' : 'cliente');
    setIsRoleModalOpen(true);
  };

  const handleUpdateUserRole = async () => {
    if (!selectedUserForRoleChange) return;

    setIsUpdatingRole(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newUserRole })
        .eq('id', selectedUserForRoleChange.id);

      if (error) throw error;

      toast.success("Role Atualizada", { description: `Role de ${selectedUserForRoleChange.full_name || selectedUserForRoleChange.username} atualizada para ${newUserRole}.` });
      setIsRoleModalOpen(false);
      fetchAllUsers();
    } catch (err: any) {
      console.error("Erro ao atualizar role:", err);
      toast.error("Erro ao Atualizar Role", { description: err.message || "Não foi possível atualizar a role." });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.full_name?.toLowerCase().includes(userFilter.toLowerCase())) ||
    (user.username?.toLowerCase().includes(userFilter.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
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

      {loadingUsers ? (
        <p>Carregando usuários...</p>
      ) : (
        <div className="overflow-x-auto relative border rounded-md">
          <Table>
            <TableCaption>Lista de todos os usuários (clientes e administradores).</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Completo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role Atual</TableHead>
                <TableHead className="text-center">Créditos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50 odd:bg-muted/20">
                  <TableCell className="font-medium">{user.full_name || user.username || 'N/A'}</TableCell>
                  <TableCell>{user.username || 'N/A'}</TableCell>
                  <TableCell>{user.role || 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    {user.role !== 'admin' ? (user.credits ?? 0) : 'N/A (Admin)'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {user.role !== 'admin' && (
                      <Button variant="outline" size="sm" onClick={() => openCreditModal(user)}>
                        Ajustar Créditos
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => openRoleModal(user)}>
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
                min="0" 
                value={newCreditAmount} 
                onChange={(e) => setNewCreditAmount(e.target.value)} 
                className="col-span-3" 
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
              {isUpdatingCredits ? 'Salvando...' : 'Salvar Ajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Novo Modal para Alterar Role */}
      <Dialog open={isRoleModalOpen} onOpenChange={(isOpen) => {
        setIsRoleModalOpen(isOpen);
        if (!isOpen) {
          setSelectedUserForRoleChange(null); // Limpa o usuário selecionado ao fechar
          // Não precisa resetar newUserRole aqui, pois é pre-populado ao abrir
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Role de {selectedUserForRoleChange?.full_name || selectedUserForRoleChange?.username}</DialogTitle>
            <DialogDescription>
              Role atual: {selectedUserForRoleChange?.role || 'N/A'}. Selecione a nova role para este usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role-select" className="text-right col-span-1">
                Nova Role
              </Label>
              <Select 
                value={newUserRole} 
                onValueChange={(value: 'cliente' | 'admin') => setNewUserRole(value)}
                disabled={isUpdatingRole} // Desabilita enquanto atualiza
              >
                <SelectTrigger id="role-select" className="col-span-3">
                  <SelectValue placeholder="Selecione a nova role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isUpdatingRole}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateUserRole} disabled={isUpdatingRole}>
              {isUpdatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUpdatingRole ? 'Salvando...' : 'Salvar Alteração de Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pt-4">
        <Link to="/admin">
          <Button variant="outline">Voltar ao Painel Admin</Button>
        </Link>
      </div>

    </div>
  );
}

export default AdminUsuariosPage; 