import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Mic2, UsersRound, PlayCircle, Download, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { useFetchAllowedLocutores, type LocutorCatalogo } from '@/hooks/queries/use-fetch-allowed-locutores.hook';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Amostra {
  url: string;
  estilo?: string;
}

const LocutoresPage: React.FC = () => {
  const { user } = useAuth();
  const { data: locutores = [], isLoading: loadingLocutores, isError, error } = useFetchAllowedLocutores();

  const [filtroNome, setFiltroNome] = useState('');
  const [filtroEstilo, setFiltroEstilo] = useState('all');
  const [ordenacao, setOrdenacao] = useState('alfabetica');
  const [idsLocutoresFavoritos, setIdsLocutoresFavoritos] = useState<string[]>([]);
  const [amostrasPorLocutor, setAmostrasPorLocutor] = useState<Record<string, Amostra[]>>({});
  const [modalAmostrasLocutorId, setModalAmostrasLocutorId] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchSecondaryData = async () => {
      if (!locutores || locutores.length === 0) return;

      const amostras: Record<string, Amostra[]> = {};
      await Promise.all(locutores.map(async (locutor) => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/locutor/${locutor.id}/demos`);
          if (!res.ok) return;
          const json = await res.json();
          amostras[locutor.id] = json.demos || [];
        } catch {
          amostras[locutor.id] = [];
        }
      }));
      setAmostrasPorLocutor(amostras);

      if (user?.id) {
        try {
          const { data: favoritosData, error: favoritosError } = await supabase
            .from('locutores_favoritos')
            .select('locutor_id')
            .eq('user_id', user.id);
          
          if (favoritosError) throw favoritosError;

          setIdsLocutoresFavoritos(favoritosData?.map(f => f.locutor_id) || []);
        } catch (favError) {
          console.error("Erro ao buscar favoritos:", favError);
          setIdsLocutoresFavoritos([]);
        }
      }
    };

    fetchSecondaryData();
  }, [locutores, user?.id]);

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

  const estilosUnicos = Array.from(new Set(locutores.flatMap((l: LocutorCatalogo) => l.demos?.map(d => d.estilo).filter(Boolean) || [])));

  const locutoresFiltrados = locutores.filter((locutor: LocutorCatalogo) => {
    const nomeMatch = (locutor.nome_artistico || '').toLowerCase().includes(filtroNome.toLowerCase());
    const estiloMatch = filtroEstilo === 'all' || (locutor.demos?.some(d => d.estilo === filtroEstilo));
    return nomeMatch && estiloMatch;
  });

  const locutoresOrdenados = [...locutoresFiltrados].sort((a, b) => {
    if (ordenacao === 'alfabetica') {
      return (a.nome_artistico || '').localeCompare(b.nome_artistico || '');
    }
    return 0;
  });

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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            placeholder="Buscar locutor por nome..."
            value={filtroNome}
            onChange={e => setFiltroNome(e.target.value)}
            className="max-w-xs"
            aria-label="Buscar locutor por nome"
          />
          <Select value={filtroEstilo} onValueChange={setFiltroEstilo}>
            <SelectTrigger className="max-w-xs" aria-label="Filtrar por estilo de voz">
              <span>{filtroEstilo === 'all' ? 'Todos os estilos' : filtroEstilo}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estilos</SelectItem>
              {estilosUnicos.map(estilo => (
                <SelectItem key={estilo} value={estilo}>{estilo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ordenacao} onValueChange={setOrdenacao}>
            <SelectTrigger className="max-w-xs" aria-label="Ordenar lista">
              <span>{ordenacao === 'alfabetica' ? 'Ordem Alfabética' : 'Mais Recentes'}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alfabetica">Ordem Alfabética</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {isError && (
        <div className="text-red-500 mb-4">
          Erro ao carregar locutores: {error?.message || 'Tente novamente mais tarde.'}
        </div>
      )}
      {loadingLocutores ? (
        <div className="text-center py-12 text-muted-foreground">Carregando locutores...</div>
      ) : (
        <div className="flex flex-col space-y-2">
          {locutoresOrdenados.length === 0 ? (
            <div className="text-center text-muted-foreground">Nenhum locutor encontrado.</div>
          ) : (
            locutoresOrdenados.map((locutor: LocutorCatalogo) => {
              const isFavorito = idsLocutoresFavoritos.includes(locutor.id);
              const amostras = amostrasPorLocutor[locutor.id] || [];
              const estilos = Array.from(new Set(amostras.map(a => a.estilo).filter(Boolean)));
              const estilosVisiveis = estilos.slice(0, 3);
              const estilosExtras = estilos.length > 3 ? estilos.slice(3) : [];
              const hasConteudoCentral = estilosVisiveis.length > 0;
              return (
                <Card key={locutor.id} className={`flex flex-row items-center justify-between gap-2 px-3 ${hasConteudoCentral ? 'py-2 min-h-[56px]' : 'py-1 min-h-[40px]'}`}>
                  <div className="flex items-center min-w-0 flex-1 gap-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={locutor.avatar_url || undefined} alt={locutor.nome_artistico || ''} />
                      <AvatarFallback className="text-base bg-gradient-to-r from-startt-blue to-startt-purple text-primary-foreground">
                        {(locutor.nome_artistico || 'L')?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate flex items-center gap-1 text-sm">
                        {locutor.nome_artistico || 'Locutor'}
                        {locutor.ia_disponivel && (
                          <span title="IA Instantânea disponível" aria-label="IA disponível" className="ml-1 text-yellow-500 text-base">✨</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">{locutor.bio || 'Voz profissional para seu projeto.'}</span>
                    </div>
                  </div>
                  {hasConteudoCentral && (
                    <div className="flex flex-wrap gap-1 min-w-[120px] max-w-[160px] justify-center items-center">
                      {estilosVisiveis.length > 0 ? estilosVisiveis.map(estilo => (
                        <Badge key={estilo} variant="secondary" className="text-xs px-1.5 py-0.5">{estilo}</Badge>
                      )) : null}
                      {estilosExtras.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5 cursor-pointer">+{estilosExtras.length}</Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="flex flex-col gap-1">
                                {estilosExtras.map(estilo => (
                                  <span key={estilo}>{estilo}</span>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  )}
                  <div className={`flex flex-row items-center gap-2 ${hasConteudoCentral ? 'min-w-[220px]' : 'min-w-[160px]'} justify-end`}>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setModalAmostrasLocutorId(locutor.id)}
                      aria-label={`Ouvir demos de ${locutor.nome_artistico}`}
                      className="border-muted-foreground"
                    >
                      <Headphones className="h-5 w-5" />
                    </Button>
                    <Button asChild size="sm" className="bg-gradient-to-r from-startt-blue to-startt-purple text-primary-foreground hover:opacity-90">
                      <Link to={`/gravar-locucao?locutorId=${locutor.id}`} aria-label={`Gravar com a voz de ${locutor.nome_artistico}`}>
                        Solicitar Gravação
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavorito(locutor.id, isFavorito)}
                      className={cn(
                        "text-muted-foreground hover:text-startt-purple bg-background/80 backdrop-blur-sm",
                        isFavorito && "text-pink-500 drop-shadow-lg animate-pulse"
                      )}
                      aria-label={isFavorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Heart className={cn("h-5 w-5 transition-all duration-200", isFavorito ? "fill-pink-500" : "")} aria-hidden="true" />
                    </Button>
                  </div>
                  {modalAmostrasLocutorId === locutor.id && (
                    <Dialog open onOpenChange={() => setModalAmostrasLocutorId(null)}>
                      <DialogContent className="max-w-lg w-full">
                        <DialogHeader>
                          <DialogTitle className="bg-clip-text text-transparent bg-gradient-to-r from-startt-blue to-startt-purple">
                            Demos de {locutor.nome_artistico}
                          </DialogTitle>
                          <DialogDescription>
                            {amostras.length > 0
                              ? 'Ouça e baixe as diferentes demos de voz deste locutor.'
                              : 'Nenhuma demo disponível para este locutor.'}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {amostras.length > 0 ? (
                            amostras.map((amostra, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                <span className="font-medium text-sm text-startt-blue min-w-[80px]">
                                  {amostra.estilo || `Amostra ${idx + 1}`}
                                </span>
                                <audio
                                  controls
                                  className="w-full h-8"
                                  src={amostra.url ?? ''}
                                  aria-label={`Amostra ${amostra.estilo || idx + 1} de ${locutor.nome_artistico}`}
                                  onPlay={e => {
                                    const currentAudio = e.currentTarget;
                                    if (audioPlaying && audioPlaying !== currentAudio) {
                                      audioPlaying.pause();
                                    }
                                    setAudioPlaying(currentAudio);
                                  }}
                                />
                                <a
                                  href={amostra.url ?? ''}
                                  download
                                  className="ml-2 text-muted-foreground hover:text-startt-purple"
                                  aria-label={`Baixar demo ${amostra.estilo || idx + 1}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-5 w-5" />
                                </a>
                              </div>
                            ))
                          ) : (
                            <div className="text-muted-foreground text-center py-4">Nenhuma demo disponível.</div>
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