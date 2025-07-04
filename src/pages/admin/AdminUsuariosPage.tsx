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

interface UserProfile {
  id: string;
  updated_at?: string;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  saldo_gravacao?: number; // saldo gravação calculado
  saldo_ia?: number; // saldo IA calculado
  role?: string | null;
  created_at?: string;
}

function AdminUsuariosPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<UserProfile | null>(null);
  const [newCreditAmount, setNewCreditAmount] = useState<string>('');
  const [newIaCreditAmount, setNewIaCreditAmount] = useState<string>('');
  const [isUpdatingCredits, setIsUpdatingCredits] = useState(false);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<UserProfile | null>(null);

  const [newUserRole, setNewUserRole] = useState<'cliente' | 'admin'>('cliente');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, email, credits, role, updated_at');

      if (error) {
        throw error;
      }
      if (data) {
        // Para cada usuário, buscar saldo_ia em lotes_creditos
        const usersWithIa = await Promise.all(
          data.map(async (user) => {
            // Buscar lotes válidos
            const currentDate = new Date().toISOString();
            const { data: lotes, error: lotesError } = await supabase
              .from('lotes_creditos')
              .select('creditos_ia_adicionados, creditos_ia_usados, creditos_gravacao_adicionados, creditos_gravacao_usados, status, data_validade')
              .eq('user_id', user.id)
              .eq('status', 'ativo')
              .or(`data_validade.is.null,data_validade.gt.${currentDate}`);
            let saldo_ia = 0;
            let saldo_gravacao = 0;
            if (!lotesError && lotes) {
              saldo_ia = lotes.reduce((acc, lote) => {
                const ad = lote.creditos_ia_adicionados || 0;
                const us = lote.creditos_ia_usados || 0;
                return acc + (ad - us);
              }, 0);
              saldo_gravacao = lotes.reduce((acc, lote) => {
                const ad = lote.creditos_gravacao_adicionados || 0;
                const us = lote.creditos_gravacao_usados || 0;
                return acc + (ad - us);
              }, 0);
            }
            return {
              ...user,
              created_at: user.updated_at,
              saldo_ia,
              saldo_gravacao,
            };
          })
        );
        // Ordenar por updated_at desc
        usersWithIa.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
        setUsers(usersWithIa as UserProfile[]);
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
    setNewCreditAmount(user.saldo_gravacao?.toString() || '0');
    setNewIaCreditAmount(user.saldo_ia?.toString() || '0');
    setIsCreditModalOpen(true);
  };

  const handleUpdateUserCredits = async () => {
    if (!selectedUserForCredit || newCreditAmount === '' || newIaCreditAmount === '') return;

    const newCredits = parseInt(newCreditAmount, 10);
    const newIaCredits = parseInt(newIaCreditAmount, 10);
    if (isNaN(newCredits) || newCredits < 0 || isNaN(newIaCredits) || newIaCredits < 0) {
      toast.error("Valor Inválido", { description: "Por favor, insira números válidos (maiores ou iguais a zero) para ambos os créditos." });
      return;
    }

    setIsUpdatingCredits(true);
    try {
      // Buscar todos os lotes ativos e válidos do usuário
      const currentDate = new Date().toISOString();
      const { data: lotes, error: lotesError } = await supabase
        .from('lotes_creditos')
        .select('id, creditos_gravacao_adicionados, creditos_gravacao_usados, creditos_ia_adicionados, creditos_ia_usados, status, data_validade')
        .eq('user_id', selectedUserForCredit.id)
        .eq('status', 'ativo')
        .or(`data_validade.is.null,data_validade.gt.${currentDate}`);
      if (lotesError) throw lotesError;
      // Atualizar o saldo do lote mais recente (FIFO reverso)
      if (lotes && lotes.length > 0) {
        const lote = lotes[0]; // Atualiza o primeiro lote válido encontrado
        // Atualizar créditos de gravação
        await supabase
          .from('lotes_creditos')
          .update({
            creditos_gravacao_adicionados: newCredits + (lote.creditos_gravacao_usados || 0),
            creditos_ia_adicionados: newIaCredits + (lote.creditos_ia_usados || 0),
          })
          .eq('id', lote.id);
      } else {
        // Se não houver lote válido, criar um novo
        await supabase.from('lotes_creditos').insert({
          user_id: selectedUserForCredit.id,
          creditos_gravacao_adicionados: newCredits,
          creditos_gravacao_usados: 0,
          creditos_ia_adicionados: newIaCredits,
          creditos_ia_usados: 0,
          status: 'ativo',
          data_adicao: new Date().toISOString(),
        });
      }
      toast.success("Créditos Atualizados", { description: `Créditos de ${selectedUserForCredit.full_name || selectedUserForCredit.username} atualizados para Gravação: ${newCredits}, IA: ${newIaCredits}.` });
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

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
      </div>

      {loadingUsers ? (
        <p>Carregando usuários...</p>
      ) : (
        <Table>
          <TableCaption>Lista de todos os usuários (clientes e administradores).</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nome Completo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Role Atual</TableHead>
              <TableHead className="text-center">Créditos Gravacao</TableHead>
              <TableHead className="text-center">Créditos IA</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name || user.username || 'N/A'}</TableCell>
                <TableCell>{user.email || 'N/A'}</TableCell>
                <TableCell>{user.username || 'N/A'}</TableCell>
                <TableCell>{user.role || 'N/A'}</TableCell>
                <TableCell className="text-center">{user.role !== 'admin' ? (user.saldo_gravacao ?? 0) : 'N/A (Admin)'}</TableCell>
                <TableCell className="text-center">{user.role !== 'admin' ? (user.saldo_ia ?? 0) : 'N/A (Admin)'}</TableCell>
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
      )}

      <Dialog open={isCreditModalOpen} onOpenChange={(isOpen) => {
        setIsCreditModalOpen(isOpen);
        if (!isOpen) {
          setSelectedUserForCredit(null);
          setNewCreditAmount('');
          setNewIaCreditAmount('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Créditos de {selectedUserForCredit?.full_name || selectedUserForCredit?.username}</DialogTitle>
            <DialogDescription>
              Créditos atuais: Gravação: {selectedUserForCredit?.saldo_gravacao ?? 0}, IA: {selectedUserForCredit?.saldo_ia ?? 0}. Defina os novos saldos totais.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="credits-amount" className="text-right col-span-1">
                Novo Saldo Gravação
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ia-credits-amount" className="text-right col-span-1">
                Novo Saldo IA
              </Label>
              <Input
                id="ia-credits-amount"
                type="number"
                min="0"
                value={newIaCreditAmount}
                onChange={(e) => setNewIaCreditAmount(e.target.value)}
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
              {isUpdatingRole ? 'Salvando...' : 'Salvar Nova Role'}
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