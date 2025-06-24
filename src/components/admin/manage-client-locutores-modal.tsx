import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

import { useFetchLocutoresList, type LocutorSelecao } from '@/hooks/queries/use-fetch-locutores-list.hook';
import type { UserProfile } from '@/hooks/queries/use-fetch-admin-users.hook';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from 'lucide-react';

type Permissao = 'padrão' | 'permitido' | 'bloqueado';
interface PermissaoState {
  [locutorId: string]: Permissao;
}

export function ManageClientLocutoresModal({ user, isOpen, onClose }: { user: UserProfile | null; isOpen: boolean; onClose: () => void; }) {
  const [permissoes, setPermissoes] = useState<PermissaoState>({});
  const [initialPermissoes, setInitialPermissoes] = useState<PermissaoState>({});
  const [isLoading, setIsLoading] = useState(false);

  const { data: locutoresList = [], isLoading: isLoadingLocutores } = useFetchLocutoresList();

  useEffect(() => {
    if (user?.id && isOpen) {
      const fetchPermissoes = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('clientes_locutores_permissoes')
          .select('locutor_id, tipo_permissao')
          .eq('cliente_id', user.id);

        if (error) {
          toast.error("Erro ao carregar permissões customizadas.");
        } else {
          const loadedPerms = data.reduce((acc, perm) => {
            acc[perm.locutor_id] = perm.tipo_permissao as Permissao;
            return acc;
          }, {} as PermissaoState);
          setPermissoes(loadedPerms);
          setInitialPermissoes(loadedPerms);
        }
        setIsLoading(false);
      };
      fetchPermissoes();
    }
  }, [user, isOpen]);

  const handlePermissionChange = (locutorId: string, value: Permissao) => {
    setPermissoes(prev => ({ ...prev, [locutorId]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);

    const changes = Object.keys(permissoes).filter(
      locutorId => permissoes[locutorId] !== (initialPermissoes[locutorId] || 'padrão')
    ).concat(
      Object.keys(initialPermissoes).filter(
        locutorId => !(locutorId in permissoes)
      )
    );

    try {
      for (const locutorId of changes) {
        const permissao = permissoes[locutorId] || 'padrão';
        const { error } = await supabase.rpc('set_cliente_locutor_permissao', {
          p_cliente_id: user.id,
          p_locutor_id: locutorId,
          p_tipo_permissao: permissao,
        });
        if (error) throw error;
      }
      toast.success("Permissões atualizadas com sucesso!");
      onClose();
    } catch (error: any) {
      toast.error("Falha ao salvar permissões", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissao = (locutorId: string): Permissao => permissoes[locutorId] || 'padrão';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Acesso a Locutores para {user?.full_name}</DialogTitle>
          <DialogDescription>
            Defina regras de acesso específicas para este cliente, que sobrescrevem as regras dos pacotes.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-96 w-full pr-4">
            <div className="space-y-4">
              {isLoading || isLoadingLocutores ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin"/></div>
              ) : (
                locutoresList.map((locutor: LocutorSelecao) => (
                  <div key={locutor.id} className="p-3 border rounded-md flex justify-between items-center">
                    <Label className="font-semibold">{locutor.nome_artistico}</Label>
                    <RadioGroup
                      value={getPermissao(locutor.id)}
                      onValueChange={(value) => handlePermissionChange(locutor.id, value as Permissao)}
                      className="flex items-center space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="permitido" id={`perm-${locutor.id}`} className="text-green-500 border-green-500" />
                        <Label htmlFor={`perm-${locutor.id}`} className="text-green-600">Permitido</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="padrão" id={`padrao-${locutor.id}`} />
                        <Label htmlFor={`padrao-${locutor.id}`}>Padrão (do Pacote)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bloqueado" id={`bloq-${locutor.id}`} className="text-red-500 border-red-500" />
                        <Label htmlFor={`bloq-${locutor.id}`} className="text-red-600">Bloqueado</Label>
                      </div>
                    </RadioGroup>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 