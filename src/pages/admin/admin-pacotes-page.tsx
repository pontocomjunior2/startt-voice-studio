import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFetchPacotes } from "@/hooks/queries/use-fetch-pacotes.hook";
import { useUpsertPacote } from "@/hooks/mutations/use-upsert-pacote.mutation.hook";
import { useTogglePacoteAtivo } from "@/hooks/mutations/use-toggle-pacote-ativo.mutation.hook";
import { useFetchLocutoresList, type LocutorSelecao } from "@/hooks/queries/use-fetch-locutores-list.hook";
import { useDeletePacote } from "@/hooks/mutations/use-delete-pacote.mutation.hook";
import {
  pacoteSchema,
  type PacoteFormValues,
} from "@/lib/validators/pacote.validator";
import type { PacoteComLocutores } from "@/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Pencil, Trash2 } from "lucide-react";

export default function AdminPacotesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pacoteToDelete, setPacoteToDelete] = useState<PacoteComLocutores | null>(
    null
  );
  
  // Estado de teste para os switches
  const [testAtivo, setTestAtivo] = useState(true);
  const [testListavel, setTestListavel] = useState(false);

  const { data: pacotes, isLoading } = useFetchPacotes();
  const { data: locutores } = useFetchLocutoresList();
  const { mutate: upsertPacote, isPending: isUpserting } = useUpsertPacote();
  const { mutate: toggleAtivo } = useTogglePacoteAtivo();
  const { mutate: deletePacote, isPending: isDeleting } = useDeletePacote();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
    getValues,
    setValue,
  } = useForm<PacoteFormValues>({
    resolver: zodResolver(pacoteSchema),
    defaultValues: {
      id: undefined,
      nome: "",
      descricao: "",
      valor: 0,
      creditos_oferecidos: 0,
      ativo: true,
      listavel: true,
      locutores: [],
      validade_dias: undefined,
    },
  });

  // Observa mudanças no campo locutores para tornar os checkboxes reativos
  const watchedLocutores = useWatch({
    control,
    name: "locutores",
    defaultValue: [],
  });

  const handleOpenDialog = (pacote?: PacoteComLocutores) => {
    if (pacote) {
      setIsEditing(true);
      reset({
        ...pacote,
        locutores: pacote.locutores?.map((l) => l.id) || [],
        validade_dias: pacote.validade_dias || undefined,
      });
      // Sincronizar valores de teste
      setTestAtivo(pacote.ativo);
      setTestListavel(pacote.listavel);
    } else {
      setIsEditing(false);
      reset({
        id: undefined,
        nome: "",
        descricao: "",
        valor: 0,
        creditos_oferecidos: 0,
        ativo: true,
        listavel: true,
        locutores: [],
        validade_dias: undefined,
      });
      // Sincronizar valores de teste
      setTestAtivo(true);
      setTestListavel(true);
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: PacoteFormValues) => {
    upsertPacote(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
      },
    });
  };
  
  const handleDeleteConfirm = () => {
    if (pacoteToDelete) {
      deletePacote(pacoteToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setPacoteToDelete(null);
        },
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciamento de Pacotes</h1>
        <Button onClick={() => handleOpenDialog()}>Criar Novo Pacote</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center mt-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Locutores</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pacotes?.map((pacote) => (
                <TableRow key={pacote.id}>
                  <TableCell className="font-medium">{pacote.nome}</TableCell>
                  <TableCell>R$ {pacote.valor.toFixed(2)}</TableCell>
                  <TableCell>{pacote.creditos_oferecidos}</TableCell>
                  <TableCell>{pacote.validade_dias || "N/A"}</TableCell>
                  <TableCell>{pacote.locutores?.length || 0}</TableCell>
                  <TableCell>
                    <Switch
                      checked={pacote.ativo}
                      onCheckedChange={(newStatus) => 
                        toggleAtivo({ id: pacote.id, newStatus })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenDialog(pacote)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        setPacoteToDelete(pacote);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Formulário Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Pacote" : "Criar Novo Pacote"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Altere os dados do pacote."
                : "Preencha os dados para criar um novo pacote."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome" className="text-right">
                Nome*
              </Label>
              <div className="col-span-3">
                <Input id="nome" {...register("nome")} />
                {errors.nome && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.nome.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="descricao" className="text-right">
                Descrição
              </Label>
              <div className="col-span-3">
                <Input id="descricao" {...register("descricao")} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valor" className="text-right">
                Valor (R$)*
              </Label>
              <div className="col-span-3">
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  {...register("valor")}
                />
                {errors.valor && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.valor.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="creditos_oferecidos" className="text-right">
                Créditos*
              </Label>
              <div className="col-span-3">
                <Input
                  id="creditos_oferecidos"
                  type="number"
                  placeholder="Ex: 100"
                  {...register("creditos_oferecidos")}
                />
                {errors.creditos_oferecidos && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.creditos_oferecidos.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="validade_dias" className="text-right">
                Validade (dias)
              </Label>
              <div className="col-span-3">
                <Input
                  id="validade_dias"
                  type="number"
                  placeholder="Ex: 30 (deixe em branco para sem validade)"
                  {...register("validade_dias")}
                />
                {errors.validade_dias && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.validade_dias.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Opções</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={testAtivo}
                    onCheckedChange={(value) => {
                      setTestAtivo(value);
                      setValue("ativo", value);
                    }}
                  />
                                     <Label className="text-foreground cursor-pointer">Ativo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={testListavel}
                    onCheckedChange={(value) => {
                      setTestListavel(value);
                      setValue("listavel", value);
                    }}
                  />
                  <Label className="text-foreground cursor-pointer">Listável na Loja</Label>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right pt-2">Locutores</Label>
              <div className="col-span-3">
                <ScrollArea className="h-40 w-full rounded-md border p-4">
                  {locutores?.map((locutor: LocutorSelecao) => (
                    <div
                      key={locutor.id}
                      className="flex items-center space-x-2 mb-2"
                    >
                      <Checkbox
                        id={`locutor-${locutor.id}`}
                        onCheckedChange={(checked) => {
                          const currentLocutores = watchedLocutores || [];
                          if (checked) {
                            setValue("locutores", [
                              ...currentLocutores,
                              locutor.id,
                            ]);
                          } else {
                            setValue(
                              "locutores",
                              currentLocutores.filter(
                                (id: string) => id !== locutor.id
                              )
                            );
                          }
                        }}
                        checked={(watchedLocutores || []).includes(
                          locutor.id
                        )}
                      />
                      <Label
                        htmlFor={`locutor-${locutor.id}`}
                        className="text-foreground"
                      >
                        {locutor.nome_artistico}
                      </Label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isUpserting}>
                {isUpserting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Salvar Alterações" : "Criar Pacote"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá
              permanentemente o pacote.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPacoteToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 