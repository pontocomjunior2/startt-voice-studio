import { useState, useEffect } from 'react';
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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Link } from 'react-router-dom';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { InputUploadImagemLocutor } from '@/components/admin/input-upload-imagem-locutor';
import { InputUploadAudioLocutor } from '@/components/admin/input-upload-audio-locutor';
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { Loader2 } from "lucide-react";

// Interface para o tipo Locutor (ajuste conforme sua tabela)
interface Locutor {
  id: string;
  created_at?: string;
  nome_artistico: string;
  bio?: string | null;
  avatar_url?: string | null;
  ativo?: boolean;
  amostra_audio_url?: string | null;
  demos?: DemoLocutor[];
  ia_disponivel?: boolean;
  ia_voice_id?: string | null;
}

// Adicionar tipos auxiliares para demo
interface DemoLocutor {
  estilo: string;
  url: string;
}

function AdminLocutoresPage() {
  const [locutores, setLocutores] = useState<Locutor[]>([]);
  const [loadingLocutores, setLoadingLocutores] = useState(true);
  const [isLocutorModalOpen, setIsLocutorModalOpen] = useState(false);
  const [editingLocutor, setEditingLocutor] = useState<Locutor | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [locutorToDelete, setLocutorToDelete] = useState<Locutor | null>(null);
  const [locutorToDeletePermanently, setLocutorToDeletePermanently] = useState<Locutor | null>(null);

  const [locutorFilter, setLocutorFilter] = useState('');

  // Estados para o formulário do locutor
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [demos, setDemos] = useState<DemoLocutor[]>([]);
  const [ativo, setAtivo] = useState(true);
  const [iaDisponivel, setIaDisponivel] = useState(false);
  const [iaVoiceId, setIaVoiceId] = useState('');

  const fetchAllLocutores = async () => {
    setLoadingLocutores(true);
    try {
      const { data, error } = await supabase
        .from('locutores')
        .select('*')
        .order('nome_artistico', { ascending: true });
      if (error) {
        console.error("Erro ao buscar locutores:", error);
        throw error;
      }
      // Buscar demos para cada locutor
      const locutoresComDemos = await Promise.all((data || []).map(async (locutor) => {
        try {
          const res = await fetch(`http://localhost:3001/api/locutor/${locutor.id}/demos`);
          if (!res.ok) return { ...locutor, demos: [] };
          const json = await res.json();
          return { ...locutor, demos: json.demos || [] };
        } catch (e) {
          return { ...locutor, demos: [] };
        }
      }));
      setLocutores(locutoresComDemos);
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
    setDemos([]);
    setAtivo(true);
    setIaDisponivel(false);
    setIaVoiceId('');
    setEditingLocutor(null);
  };

  const handleOpenModal = (locutor: Locutor | null) => {
    if (locutor) {
      setEditingLocutor(locutor);
      setNome(locutor.nome_artistico);
      setDescricao(locutor.bio || '');
      setAvatarUrl(locutor.avatar_url || '');
      setDemos(locutor.demos || []);
      setAtivo(locutor.ativo === undefined ? true : locutor.ativo);
      setIaDisponivel(locutor.ia_disponivel || false);
      setIaVoiceId(locutor.ia_voice_id || '');
    } else {
      resetFormStates();
    }
    setIsLocutorModalOpen(true);
  };

  const handleSaveLocutor = async () => {
    setIsSaving(true);
    try {
      // Montar objeto apenas com campos da tabela locutores
      const locutorData = {
        nome_artistico: nome,
        bio: descricao || null,
        avatar_url: avatarUrl || null,
        ativo,
        ia_disponivel: iaDisponivel,
        ia_voice_id: iaDisponivel ? (iaVoiceId || null) : null,
      };

      let error, locutorId;
      if (editingLocutor) {
        const { error: updateError } = await supabase
          .from('locutores')
          .update(locutorData)
          .eq('id', editingLocutor.id);
        error = updateError;
        locutorId = editingLocutor.id;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('locutores')
          .insert([locutorData])
          .select('id')
          .single();
        error = insertError;
        locutorId = insertData?.id;
      }

      if (error) {
        console.error("Erro ao salvar locutor:", error);
        throw error;
      }

      // Salvar demos na tabela locutor_demos
      if (locutorId) {
        // Remover todas as demos antigas se estiver editando
        if (editingLocutor) {
          await supabase.from('locutor_demos').delete().eq('locutor_id', locutorId);
        }
        // Adicionar as demos atuais
        for (const demo of demos) {
          if (demo.estilo && demo.url) {
            await fetch(`http://localhost:3001/api/locutor/${locutorId}/demos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ estilo: demo.estilo, url: demo.url })
            });
          }
        }
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
      
      if (error) {
        console.error("Erro ao desativar locutor:", error);
        throw error;
      }
      toast.success(`Locutor "${locutorToDelete.nome_artistico}" desativado com sucesso.`);
      setLocutorToDelete(null); // Fecha o AlertDialog
      fetchAllLocutores();
    } catch (err: any) {
      toast.error("Erro ao Desativar Locutor", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLocutorPermanently = (locutor: Locutor) => {
    setLocutorToDeletePermanently(locutor);
  };

  const confirmDeleteLocutorPermanently = async () => {
    if (!locutorToDeletePermanently) return;
    setIsSaving(true);
    try {
      // Primeiro, deletar todas as demos relacionadas
      const { error: demosError } = await supabase
        .from('locutor_demos')
        .delete()
        .eq('locutor_id', locutorToDeletePermanently.id);

      if (demosError) {
        console.error("Erro ao deletar demos do locutor:", demosError);
        throw demosError;
      }

      // Depois, deletar o locutor
      const { error } = await supabase
        .from('locutores')
        .delete()
        .eq('id', locutorToDeletePermanently.id);

      if (error) {
        console.error("Erro ao excluir locutor:", error);
        throw error;
      }

      toast.success(`Locutor "${locutorToDeletePermanently.nome_artistico}" excluído permanentemente.`);
      setLocutorToDeletePermanently(null);
      fetchAllLocutores();
    } catch (err: any) {
      toast.error("Erro ao Excluir Locutor", { 
        description: err.message || "Verifique se o locutor não possui pedidos associados." 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLocutores = locutores.filter(locutor =>
    (locutor.nome_artistico || '').toLowerCase().includes(locutorFilter.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-foreground">Gerenciar Locutores</h1>
        <Button onClick={() => handleOpenModal(null)} className="bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90">Adicionar Novo Locutor</Button>
      </div>
      
      <Separator className="my-4" />

      <div className="mb-4 mt-4">
        <Input 
          type="text"
          placeholder="Filtrar por nome..."
          value={locutorFilter}
          onChange={(e) => setLocutorFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Tabela de Locutores */}
      {loadingLocutores ? (
        <p>Carregando locutores...</p>
      ) : (
        <div className="overflow-x-auto relative border border-border rounded-md admin-table-fix-dark-border">
          <Table>
            <TableCaption className="py-3">Lista de todos os locutores cadastrados.</TableCaption>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição (Início)</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Ativo</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amostra Áudio</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card divide-y divide-border">
              {filteredLocutores.map((locutor) => (
                <TableRow key={locutor.id} className="hover:bg-muted/50 odd:bg-muted/20">
                  <TableCell className="font-medium px-4 py-3 whitespace-nowrap">{locutor.nome_artistico}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">{locutor.bio?.substring(0, 50)}{locutor.bio && locutor.bio.length > 50 ? '...' : ''}</TableCell>
                  <TableCell className="text-center px-4 py-3 whitespace-nowrap">
                    <Badge variant={locutor.ativo ? 'default' : 'outline'} className={locutor.ativo ? 'bg-status-green text-white' : ''}>
                      {locutor.ativo ? 'Sim' : 'Não'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    {locutor.demos && locutor.demos.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {locutor.demos.map((demo, i) => (
                          <div key={i} className="flex flex-col items-start">
                            <span className="text-xs font-semibold text-muted-foreground mb-1">{demo.estilo || 'Estilo'}</span>
                            <audio controls className="h-8 w-48 max-w-full" aria-label={`Demo de áudio estilo ${demo.estilo}`}>
                              <source src={demo.url} />
                              Seu navegador não suporta o elemento de áudio.
                            </audio>
                          </div>
                        ))}
                      </div>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenModal(locutor)}>Editar</Button>
                    <Button variant="destructive" size="sm" onClick={() => setLocutorToDelete(locutor)} disabled={!locutor.ativo}>Desativar</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteLocutorPermanently(locutor)} className="bg-red-600 hover:bg-red-700">Excluir</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal de Adicionar/Editar Locutor */}
      <Dialog open={isLocutorModalOpen} onOpenChange={(isOpen) => {
        setIsLocutorModalOpen(isOpen);
        if (!isOpen) resetFormStates();
      }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingLocutor ? `Editar Locutor: ${editingLocutor.nome_artistico}` : 'Adicionar Novo Locutor'}</DialogTitle>
            <DialogDescription>
              {editingLocutor ? `Modifique os dados de ${editingLocutor.nome_artistico}.` : 'Preencha os dados do novo locutor.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            
            {/* Coluna Esquerda */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome-locutor">Nome</Label>
                <Input id="nome-locutor" value={nome} onChange={(e) => setNome(e.target.value)} disabled={isSaving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao-locutor">Descrição (Bio)</Label>
                <Textarea id="descricao-locutor" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} disabled={isSaving} />
              </div>
              <div className="space-y-2">
                <Label>Avatar</Label>
                <InputUploadImagemLocutor name="avatar-url-locutor" label="Avatar do Locutor" value={avatarUrl} onChange={setAvatarUrl} />
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <Label htmlFor="ativo-locutor" className="font-medium">Ativo</Label>
                  <Checkbox id="ativo-locutor" checked={ativo} onCheckedChange={(checked) => setAtivo(Boolean(checked))} disabled={isSaving} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <Label htmlFor="ia-disponivel" className="font-medium">Gravação por IA</Label>
                  <Switch id="ia-disponivel" checked={iaDisponivel} onCheckedChange={setIaDisponivel} />
                </div>
                {iaDisponivel && (
                  <div className="space-y-2 pl-4 border-l-2 border-primary">
                    <Label htmlFor="ia-voice-id">ElevenLabs Voice ID</Label>
                    <Input id="ia-voice-id" value={iaVoiceId} onChange={(e) => setIaVoiceId(e.target.value)} placeholder="ID da voz clonada"/>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4 flex flex-col">
              <h3 className="text-lg font-semibold border-b pb-2">Demos de Áudio</h3>
              <ScrollArea className="flex-grow h-[50vh] w-full rounded-md border p-4">
                {demos.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">Nenhuma demo adicionada.</div>
                ) : (
                  demos.map((demo, idx) => (
                    <div key={idx} className="flex flex-col gap-3 p-3 border rounded bg-muted/20 mb-4 relative">
                      <Button variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive h-6 w-6" onClick={() => setDemos(demos.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="space-y-1">
                        <Label>Estilo</Label>
                        <select className="w-full border rounded px-2 py-1.5 text-sm" value={demo.estilo} onChange={(e) => {
                          const newDemos = [...demos];
                          newDemos[idx].estilo = e.target.value;
                          setDemos(newDemos);
                        }}>
                          <option value="">Selecione o estilo</option>
                          <option value="padrao">Padrão</option>
                          <option value="impacto">Impacto</option>
                          <option value="jovem">Jovem</option>
                          <option value="varejo">Varejo</option>
                          <option value="institucional">Institucional</option>
                          <option value="up_festas">Up/Festas</option>
                          <option value="jornalistico">Jornalístico</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label>Amostra de Áudio</Label>
                        <InputUploadAudioLocutor
                          name={`demo-audio-${idx}`}
                          label="Amostra de Áudio"
                          value={demo.url}
                          onChange={url => {
                            const newDemos = [...demos];
                            newDemos[idx].url = url;
                            setDemos(newDemos);
                          }}
                          uploadUrl={`http://localhost:3001/api/upload/demo?nomeLocutor=${encodeURIComponent(nome)}&estilo=${encodeURIComponent(demo.estilo)}`}
                          disabled={!demo.estilo}
                        />
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
              <Button type="button" className="w-full" onClick={() => setDemos([...demos, { estilo: '', url: '' }])}>Adicionar Demo</Button>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="button" onClick={handleSaveLocutor} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin mr-2"/> : null}
              Salvar
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
              Tem certeza que deseja desativar o locutor "{locutorToDelete?.nome_artistico}"? 
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

      {/* AlertDialog para Confirmar Exclusão Permanente */}
      <AlertDialog open={!!locutorToDeletePermanently} onOpenChange={(isOpen) => {
        if (!isOpen) setLocutorToDeletePermanently(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Confirmar Exclusão Permanente</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">
                ATENÇÃO: Esta ação é irreversível!
              </p>
              <p>
                Tem certeza que deseja excluir permanentemente o locutor "{locutorToDeletePermanently?.nome_artistico}"?
              </p>
              <p className="text-sm text-muted-foreground">
                Isso irá remover completamente o locutor e todas as suas demos do sistema. 
                Se houver pedidos associados, a exclusão pode falhar.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLocutorToDeletePermanently(null)} disabled={isSaving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteLocutorPermanently} 
              disabled={isSaving} 
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? 'Excluindo...' : 'Excluir Permanentemente'}
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