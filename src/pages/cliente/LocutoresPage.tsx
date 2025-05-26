import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Mic2, UsersRound, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';

interface Locutor {
  id: string;
  nome: string;
  descricao?: string;
  avatar_url?: string;
  amostra_audio_url?: string;
  ativo: boolean;
}

interface Amostra {
  url: string;
  estilo?: string;
}

const LocutoresPage: React.FC = () => {
  const { user } = useAuth();
  const [todosLocutores, setTodosLocutores] = useState<Locutor[]>([]);
  const [loadingLocutores, setLoadingLocutores] = useState(true);
  const [erroLocutores, setErroLocutores] = useState<string | null>(null);
  const [filtroNome, setFiltroNome] = useState('');
  const [idsLocutoresFavoritos, setIdsLocutoresFavoritos] = useState<string[]>([]);
  const [amostrasPorLocutor, setAmostrasPorLocutor] = useState<Record<string, Amostra[]>>({});
  const [modalAmostrasLocutorId, setModalAmostrasLocutorId] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState<HTMLAudioElement | null>(null);

  const fetchTodosLocutores = useCallback(async () => {
    setLoadingLocutores(true);
    setErroLocutores(null);
    try {
      const { data: locutoresData, error: locutoresError } = await supabase
        .from('locutores')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (locutoresError) throw locutoresError;
      setTodosLocutores(locutoresData || []);
      // Buscar amostras para cada locutor
      const amostras: Record<string, Amostra[]> = {};
      await Promise.all((locutoresData || []).map(async (locutor: Locutor) => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/locutor/${locutor.id}/demos`);
          if (!res.ok) return;
          const json = await res.json();
          amostras[locutor.id] = json.demos || [];
        } catch {
          amostras[locutor.id] = [];
        }
      }));
      setAmostrasPorLocutor(amostras);
      if (user?.id) {
        const { data: favoritosData, error: favoritosError } = await supabase
          .from('locutores_favoritos')
          .select('locutor_id')
          .eq('user_id', user.id);
        if (!favoritosError) {
          setIdsLocutoresFavoritos(favoritosData?.map(f => f.locutor_id) || []);
        }
      }
    } catch (error) {
      setErroLocutores('Não foi possível carregar os locutores. Tente novamente mais tarde.');
      setTodosLocutores([]);
      setIdsLocutoresFavoritos([]);
      setAmostrasPorLocutor({});
    } finally {
      setLoadingLocutores(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTodosLocutores();
  }, [fetchTodosLocutores]);

  const toggleFavorito = async (locutorId: string, isFavoritoAtual: boolean) => {
    if (!user?.id) return;
    if (isFavoritoAtual) {
      const { error } = await supabase
        .from('locutores_favoritos')
        .delete()
        .match({ user_id: user.id, locutor_id: locutorId });
      if (!error) {
        setIdsLocutoresFavoritos(prev => prev.filter(id => id !== locutorId));
      }
    } else {
      const { error } = await supabase
        .from('locutores_favoritos')
        .insert({ user_id: user.id, locutor_id: locutorId });
      if (!error) {
        setIdsLocutoresFavoritos(prev => [...prev, locutorId]);
      }
    }
  };

  const locutoresFiltradosPorNome = todosLocutores.filter(locutor =>
    locutor.nome.toLowerCase().includes(filtroNome.toLowerCase())
  );

  const handlePlayAudio = (event: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const currentAudio = event.currentTarget;
    if (audioPlaying && audioPlaying !== currentAudio) {
      audioPlaying.pause();
    }
    setAudioPlaying(currentAudio);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-startt-blue to-startt-purple flex items-center gap-2">
          <UsersRound className="h-8 w-8" /> Locutores
        </h1>
        <Input
          placeholder="Buscar locutor por nome..."
          value={filtroNome}
          onChange={e => setFiltroNome(e.target.value)}
          className="max-w-xs"
          aria-label="Buscar locutor por nome"
        />
      </div>
      {erroLocutores && (
        <div className="text-red-500 mb-4">{erroLocutores}</div>
      )}
      {loadingLocutores ? (
        <div className="text-center py-12 text-muted-foreground">Carregando locutores...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {locutoresFiltradosPorNome.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">Nenhum locutor encontrado.</div>
          ) : (
            locutoresFiltradosPorNome.map(locutor => {
              const isFavorito = idsLocutoresFavoritos.includes(locutor.id);
              const amostras = amostrasPorLocutor[locutor.id] || [];
              return (
                <Card key={locutor.id} className="flex flex-col overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ease-out bg-card relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFavorito(locutor.id, isFavorito)}
                    className={cn(
                      "absolute top-3 right-3 z-10 text-muted-foreground hover:text-startt-purple bg-background/80 backdrop-blur-sm",
                      isFavorito && "text-pink-500 drop-shadow-lg animate-pulse"
                    )}
                    aria-label={isFavorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Heart className={cn("h-7 w-7 transition-all duration-200", isFavorito ? "fill-pink-500" : "")} aria-hidden="true" />
                  </Button>
                  <div className="p-4 flex items-center space-x-4">
                    <Avatar className="h-16 w-16 md:h-20 md:w-20">
                      <AvatarImage src={locutor.avatar_url || undefined} alt={locutor.nome} />
                      <AvatarFallback className="text-2xl bg-gradient-to-r from-startt-blue to-startt-purple text-primary-foreground">
                        {locutor.nome?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-startt-blue to-startt-purple mb-1">
                        {locutor.nome}
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground h-10 overflow-hidden text-ellipsis">
                        {locutor.descricao || "Voz profissional para seu projeto."}
                      </CardDescription>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setModalAmostrasLocutorId(locutor.id)}
                        aria-label={`Ouvir demos de ${locutor.nome}`}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" /> Ouvir Demos
                      </Button>
                    </div>
                  </div>
                  <CardFooter className="p-4 mt-auto">
                    <Button asChild className="w-full bg-gradient-to-r from-startt-blue to-startt-purple text-primary-foreground hover:opacity-90">
                      <Link to={`/gravar-locucao?locutorId=${locutor.id}`} aria-label={`Gravar com a voz de ${locutor.nome}`}>
                        <Mic2 className="mr-2 h-4 w-4" /> Escolher esta Voz
                      </Link>
                    </Button>
                  </CardFooter>
                  {/* Modal de Amostras */}
                  {modalAmostrasLocutorId === locutor.id && (
                    <Dialog open onOpenChange={() => setModalAmostrasLocutorId(null)}>
                      <DialogContent className="max-w-lg w-full">
                        <DialogHeader>
                          <DialogTitle className="bg-clip-text text-transparent bg-gradient-to-r from-startt-blue to-startt-purple">
                            Demos de {locutor.nome}
                          </DialogTitle>
                          <DialogDescription>
                            {amostras.length > 0
                              ? 'Ouça as diferentes demos de voz deste locutor.'
                              : 'Nenhuma demo disponível para este locutor.'}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {amostras.length > 0 ? (
                            amostras.map((amostra, idx) => (
                              <div key={idx} className="flex flex-col gap-1">
                                <span className="font-medium text-sm text-startt-blue">
                                  {amostra.estilo || `Amostra ${idx + 1}`}
                                </span>
                                <audio 
                                  controls 
                                  className="w-full h-10 bg-card" 
                                  src={amostra.url} 
                                  onPlay={handlePlayAudio}
                                  aria-label={`Amostra ${amostra.estilo || idx + 1} de ${locutor.nome}`}>
                                  Seu navegador não suporta o elemento de áudio.
                                </audio>
                              </div>
                            ))
                          ) : (
                            <div className="text-muted-foreground text-center py-4">Nenhuma amostra disponível.</div>
                          )}
                        </div>
                        <DialogClose asChild>
                          <Button variant="secondary" className="mt-4 w-full">Fechar</Button>
                        </DialogClose>
                      </DialogContent>
                    </Dialog>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default LocutoresPage;