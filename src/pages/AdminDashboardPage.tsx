import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient'; // Ajuste o caminho se necessário
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
// Importar componentes do Dialog
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// Definir tipo para Pedido com dados relacionados (ajuste conforme necessário)
interface AdminPedido {
  id: string;
  created_at: string;
  status: string;
  texto_roteiro: string;
  creditos_debitados: number;
  profiles: {
    id: string;
    full_name: string | null;
  } | null;
  locutores: {
    id: string;
    nome: string;
  } | null;
  admin_notes?: string | null;
  audio_final_url?: string | null;
}

function AdminDashboardPage() {
  const { signOut, user, profile } = useAuth(); // Pegar dados do admin logado
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pendingPedidos, setPendingPedidos] = useState<AdminPedido[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  // Estados para o modal
  const [selectedPedido, setSelectedPedido] = useState<AdminPedido | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Novos estados para o modal
  const [currentStatus, setCurrentStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Novos estados para as métricas dos cards
  const [totalClientesAtivos, setTotalClientesAtivos] = useState(0);
  const [totalCreditosEmCirculacao, setTotalCreditosEmCirculacao] = useState(0);
  const [totalPedidosPendentes, setTotalPedidosPendentes] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Função para buscar pedidos pendentes
  const fetchPendingPedidos = async () => {
    console.log("AdminDashboard: Iniciando busca de pedidos pendentes...");
    setLoadingPending(true);
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          created_at,
          status,
          texto_roteiro,
          creditos_debitados,
          profiles ( id, full_name ),
          locutores ( id, nome )
        `)
        .eq('status', 'pendente')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro detalhado ao buscar pedidos pendentes:', error);
        throw error;
      }

      // Mapear dados para ajustar a estrutura de profiles e locutores
      const mappedPedidos: AdminPedido[] = (data || []).map((pedido: any) => ({
        ...pedido,
        profiles: Array.isArray(pedido.profiles) 
                    ? pedido.profiles[0] // Pega o primeiro do array (se for array)
                    : pedido.profiles,    // Mantém se já for objeto
        locutores: Array.isArray(pedido.locutores)
                    ? pedido.locutores[0] // Pega o primeiro do array (se for array)
                    : pedido.locutores,   // Mantém se já for objeto
      }));

      setPendingPedidos(mappedPedidos);
      console.log('Pedidos pendentes carregados:', mappedPedidos);
    } catch (err: any) {
      console.error('Erro no bloco try/catch ao buscar pedidos pendentes:', err);
      toast.error("Erro ao Carregar Pedidos", { description: err.message || "Não foi possível carregar os pedidos pendentes." });
    } finally {
      setLoadingPending(false);
    }
  };

  // useEffect para buscar pedidos na montagem
  useEffect(() => {
    fetchPendingPedidos();
    fetchDashboardStats();
  }, []);

  // Nova função para buscar estatísticas do dashboard
  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    try {
      // 1. Contar clientes ativos (role='cliente')
      const { count: clientesCount, error: clientesError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'cliente');

      if (clientesError) throw clientesError;
      setTotalClientesAtivos(clientesCount || 0);

      // 2. Somar todos os créditos dos clientes
      const { data: clientesData, error: creditosError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('role', 'cliente');

      if (creditosError) throw creditosError;
      const totalCreditos = clientesData?.reduce((acc, cliente) => acc + (cliente.credits || 0), 0) || 0;
      setTotalCreditosEmCirculacao(totalCreditos);

      // 3. Contagem de pedidos pendentes é atualizada pelo useEffect abaixo que observa pendingPedidos

    } catch (err: any) {
      console.error("Erro ao buscar estatísticas do dashboard:", err);
      toast.error("Erro Estatísticas", { description: err.message });
    } finally {
      setLoadingStats(false);
    }
  };

  // Atualizar totalPedidosPendentes quando pendingPedidos mudar
  useEffect(() => {
    setTotalPedidosPendentes(pendingPedidos.length);
  }, [pendingPedidos]);

  // Função de Logout (similar à DashboardPage)
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      console.log("Admin Logout solicitado...");
      // Navegação para login é gerenciada pelo ProtectedRoute/App.tsx
    } catch (error) {
      console.error("Erro ao fazer logout (admin):", error);
      toast.error("Erro ao Sair", { description: "Não foi possível completar o logout." });
      setIsLoggingOut(false); // Reseta o estado em caso de erro
    }
  };

  const handleManagePedido = (pedido: AdminPedido) => {
    console.log('Gerenciar pedido ID:', pedido.id);
    setSelectedPedido(pedido);
    setCurrentStatus(pedido.status || 'pendente');
    setAdminNotes(pedido.admin_notes || '');
    setAudioFile(null);
    setIsModalOpen(true);
  };

  const handleUpdatePedido = async () => {
    if (!selectedPedido) return;

    setIsUpdating(true);
    // Não precisamos mais disso aqui, o backend retorna o caminho
    // let audioFinalUrl = selectedPedido.audio_final_url; 
    let finalAudioPath: string | null | undefined = selectedPedido.audio_final_url; // Mantém path existente por padrão
    let uploadError = null;

    try {
      // 1. Faz o upload para o servidor backend SE um novo arquivo foi selecionado
      if (audioFile) {
        console.log('Enviando arquivo para o backend:', audioFile.name);

        const formData = new FormData();
        formData.append('audioFile', audioFile); // Chave deve corresponder a upload.single('audioFile')
        
        // Adicionar nome do cliente ao FormData para o backend usar
        const clientProfile = selectedPedido?.profiles;
        let clientName = 'unknown_client';
        if (clientProfile) {
          clientName = clientProfile.full_name?.trim() ? clientProfile.full_name.trim() : 'unknown_client';
        }

        console.log('FormData sendo enviado (sem clientName):', { audioFile: audioFile.name });

        // Sanitizar o nome do cliente para a URL
        const sanitizedClientNameForUrl = clientName
                                        .toLowerCase()
                                        .replace(/\s+/g, '_')
                                        .replace(/[^a-z0-9_.-]/g, '');

        // Construir a URL com o nome do cliente como parâmetro
        const uploadUrl = `http://localhost:3001/api/upload/${encodeURIComponent(sanitizedClientNameForUrl)}`;
        console.log('Enviando para URL:', uploadUrl); // Log da URL

        // Fazer a requisição POST para o endpoint de upload do backend
        const uploadResponse = await fetch(uploadUrl, { // Usar a nova URL
          method: 'POST',
          body: formData,
          // Headers não são estritamente necessários para FormData com fetch,
          // o navegador define Content-Type como multipart/form-data automaticamente.
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          // Se a resposta não for OK (ex: 400, 500), lançar erro com a mensagem do backend
          uploadError = uploadResult.message || `Erro HTTP: ${uploadResponse.status}`;
          throw new Error(uploadError as string);
        }

        // Obter o caminho relativo do arquivo retornado pelo backend
        finalAudioPath = uploadResult.filePath;
        console.log('Upload para backend concluído. Path Relativo:', finalAudioPath);
        setAudioFile(null); // Limpa o estado do arquivo após o upload bem-sucedido
      }

      // 2. Atualizar o pedido no banco de dados Supabase
      console.log('Atualizando pedido no Supabase com status:', currentStatus, 'e path:', finalAudioPath);
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          status: currentStatus,
          admin_notes: adminNotes,
          audio_final_url: finalAudioPath // Salva o caminho relativo retornado pelo backend
        })
        .eq('id', selectedPedido.id);

      if (updateError) {
        throw updateError;
      }

      toast.success("Pedido atualizado e áudio enviado (se aplicável).");
      setIsModalOpen(false);
      fetchPendingPedidos();

    } catch (err: any) {
      console.error("Erro ao atualizar pedido/upload:", err);
      const message = uploadError ? `Falha no Upload: ${err.message}` : `Falha na Atualização DB: ${err.message}`;
      toast.error(message, { description: "Verifique o console para mais detalhes." });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        <Button onClick={handleLogout} variant="outline" disabled={isLoggingOut}>
          {isLoggingOut ? 'Saindo...' : 'Sair'}
        </Button>
      </div>

      {/* Seção de Cards de Estatísticas Adicionada */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            {/* Ícone opcional: <Users className="h-4 w-4 text-muted-foreground" /> */}
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="text-2xl font-bold">{totalClientesAtivos}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Créditos (Clientes)</CardTitle>
            {/* Ícone opcional: <CreditCard className="h-4 w-4 text-muted-foreground" /> */}
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="text-2xl font-bold">{totalCreditosEmCirculacao}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
            {/* Ícone opcional: <Activity className="h-4 w-4 text-muted-foreground" /> */}
          </CardHeader>
          <CardContent>
            {(loadingStats && !pendingPedidos.length) || (loadingPending && !pendingPedidos.length) ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="text-2xl font-bold">{totalPedidosPendentes}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seção de Navegação Adicionada */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Usuários</CardTitle>
            <CardDescription>Altere roles e gerencie os usuários da plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/admin/usuarios">
              <Button className="w-full">Acessar Gerenciamento de Usuários</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Locutores</CardTitle>
            <CardDescription>Adicione, edite ou remova locutores.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/admin/locutores">
              <Button className="w-full">Acessar Gerenciamento de Locutores</Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Pendentes de Gravação</CardTitle>
              <CardDescription>Pedidos aguardando processamento.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="text-center p-4">Carregando pedidos pendentes...</div>
              ) : (
                <Table>
                  <TableCaption>Lista de pedidos com status 'pendente'.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Locutor</TableHead>
                      <TableHead>Texto (início)</TableHead>
                      <TableHead className="text-right">Créditos</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPedidos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Nenhum pedido pendente encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingPedidos.map((pedido) => (
                        <TableRow key={pedido.id}>
                          <TableCell className="font-medium">
                            {new Date(pedido.created_at).toLocaleDateString('pt-BR')} {new Date(pedido.created_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute:'2-digit' })}
                          </TableCell>
                          <TableCell>{pedido.profiles?.full_name || 'Cliente não encontrado'}</TableCell>
                          <TableCell>{pedido.locutores?.nome || 'Locutor não encontrado'}</TableCell>
                          <TableCell>
                            <span title={pedido.texto_roteiro}>
                              {pedido.texto_roteiro.substring(0, 50)}{pedido.texto_roteiro.length > 50 ? '...' : ''}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{pedido.creditos_debitados}</TableCell>
                          <TableCell className="text-center">
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => handleManagePedido(pedido)}>
                                Gerenciar
                              </Button>
                            </DialogTrigger>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        {selectedPedido && (
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Gerenciar Pedido #{selectedPedido?.id?.substring(0, 8)}...</DialogTitle>
              <DialogDescription>
                Cliente: {selectedPedido?.profiles?.full_name || 'N/A'} |
                Locutor: {selectedPedido?.locutores?.nome || 'N/A'} |
                Data: {selectedPedido?.created_at ? new Date(selectedPedido.created_at).toLocaleString() : 'N/A'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="texto-roteiro" className="text-right col-span-1">Roteiro</Label>
                <Textarea id="texto-roteiro" value={selectedPedido?.texto_roteiro || ''} readOnly rows={6} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status-pedido" className="text-right col-span-1">Status</Label>
                <Select value={currentStatus} onValueChange={setCurrentStatus} disabled={isUpdating}>
                  <SelectTrigger id="status-pedido" className="col-span-3">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="gravando">Gravando</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="admin-notes" className="text-right col-span-1">Notas Internas</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Notas para a equipe interna..."
                  rows={3}
                  className="col-span-3"
                  disabled={isUpdating}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="audio-file" className="text-right col-span-1">Áudio Final</Label>
                <Input
                    id="audio-file"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files ? e.target.files[0] : null)}
                    className="col-span-3"
                    disabled={isUpdating}
                />
             </div>
             {(audioFile || selectedPedido?.audio_final_url) && (
                 <div className="grid grid-cols-4 items-center gap-4 -mt-2">
                     <div className="col-start-2 col-span-3 text-sm text-muted-foreground">
                         {audioFile && <p>Novo arquivo selecionado: {audioFile.name}</p>}
                         {/* O link agora usa o caminho relativo (assumindo que o servidor está servindo /uploads) */}
                         {!audioFile && selectedPedido?.audio_final_url && 
                             <p>Áudio Atual: <a href={selectedPedido.audio_final_url} target="_blank" rel="noopener noreferrer" className="underline">Abrir/Baixar</a></p>}
                     </div>
                 </div>
             )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isUpdating}>Cancelar</Button>
              </DialogClose>
              <Button type="button" onClick={handleUpdatePedido} disabled={isUpdating}>
                {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Adicionar outras seções administrativas aqui (ex: Gerenciar Locutores, Gerenciar Usuários) */}

    </div>
  );
}

export default AdminDashboardPage; 