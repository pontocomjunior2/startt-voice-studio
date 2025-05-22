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
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

// Imports para DatePicker
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // Para formatação em pt-BR
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox"; // Adicionado Checkbox
import { Textarea } from "@/components/ui/textarea"; // Adicionado Textarea

// Hooks customizados do React Query
import { useFetchAdminUsers } from '../../hooks/queries/use-fetch-admin-users.hook';
import type { UserProfile } from '../../hooks/queries/use-fetch-admin-users.hook';
import { useUpdateUserRole } from '../../hooks/mutations/use-update-user-role.hook';

// Importar useAuth e supabaseClient
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient'; // Usar o cliente supabase global
import { useQueryClient } from '@tanstack/react-query'; // Adicionar se não estiver lá
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

function AdminUsuariosPage() {
  const { profile: adminProfile } = useAuth(); // Para admin_id_que_adicionou
  const queryClient = useQueryClient(); // Para invalidar queries

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<UserProfile | null>(null);
  // const [newCreditAmount, setNewCreditAmount] = useState<string>(''); // REMOVIDO - Substituído por estados do lote

  // Novos estados para o modal de adicionar lote de créditos
  const [quantidadeLote, setQuantidadeLote] = useState<string>('');
  const [dataValidadeLote, setDataValidadeLote] = useState<Date | undefined>(undefined);
  const [semPrazoValidade, setSemPrazoValidade] = useState(false);
  const [observacaoLote, setObservacaoLote] = useState('');
  const [isAddingCredits, setIsAddingCredits] = useState(false); // Novo estado de loading para lotes

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<UserProfile | null>(null);
  const [newUserRole, setNewUserRole] = useState<'cliente' | 'admin'>('cliente');
  // const [isUpdatingRole, setIsUpdatingRole] = useState(false); // Gerenciado pelo React Query mutation

  const [userFilter, setUserFilter] = useState('');

  const { data: initialUsers = [], isLoading: isLoadingInitialUsers, isError: isFetchUsersError, error: fetchUsersError, refetch: refetchAdminUsers } = useFetchAdminUsers();
  
  // const { mutate: updateUserCredits, isPending: isUpdatingCreditsHook } = useUpdateUserCredits(); // REMOVIDO - O isPending será do isAddingCredits local
  const { mutate: updateUserRole, isPending: isUpdatingRole } = useUpdateUserRole();

  const [usersWithCalculatedCredit, setUsersWithCalculatedCredit] = useState<UserProfile[]>([]);
  const [isCalculatingBalances, setIsCalculatingBalances] = useState(false);

  // [NOVOS ESTADOS PARA SUBTRAÇÃO DE CRÉDITOS]
  const [isDebitModalOpen, setIsDebitModalOpen] = useState(false);
  const [selectedUserForDebit, setSelectedUserForDebit] = useState<UserProfile | null>(null);
  const [debitAmount, setDebitAmount] = useState<string>('');
  const [debitReason, setDebitReason] = useState('');
  const [isDebiting, setIsDebiting] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const fetchBalancesForUsers = async () => {
      if (initialUsers && initialUsers.length > 0) {
        setIsCalculatingBalances(true);
        try {
          const usersWithBalances = await Promise.all(initialUsers.map(async (user) => {
            const { data: saldoData, error: saldoError } = await supabase.rpc('get_saldo_creditos_validos', {
              p_user_id: user.id
            });
            if (saldoError) {
              console.error(`AdminUsuariosPage: Erro ao buscar saldo para usuário ${user.id}:`, saldoError);
              return { ...user, saldoCalculadoCreditos: user.credits || 0 }; // Fallback para credits se RPC falhar
            }
            return { ...user, saldoCalculadoCreditos: saldoData ?? 0 };
          }));
          setUsersWithCalculatedCredit(usersWithBalances);
        } catch (error) {
          console.error("AdminUsuariosPage: Erro ao processar saldos de usuários:", error);
          // Em caso de erro geral, usar fallback para todos
          setUsersWithCalculatedCredit(initialUsers.map(u => ({...u, saldoCalculadoCreditos: u.credits || 0 })));
        } finally {
          setIsCalculatingBalances(false);
        }
      }
    };

    fetchBalancesForUsers();
  }, [initialUsers]);

  const openCreditModal = (user: UserProfile) => {
    setSelectedUserForCredit(user);
    // Limpar campos do formulário de lote ao abrir o modal
    setQuantidadeLote('');
    setDataValidadeLote(undefined);
    setSemPrazoValidade(false);
    setObservacaoLote('');
    setIsCreditModalOpen(true);
  };

  const handleAddCreditBatch = async () => {
    if (!selectedUserForCredit || !quantidadeLote || parseInt(quantidadeLote, 10) === 0) {
      toast.error("Erro de Validação", { description: "A quantidade de créditos deve ser diferente de zero." });
      return;
    }
    // Se for redução, exigir observação
    if (parseInt(quantidadeLote, 10) < 0 && !observacaoLote.trim()) {
      toast.error("Erro de Validação", { description: "Ao reduzir créditos, é obrigatório informar o motivo na observação." });
      return;
    }
    // Só valida validade se for adição
    if (parseInt(quantidadeLote, 10) > 0 && !semPrazoValidade && !dataValidadeLote) {
      toast.error("Erro de Validação", { description: "Defina uma data de validade ou marque 'Sem prazo de validade'." });
      return;
    }

    setIsAddingCredits(true);
    try {
      const dadosLote: any = {
        user_id: selectedUserForCredit.id,
        quantidade_adicionada: parseInt(quantidadeLote, 10),
        quantidade_usada: 0, // Novo lote começa com 0 usados
        data_validade: parseInt(quantidadeLote, 10) < 0 ? null : (semPrazoValidade || !dataValidadeLote ? null : dataValidadeLote.toISOString()),
        admin_id_que_adicionou: adminProfile?.id, 
        observacao_admin: observacaoLote.trim() || null
      };

      console.log('Enviando para lotes_creditos:', dadosLote);

      const { error } = await supabase
        .from('lotes_creditos')
        .insert([dadosLote]);

      if (error) {
        console.error("Erro Supabase ao adicionar lote de créditos:", error);
        throw error;
      }

      toast.success("Sucesso", { description: "Lote de créditos adicionado ao cliente." });
      await queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setIsCreditModalOpen(false); 
    } catch (err: any) {
      console.error("Erro ao adicionar lote de créditos:", err);
      toast.error("Erro ao Adicionar Lote", { description: JSON.stringify({
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      }, null, 2) });
    } finally {
      setIsAddingCredits(false);
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
        // A invalidação de queries já é feita dentro do hook useUpdateUserRole
      },
      // onError já é tratado no hook
    });
  };

  // [FUNÇÃO PARA ABRIR MODAL DE SUBTRAÇÃO]
  const openDebitModal = (user: UserProfile) => {
    setSelectedUserForDebit(user);
    setDebitAmount('');
    setDebitReason('');
    setIsDebitModalOpen(true);
  };

  // [FUNÇÃO PARA SUBTRAIR CRÉDITOS]
  const handleDebitCredits = async () => {
    if (!selectedUserForDebit || !debitAmount || parseInt(debitAmount, 10) <= 0) {
      toast.error("Erro de Validação", { description: "A quantidade a subtrair deve ser maior que zero." });
      return;
    }
    if (!debitReason.trim()) {
      toast.error("Erro de Validação", { description: "Informe o motivo da subtração." });
      return;
    }
    setIsDebiting(true);
    try {
      // Chama a nova RPC admin_subtrair_creditos
      const { error } = await supabase.rpc('admin_subtrair_creditos', {
        p_user_id: selectedUserForDebit.id,
        p_quantidade: parseInt(debitAmount, 10), // valor positivo
        p_observacao: debitReason.trim()
      });
      if (error) {
        toast.error("Erro ao subtrair créditos", { description: error.message });
        return;
      }
      toast.success("Créditos subtraídos com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setIsDebitModalOpen(false);
    } catch (err: any) {
      toast.error("Erro ao subtrair créditos", { description: err.message });
    } finally {
      setIsDebiting(false);
    }
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
      await queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    } catch (err: any) {
      toast.error('Erro ao excluir usuário', { description: err.message });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const filteredUsers = usersWithCalculatedCredit.filter(user => 
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

      {isLoadingInitialUsers || isCalculatingBalances ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="ml-2">{isLoadingInitialUsers ? 'Carregando usuários...' : 'Calculando saldos...'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto relative border border-border rounded-md admin-table-fix-dark-border">
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
                  <TableCell className="px-4 py-3 whitespace-nowrap">{user.saldoCalculadoCreditos ?? 0}</TableCell>
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
                        disabled={isAddingCredits || isUpdatingRole}
                    >
                      Adicionar Créditos
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openRoleModal(user)}
                        disabled={isAddingCredits || isUpdatingRole}
                    >
                      Alterar Role
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDebitModal(user)}
                      disabled={isAddingCredits || isDebiting || isUpdatingRole}
                    >
                      Subtrair Créditos
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(user)}
                      disabled={isAddingCredits || isDebiting || isUpdatingRole || isDeletingUser}
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

      <Dialog open={isCreditModalOpen} onOpenChange={(isOpen) => {
        setIsCreditModalOpen(isOpen);
        if (!isOpen) {
          setSelectedUserForCredit(null);
          // Limpar estados do formulário de lote de crédito ao fechar
          setQuantidadeLote('');
          setDataValidadeLote(undefined);
          setSemPrazoValidade(false);
          setObservacaoLote('');
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Lote de Créditos para {selectedUserForCredit?.full_name || selectedUserForCredit?.username}</DialogTitle>
            <DialogDescription>
              Saldo atual (calculado dos lotes): {selectedUserForCredit?.saldoCalculadoCreditos ?? 0}. <br />
              Preencha os detalhes do novo lote de créditos a ser adicionado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantidade-lote" className="text-right col-span-1">
                Quantidade*
              </Label>
              <Input 
                id="quantidade-lote" 
                type="number"
                value={quantidadeLote}
                onChange={(e) => setQuantidadeLote(e.target.value)}
                className="col-span-3" 
                placeholder="Ex: 100 ou -50"
                disabled={isAddingCredits}
              />
              {parseInt(quantidadeLote, 10) < 0 && (
                <div className="col-span-4 text-sm text-red-600 mt-2">
                  Atenção: você está reduzindo a cota de créditos do cliente. O valor será subtraído do saldo disponível. Informe o motivo na observação.
                </div>
              )}
            </div>

            {parseInt(quantidadeLote, 10) > 0 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="data-validade-lote" className="text-right col-span-1">
                  Validade*
                </Label>
                <div className="col-span-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataValidadeLote && "text-muted-foreground",
                          semPrazoValidade && "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                        disabled={semPrazoValidade || isAddingCredits}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataValidadeLote && !semPrazoValidade ? format(dataValidadeLote, 'PPP', { locale: ptBR }) : <span>Escolha uma data</span>}
                      </Button>
                    </PopoverTrigger>
                    {!semPrazoValidade && (
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dataValidadeLote}
                          onSelect={setDataValidadeLote}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) }
                        />
                      </PopoverContent>
                    )}
                  </Popover>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox 
                      id="sem-prazo-validade"
                      checked={semPrazoValidade}
                      onCheckedChange={(checked) => {
                        setSemPrazoValidade(Boolean(checked));
                        if (Boolean(checked)) {
                          setDataValidadeLote(undefined);
                        }
                      }}
                      disabled={isAddingCredits}
                    />
                    <Label htmlFor="sem-prazo-validade" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Sem prazo de validade
                    </Label>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="observacao-lote" className="text-right col-span-1 self-start pt-2">
                Observação
              </Label>
              <Textarea 
                id="observacao-lote"
                value={observacaoLote}
                onChange={(e) => setObservacaoLote(e.target.value)}
                className="col-span-3" 
                placeholder="Ex: Créditos de cortesia para campanha X... (obrigatório para redução)"
                rows={3}
                disabled={isAddingCredits}
              />
            </div>

          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isAddingCredits}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleAddCreditBatch} disabled={isAddingCredits} className="bg-amber-500 hover:bg-amber-600 text-white">
              {isAddingCredits ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Adicionar/Reduzir Lote de Créditos
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
            <Button type="button" onClick={handleUpdateUserRole} disabled={isUpdatingRole} className="bg-amber-500 hover:bg-amber-600 text-white">
              {isUpdatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDebitModalOpen} onOpenChange={(isOpen) => {
        setIsDebitModalOpen(isOpen);
        if (!isOpen) {
          setSelectedUserForDebit(null);
          setDebitAmount('');
          setDebitReason('');
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Subtrair Créditos de {selectedUserForDebit?.full_name || selectedUserForDebit?.username}</DialogTitle>
            <DialogDescription>
              Saldo atual: {selectedUserForDebit?.saldoCalculadoCreditos ?? 0}.<br />
              Informe a quantidade a subtrair e o motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="debit-amount" className="text-right col-span-1">
              Quantidade*
            </Label>
            <Input
              id="debit-amount"
              type="number"
              min={1}
              value={debitAmount}
              onChange={(e) => setDebitAmount(e.target.value)}
              className="col-span-3"
              placeholder="Ex: 2"
              disabled={isDebiting}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="debit-reason" className="text-right col-span-1 self-start pt-2">
              Motivo*
            </Label>
            <Textarea
              id="debit-reason"
              value={debitReason}
              onChange={(e) => setDebitReason(e.target.value)}
              className="col-span-3"
              placeholder="Explique o motivo da subtração"
              rows={3}
              disabled={isDebiting}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isDebiting}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleDebitCredits} disabled={isDebiting} className="bg-amber-500 hover:bg-amber-600 text-white">
              {isDebiting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Subtrair Créditos
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
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeletingUser} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeletingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default AdminUsuariosPage; 