import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

import { useFetchLocutoresList } from '@/hooks/queries/use-fetch-locutores-list.hook';
import { useSetClienteLocutores } from '@/hooks/mutations/use-set-cliente-locutores.mutation.hook';
import type { UserProfile } from '@/hooks/queries/use-fetch-admin-users.hook';

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from 'lucide-react';

interface ManageClientLocutoresModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

interface LocutoresFormData {
  locutoresIds: string[];
}

export function ManageClientLocutoresModal({ user, isOpen, onClose }: ManageClientLocutoresModalProps) {
  const [assignedLocutores, setAssignedLocutores] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: locutoresList = [], isLoading: isLoadingLocutores } = useFetchLocutoresList();
  const { mutate: setClienteLocutores, isPending: isSettingLocutores } = useSetClienteLocutores();

  const { control, handleSubmit, reset, getValues, setValue } = useForm<LocutoresFormData>({
    defaultValues: {
      locutoresIds: []
    }
  });

  useEffect(() => {
    const fetchAssignedLocutores = async (clienteId: string) => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('clientes_locutores')
        .select('locutor_id')
        .eq('cliente_id', clienteId);

      if (error) {
        console.error("Erro ao buscar locutores atribuídos:", error);
        toast.error("Falha ao carregar locutores selecionados.");
        setAssignedLocutores([]);
      } else {
        const ids = data.map(item => item.locutor_id);
        setAssignedLocutores(ids);
        reset({ locutoresIds: ids });
      }
      setIsLoading(false);
    };

    if (user?.id && isOpen) {
      fetchAssignedLocutores(user.id);
    } else {
      reset({ locutoresIds: [] });
    }
  }, [user, isOpen, reset]);
  
  const onSubmit = (data: LocutoresFormData) => {
    if (!user) return;

    setClienteLocutores({
      clienteId: user.id,
      locutoresIds: data.locutoresIds,
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Locutores para {user?.full_name}</DialogTitle>
          <DialogDescription>
            Selecione os locutores que este cliente poderá visualizar e utilizar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all-locutores"
                  checked={
                    locutoresList.length > 0 &&
                    getValues("locutoresIds").length === locutoresList.length
                  }
                  onCheckedChange={(checked) => {
                    const allLocutorIds = locutoresList.map(l => l.id);
                    setValue("locutoresIds", checked ? allLocutorIds : []);
                  }}
                />
                <Label htmlFor="select-all-locutores" className="font-semibold">
                  Selecionar Todos
                </Label>
              </div>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm text-destructive hover:text-destructive/80"
                onClick={() => setValue("locutoresIds", [])}
              >
                Remover todos
              </Button>
            </div>

            <Controller
              control={control}
              name="locutoresIds"
              render={({ field }) => (
                <ScrollArea className="h-60 w-full rounded-md border p-4">
                  {isLoading || isLoadingLocutores ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Carregando...</span>
                    </div>
                  ) : (
                    locutoresList.map((locutor) => (
                      <div key={locutor.id} className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id={`cliente-locutor-${locutor.id}`}
                          checked={field.value.includes(locutor.id)}
                          onCheckedChange={(checked) => {
                            const newValue = checked
                              ? [...field.value, locutor.id]
                              : field.value.filter((id) => id !== locutor.id);
                            field.onChange(newValue);
                          }}
                        />
                        <Label htmlFor={`cliente-locutor-${locutor.id}`} className="font-normal">
                          {locutor.nome}
                        </Label>
                      </div>
                    ))
                  )}
                </ScrollArea>
              )}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit" disabled={isSettingLocutores} className="bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90">
              {isSettingLocutores && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 