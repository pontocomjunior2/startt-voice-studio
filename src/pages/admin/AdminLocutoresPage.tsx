import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient'; // Ajuste o caminho conforme necessário
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
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Link } from 'react-router-dom';

// Interface para o tipo Locutor (ajuste conforme sua tabela)
interface Locutor {
  id: string;
  created_at?: string;
  nome: string;
  descricao?: string | null;
  avatar_url?: string | null;
  ativo?: boolean;
  amostra_audio_url?: string | null;
}

function AdminLocutoresPage() {
  const [locutores, setLocutores] = useState<Locutor[]>([]);
  const [loadingLocutores, setLoadingLocutores] = useState(true);
  const [isLocutorModalOpen, setIsLocutorModalOpen] = useState(false);
  const [editingLocutor, setEditingLocutor] = useState<Locutor | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [locutorToDelete, setLocutorToDelete] = useState<Locutor | null>(null);

  // Estados para o formulário do locutor
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [amostraAudioUrl, setAmostraAudioUrl] = useState('');
  const [ativo, setAtivo] = useState(true);

  const fetchAllLocutores = async () => {
    setLoadingLocutores(true);
    try {
      const { data, error } = await supabase
        .from('locutores')
        .select('*')
        .order('nome', { ascending: true });
      if (error) {
        console.error("Erro ao buscar locutores:", error);
        throw error;
      }
      setLocutores(data || []);
    } catch (err: any) {
      toast.error("Erro ao Carregar Locutores", { description: err.message || "Tente novamente." });
    } finally {
      setLoadingLocutores(false);
    }
  };

  useEffect(() => {
    fetchAllLocutores();
  }, []);

  const resetFormStates = () => {
    setNome('');
    setDescricao('');
    setAvatarUrl('');
    setAmostraAudioUrl('');
    setAtivo(true);
    setEditingLocutor(null);
  };

  const handleOpenModal = (locutor: Locutor | null) => {
    if (locutor) {
      setEditingLocutor(locutor);
      setNome(locutor.nome);
      setDescricao(locutor.descricao || '');
      setAvatarUrl(locutor.avatar_url || '');
      setAmostraAudioUrl(locutor.amostra_audio_url || '');
      setAtivo(locutor.ativo === undefined ? true : locutor.ativo);
    } else {
      resetFormStates();
    }
    setIsLocutorModalOpen(true);
  };

  const handleSaveLocutor = async () => {
    setIsSaving(true);
    try {
      const locutorData = {
        nome,
        descricao: descricao || null,
        avatar_url: avatarUrl || null,
        amostra_audio_url: amostraAudioUrl || null,
        ativo,
      };

      let error;
      if (editingLocutor) {
        const { error: updateError } = await supabase
          .from('locutores')
          .update(locutorData)
          .eq('id', editingLocutor.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('locutores')
          .insert([locutorData]);
        error = insertError;
      }

      if (error) {
        console.error("Erro ao salvar locutor:", error);
        throw error;
      }

      toast.success(`Locutor ${editingLocutor ? 'atualizado' : 'adicionado'} com sucesso!`);
      setIsLocutorModalOpen(false);
      fetchAllLocutores();
      resetFormStates();
    } catch (err: any) {
      toast.error("Erro ao Salvar Locutor", { description: err.message || "Verifique os dados e tente novamente." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLocutor = async () => {
    if (!locutorToDelete) return;
    setIsSaving(true); // Reutilizar para o botão de confirmação do delete
    try {
      // Por segurança, vamos apenas desativar em vez de deletar
      const { error } = await supabase
        .from('locutores')
        .update({ ativo: false })
        .eq('id', locutorToDelete.id);
      
      // Se quisesse deletar (cuidado com FK constraints):
      // const { error } = await supabaseClient
      //   .from('locutores')
      //   .delete()
      //   .eq('id', locutorToDelete.id);

      if (error) {
        console.error("Erro ao desativar locutor:", error);
        throw error;
      }
      toast.success(`Locutor "${locutorToDelete.nome}" desativado com sucesso.`);
      setLocutorToDelete(null); // Fecha o AlertDialog
      fetchAllLocutores();
    } catch (err: any) {
      toast.error("Erro ao Desativar Locutor", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Locutores</h1>
        <Button onClick={() => handleOpenModal(null)}>Adicionar Novo Locutor</Button>
      </div>

      {/* Tabela de Locutores */}
      {loadingLocutores ? (
        <p>Carregando locutores...</p>
      ) : (
        <Table>
          <TableCaption>Lista de todos os locutores cadastrados.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição (início)</TableHead>
              <TableHead className="text-center">Ativo?</TableHead>
              <TableHead className="text-center">Amostra?</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locutores.map((locutor) => (
              <TableRow key={locutor.id}>
                <TableCell className="font-medium">{locutor.nome}</TableCell>
                <TableCell>{locutor.descricao?.substring(0, 50)}{locutor.descricao && locutor.descricao.length > 50 ? '...' : ''}</TableCell>
                <TableCell className="text-center">{locutor.ativo ? 'Sim' : 'Não'}</TableCell>
                <TableCell className="text-center">{locutor.amostra_audio_url ? 'Sim' : 'Não'}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenModal(locutor)}>Editar</Button>
                  <Button variant="destructive" size="sm" onClick={() => setLocutorToDelete(locutor)} disabled={!locutor.ativo}>Desativar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal de Adicionar/Editar Locutor */}
      <Dialog open={isLocutorModalOpen} onOpenChange={(isOpen) => {
        setIsLocutorModalOpen(isOpen);
        if (!isOpen) resetFormStates();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingLocutor ? 'Editar Locutor' : 'Adicionar Novo Locutor'}</DialogTitle>
            <DialogDescription>
              {editingLocutor ? `Modifique os dados de ${editingLocutor.nome}.` : 'Preencha os dados do novo locutor.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome-locutor" className="text-right">Nome</Label>
              <Input id="nome-locutor" value={nome} onChange={(e) => setNome(e.target.value)} className="col-span-3" disabled={isSaving} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="descricao-locutor" className="text-right">Descrição</Label>
              <Textarea id="descricao-locutor" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="col-span-3" rows={3} disabled={isSaving} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="avatar-url-locutor" className="text-right">URL Avatar</Label>
              <Input id="avatar-url-locutor" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="col-span-3" placeholder="https://exemplo.com/avatar.webp" disabled={isSaving} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amostra-url-locutor" className="text-right">URL Amostra Áudio</Label>
              <Input id="amostra-url-locutor" value={amostraAudioUrl} onChange={(e) => setAmostraAudioUrl(e.target.value)} className="col-span-3" placeholder="https://exemplo.com/amostra.mp3" disabled={isSaving} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ativo-locutor" className="text-right">Ativo</Label>
              <div className="col-span-3 flex items-center">
                <Checkbox id="ativo-locutor" checked={ativo} onCheckedChange={(checked) => setAtivo(Boolean(checked))} disabled={isSaving} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveLocutor} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para Confirmar Desativação */}
      <AlertDialog open={!!locutorToDelete} onOpenChange={(isOpen) => {
        if (!isOpen) setLocutorToDelete(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Desativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar o locutor "{locutorToDelete?.nome}"? 
              Ele não aparecerá mais para seleção de novos pedidos, mas o histórico será mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLocutorToDelete(null)} disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLocutor} disabled={isSaving} className="bg-destructive hover:bg-destructive/90">
              {isSaving ? 'Desativando...' : 'Confirmar Desativação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       {/* Link para voltar ao Admin Dashboard - opcional */}
       <div className="pt-4">
        <Link to="/admin">
          <Button variant="outline">Voltar ao Painel Admin</Button>
        </Link>
      </div>

    </div>
  );
}

export default AdminLocutoresPage; 