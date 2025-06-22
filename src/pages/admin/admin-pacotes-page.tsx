import { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2 } from 'lucide-react';
import { useFetchPacotes } from "@/hooks/queries/use-fetch-pacotes.hook";
import type { Pacote } from "@/hooks/queries/use-fetch-pacotes.hook";
import { useTogglePacoteAtivo } from '@/hooks/mutations/use-toggle-pacote-ativo.mutation.hook';
import { pacoteSchema } from '@/lib/validators/pacote.validator';
import type { PacoteFormData } from '@/lib/validators/pacote.validator';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { useFetchLocutoresList } from '@/hooks/queries/use-fetch-locutores-list.hook';
import { useUpsertPacote } from '@/hooks/mutations/use-upsert-pacote.mutation.hook';
import { useDeletePacote } from '@/hooks/mutations/use-delete-pacote.mutation.hook';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabaseClient';

function AdminPacotesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Pacote | null>(null);
  const [deactivatingPackage, setDeactivatingPackage] = useState<Pacote | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<Pacote | null>(null);
  
  const { data: pacotes = [], isLoading, isError, error } = useFetchPacotes();
  const { mutate: togglePacoteAtivo, isPending: isToggling } = useTogglePacoteAtivo();
  const { data: locutores = [], isLoading: isLoadingLocutores } = useFetchLocutoresList();
  const { mutate: upsertPacote, isPending: isUpserting } = useUpsertPacote();
  const { mutate: deletePacote, isPending: isDeleting } = useDeletePacote();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PacoteFormData>({
    resolver: zodResolver(pacoteSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      valor: 0,
      creditos_oferecidos: 1,
      ativo: true,
      listavel: true,
      locutoresIds: [],
    }
  });

  const handleCopyLink = (pacoteId: string) => {
    const url = `${window.location.origin}/comprar/pacote/${pacoteId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de compra copiado para a área de transferência!");
  };

  useEffect(() => {
    const fetchAssociatedLocutores = async (pacoteId: string) => {
      const { data, error } = await supabase
        .from('pacotes_locutores')
        .select('locutor_id')
        .eq('pacote_id', pacoteId);
      
      if (error) {
        console.error("Erro ao buscar locutores associados:", error);
        toast.error("Não foi possível carregar os locutores associados a este pacote.");
        return [];
      }
      return data.map(item => item.locutor_id);
    };

    if (editingPackage) {
      fetchAssociatedLocutores(editingPackage.id).then(locutorIds => {
        reset({
          ...editingPackage,
          valor: Number(editingPackage.valor),
          descricao: editingPackage.descricao || '',
          locutoresIds: locutorIds || [],
        });
      });
    } else {
      reset({ nome: '', descricao: '', valor: 0, creditos_oferecidos: 1, ativo: true, listavel: true, locutoresIds: [] });
    }
  }, [editingPackage, reset]);

  const handleOpenModal = (pacote: Pacote | null) => {
    setEditingPackage(pacote);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPackage(null);
  };

  const onSubmit = (data: PacoteFormData) => {
    const finalData = {
      ...data,
      valor: Number(String(data.valor).replace(',', '.')),
    };

    console.log("Submitting data to upsertPacote:", {
      pacoteId: editingPackage ? editingPackage.id : null,
      pacoteData: finalData,
    });

    upsertPacote({
      pacoteId: editingPackage ? editingPackage.id : null,
      pacoteData: finalData,
    }, {
      onSuccess: handleCloseModal
    });
  };

  const handleToggleStatus = (pacote: Pacote) => {
    if (pacote.ativo) {
      setDeactivatingPackage(pacote);
    } else {
      togglePacoteAtivo({ id: pacote.id, newStatus: true });
    }
  };
  
  const confirmDeactivation = () => {
    if (deactivatingPackage) {
      togglePacoteAtivo({ id: deactivatingPackage.id, newStatus: false }, {
        onSuccess: () => setDeactivatingPackage(null)
      });
    }
  };

  const confirmDelete = () => {
    if (deletingPackage) {
      deletePacote(deletingPackage.id, {
        onSuccess: () => setDeletingPackage(null)
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const isPending = isUpserting || isToggling || isDeleting;

  return (
    <>
      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Gerenciar Pacotes de Créditos
          </h1>
          <Button 
            onClick={() => handleOpenModal(null)}
            className="bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90"
            disabled={isPending}
          >
            Adicionar Novo Pacote
          </Button>
        </div>
        
        <Separator className="my-4" />

        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="ml-2">Carregando pacotes...</p>
          </div>
        )}

        {isError && (
           <div className="p-4 text-red-500 bg-red-100 border border-red-400 rounded-md">
             <p>Erro ao carregar os pacotes: {error?.message}</p>
           </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto relative border border-border rounded-md admin-table-fix-dark-border">
            <Table>
              <TableCaption className="py-3">Lista de todos os pacotes de créditos cadastrados.</TableCaption>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Créditos</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="text-center">Listável</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-card divide-y divide-border">
                {pacotes.map((pacote: Pacote) => (
                  <TableRow key={pacote.id} className="hover:bg-muted/50 odd:bg-muted/20">
                    <TableCell className="font-medium">{pacote.nome}</TableCell>
                    <TableCell>{formatCurrency(pacote.valor)}</TableCell>
                    <TableCell>{pacote.creditos_oferecidos}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={pacote.ativo ? 'default' : 'outline'} className={pacote.ativo ? 'bg-status-green text-white' : ''}>
                        {pacote.ativo ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                       <Badge variant={pacote.listavel ? 'default' : 'secondary'}>
                        {pacote.listavel ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap">
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal(pacote)} disabled={isPending}>
                        Editar
                      </Button>
                      <Button
                        variant={pacote.ativo ? "destructive" : "secondary"}
                        size="sm"
                        onClick={() => handleToggleStatus(pacote)}
                        disabled={isToggling && deactivatingPackage?.id === pacote.id}
                      >
                        {isToggling && deactivatingPackage?.id === pacote.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (pacote.ativo ? 'Desativar' : 'Ativar')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyLink(pacote.id)}
                        title="Copiar link de compra direta"
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingPackage(pacote)}
                        disabled={isPending}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="pt-4">
          <Link to="/admin">
            <Button variant="outline">Voltar ao Painel Admin</Button>
          </Link>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPackage ? 'Editar Pacote' : 'Adicionar Novo Pacote'}</DialogTitle>
            <DialogDescription>
              {editingPackage ? 'Modifique os detalhes do pacote.' : 'Preencha os detalhes do novo pacote de créditos.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome" className="text-right">Nome*</Label>
              <div className="col-span-3">
                <Input id="nome" {...register("nome")} />
                {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="descricao" className="text-right self-start pt-2">Descrição</Label>
              <Textarea id="descricao" {...register("descricao")} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valor" className="text-right">Valor (R$)*</Label>
              <div className="col-span-3">
                <Input id="valor" type="number" step="0.01" {...register("valor")} />
                {errors.valor && <p className="text-red-500 text-xs mt-1">{errors.valor.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="creditos_oferecidos" className="text-right">Créditos*</Label>
              <div className="col-span-3">
                <Input id="creditos_oferecidos" type="number" {...register("creditos_oferecidos")} />
                {errors.creditos_oferecidos && <p className="text-red-500 text-xs mt-1">{errors.creditos_oferecidos.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Opções</Label>
              <div className='col-span-3 space-y-2'>
                <Controller
                  name="ativo"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ativo"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label htmlFor="ativo">Ativo</Label>
                    </div>
                  )}
                />
                <Controller
                  name="listavel"
                  control={control}
                  render={({ field }) => (
                     <div className="flex items-center space-x-2">
                      <Checkbox
                        id="listavel"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label htmlFor="listavel">Listável</Label>
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="col-span-4">
              <Label>Locutores Associados</Label>
              <Controller
                control={control}
                name="locutoresIds"
                render={({ field }) => (
                  <ScrollArea className="h-40 w-full rounded-md border p-4 mt-2">
                    {isLoadingLocutores ? (
                      <div className="flex items-center space-x-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Carregando locutores...</span></div>
                    ) : (
                      locutores.map((locutor) => (
                        <div key={locutor.id} className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id={`locutor-${locutor.id}`}
                            checked={field.value?.includes(locutor.id)}
                            onCheckedChange={(checked) => {
                              const newValue = checked
                                ? [...(field.value || []), locutor.id]
                                : (field.value || []).filter((id) => id !== locutor.id);
                              field.onChange(newValue);
                            }}
                          />
                          <Label htmlFor={`locutor-${locutor.id}`} className="font-normal">{locutor.nome}</Label>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                )}
              />
              {errors.locutoresIds && <p className="text-red-500 text-xs mt-1">{errors.locutoresIds.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingPackage ? 'Salvar Alterações' : 'Criar Pacote'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deactivatingPackage} onOpenChange={(open) => !open && setDeactivatingPackage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Desativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar o pacote "<b>{deactivatingPackage?.nome}</b>"?
              Ele não poderá ser usado em novas compras, mas o histórico será mantido. Esta ação pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeactivatingPackage(null)} disabled={isToggling}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivation} disabled={isToggling} className="bg-destructive hover:bg-destructive/90">
              {isToggling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Desativação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingPackage} onOpenChange={(open) => !open && setDeletingPackage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pacote "<b>{deletingPackage?.nome}</b>"?
              <br/><br/>
              <span className="font-bold">Atenção:</span> Se o pacote estiver em uso por algum cliente, ele será apenas <span className="font-bold">desativado</span>. Caso contrário, será <span className="font-bold text-red-500">permanentemente excluído</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPackage(null)} disabled={isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AdminPacotesPage; 