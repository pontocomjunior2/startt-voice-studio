import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Session, User, AuthChangeEvent, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
// import { toast } from 'react-hot-toast'; // Removido temporariamente

// Definir a interface para o perfil, espelhando a tabela do Supabase
export interface Profile {
  id: string;
  updated_at: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: 'cliente' | 'admin' | null; // Ajuste os tipos de role conforme necessário
  credits: number | null; // Esta coluna será mantida, mas o saldo exibido virá de saldoCalculadoCreditos
  package_id: string | null; // ou number, dependendo da sua definição
  saldo_gravacao?: number; // NOVO
  saldo_ia?: number; // NOVO
  cpf?: string | null;
  cnpj?: string | null;
}

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isProcessing: boolean;
  isFetchingProfile: boolean;
  error: AuthError | null;
  signInWithPassword: (credentials: { identifier: string; password: string }) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  signUp: (credentials: SignUpWithPasswordCredentials) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
  unreadNotificationsCount: number;
  refreshNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const fetchUnreadNotifications = async (userId: string | undefined) => {
    if (!userId) {
      setUnreadNotificationsCount(0);
      return;
    }
    try {
      const { count, error: notificationError } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'concluido')
        .is('cliente_notificado_em', null);

      if (notificationError) {
        console.error("AuthContext: Erro ao buscar contagem de notificações:", notificationError);
        setUnreadNotificationsCount(0); // Resetar em caso de erro para evitar contagem antiga
      } else {
        console.log("AuthContext: Contagem de notificações não lidas:", count);
        setUnreadNotificationsCount(count || 0);
      }
    } catch (err) {
      console.error("AuthContext: Exceção ao buscar contagem de notificações:", err);
      setUnreadNotificationsCount(0);
    }
  };

  const fetchProfileAndUpdateState = async (userId: string) => {
    if (isFetchingProfile) {
      console.log('AuthContext: fetchProfileAndUpdateState - Busca de perfil já em andamento. Ignorando.');
      return;
    }
    console.log('AuthContext: fetchProfileAndUpdateState - INICIANDO busca para userId:', userId);
    setIsFetchingProfile(true);
    setError(null);

    console.log('AuthContext: fetchProfile - Verificando objeto supabase:', supabase);
    if (!supabase) {
      console.error('AuthContext: fetchProfile - ERRO CRÍTICO: Cliente Supabase NÃO está definido!');
      setIsFetchingProfile(false);
      return;
    }
    
    let timeoutId: NodeJS.Timeout | null = null; // Variável para guardar o ID do timeout

    try {
      const fetchWithTimeout = async () => {
        console.log('AuthContext: fetchProfile - Tentando executar supabase.from("profiles")...');
        
        const timeoutPromise = new Promise<string>((resolve) => {
          // Guarda o ID do timeout
          timeoutId = setTimeout(() => {
            console.warn('AuthContext: fetchProfile - Timeout de 15 segundos atingido. A query pode estar demorando.');
            resolve('timeout_marker'); // Resolve com marcador em caso de timeout
          }, 15000); 
        });
        
        const supabaseQuery = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        // Espera pela query OU pelo timeout
        const raceResult = await Promise.race([
          supabaseQuery.then(result => ({ type: 'query', payload: result })),
          timeoutPromise.then(marker => ({ type: 'timeout', payload: marker }))
        ]);

        // Se a query terminou (independente de sucesso/erro), limpa o timeout
        if (raceResult.type === 'query' && timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null; // Limpa a referência
        }

        // Retorna o resultado da query ou o marcador de timeout
        if (raceResult.type === 'query') {
          return raceResult.payload as { data: Profile | null; error: any; status: number; }; 
        } else {
          // Se foi timeout, esperamos a query original finalizar de qualquer forma
          console.log('AuthContext: fetchProfile - Timeout ocorreu, aguardando resultado final da query...');
          return await supabaseQuery;
        }
      };
      
      const result = await fetchWithTimeout();
      console.log('AuthContext: fetchProfile - Resultado da query:', result);
      
      if (result === null || typeof result === 'string') {
        console.warn('AuthContext: fetchProfile - Resultado nulo ou timeout antes da query completar.');
        setProfile(null); // Limpar perfil se a busca falhar ou der timeout
        await fetchUnreadNotifications(undefined); // Limpar contagem de notificações
      } else {
        const { data: userData, error: fetchError, status } = result;

        if (fetchError && status !== 406) {
          console.error('AuthContext: fetchProfile - Erro da query Supabase:', fetchError);
          setError(new AuthError(`Erro ao buscar perfil: ${fetchError.message}`));
          setProfile(null);
          await fetchUnreadNotifications(undefined); // Limpar contagem
        } else if (userData) {
          console.log('AuthContext: fetchProfile - Perfil encontrado:', userData as Profile);
          // Mantém o perfil básico por enquanto
          let updatedProfileData: Profile = { ...userData } as Profile;

                    // CORREÇÃO COMPLETA: Usar APENAS lotes_creditos válidos (com validade e FIFO)
          console.log(`[AuthContext] CORREÇÃO: Calculando apenas créditos válidos de lotes_creditos`);
          
          try {
            console.log(`[AuthContext] DEBUGGING: Iniciando busca de lotes para userId: ${userId}`);
            
            // Primeiro, vamos verificar TODOS os lotes deste usuário sem filtros
            const { data: todosLotes, error: todoLotesError } = await supabase
              .from('lotes_creditos')
              .select('*')
              .eq('user_id', userId);
            
            console.log(`[AuthContext] DEBUGGING: Todos os lotes do usuário:`, todosLotes);
            console.log(`[AuthContext] DEBUGGING: Erro ao buscar todos os lotes:`, todoLotesError);
            
            // Agora buscar apenas os lotes válidos (não expirados) e ativos
            const currentDate = new Date().toISOString();
            console.log(`[AuthContext] DEBUGGING: Data atual ISO: ${currentDate}`);
            
            const { data: lotes, error: lotesError } = await supabase
              .from('lotes_creditos')
              .select('creditos_gravacao_adicionados, creditos_gravacao_usados, creditos_ia_adicionados, creditos_ia_usados')
              .eq('user_id', userId)
              .eq('status', 'ativo')
              .or(`data_validade.is.null,data_validade.gt.${currentDate}`);
            
            console.log(`[AuthContext] DEBUGGING: Lotes válidos encontrados:`, lotes);
            console.log(`[AuthContext] DEBUGGING: Erro ao buscar lotes válidos:`, lotesError);
            
            if (lotesError) {
              console.error("[AuthContext] Erro ao buscar lotes de créditos:", lotesError);
              updatedProfileData.saldo_gravacao = 0;
              updatedProfileData.saldo_ia = 0;
            } else {
              const saldos = lotes?.reduce((acc, lote, index) => {
                const saldoGravacaoLote = (lote.creditos_gravacao_adicionados || 0) - (lote.creditos_gravacao_usados || 0);
                const saldoIaLote = (lote.creditos_ia_adicionados || 0) - (lote.creditos_ia_usados || 0);
                
                // Log de depuração detalhado para cada lote
                console.log(`[AuthContext] Processando Lote #${index + 1}: Saldo Gravação=${saldoGravacaoLote}, Saldo IA=${saldoIaLote}`, lote);

                acc.gravacao += saldoGravacaoLote;
                acc.ia += saldoIaLote;
                return acc;
              }, { gravacao: 0, ia: 0 }) || { gravacao: 0, ia: 0 };
              
              console.log(`[AuthContext] Usuário ${userId} - Saldos FINAIS calculados:`, saldos);
              updatedProfileData.saldo_gravacao = saldos.gravacao;
              updatedProfileData.saldo_ia = saldos.ia;
            }
          } catch (err) {
            console.error("[AuthContext] Erro ao calcular créditos totais:", err);
            updatedProfileData.saldo_gravacao = 0;
            updatedProfileData.saldo_ia = 0;
          }
          
          // Remover a lógica antiga baseada em saldoCalculadoCreditos
          delete (updatedProfileData as any).saldoCalculadoCreditos;

          setProfile(updatedProfileData);
          console.log(`[AuthContext] Profile após setar saldos:`, updatedProfileData);
          await fetchUnreadNotifications(userId); // BUSCAR CONTAGEM APÓS PERFIL
        } else if (status === 406) {
          console.warn('AuthContext: fetchProfile - Perfil não encontrado (status 406), usuário pode precisar criar um.');
          setProfile(null);
          await fetchUnreadNotifications(undefined); // Limpar contagem
        } else {
          console.log('AuthContext: fetchProfile - Nenhum dado ou erro específico (status 406) da query.');
          setProfile(null); // Garantir que perfil seja nulo se não houver dados válidos
          await fetchUnreadNotifications(undefined); // Limpar contagem
        }
      }
    } catch (err: any) {
      console.error('AuthContext: fetchProfile - Erro INESPERADO no try/catch:', err);
      setError(new AuthError(`Erro inesperado ao buscar perfil: ${err.message}`));
      setProfile(null);
      await fetchUnreadNotifications(undefined); // Limpar contagem
      if (timeoutId) clearTimeout(timeoutId); 
    } finally {
      setIsFetchingProfile(false);
      console.log('AuthContext: fetchProfileAndUpdateState - FINALIZANDO busca.');
      if (timeoutId) clearTimeout(timeoutId); 
    }
  };

  useEffect(() => {
    console.log('AuthProvider: useEffect - Configurando listener onAuthStateChange...');
    let isMounted = true;
    let initialSessionHandled = false;
    let initialSignInHandled = false;

    const handleAuthStateChange = async (event: AuthChangeEvent, currentSession: Session | null) => {
      if (!isMounted) return;

      console.log('AuthProvider: onAuthStateChange - Evento recebido:', event, 'Sessão:', currentSession);
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // Lógica de controle para buscar perfil
      let shouldFetchProfile = false;
      if (currentSession?.user) {
        if (event === 'INITIAL_SESSION' && !initialSessionHandled) {
          shouldFetchProfile = true;
          initialSessionHandled = true;
        } else if (event === 'SIGNED_IN' && !initialSignInHandled) {
          // Apenas busca no PRIMEIRO SIGNED_IN após o estado inicial ou logout
          shouldFetchProfile = true;
          initialSignInHandled = true; 
        }
        // Outros eventos como TOKEN_REFRESHED não disparam fetch aqui
      }

      if (shouldFetchProfile) {
        console.log(`AuthProvider: ${event} - Disparando busca de perfil para:`, currentSession!.user.id);
        await fetchProfileAndUpdateState(currentSession!.user.id);
      } else if (!currentSession?.user) {
        // Usuário deslogado ou sessão inválida
        console.log('AuthProvider: Usuário deslogado ou sessão inválida, limpando perfil e resetando flags.');
        setProfile(null);
        console.log('AuthContext: Estado session, user e profile limpos após evento que resultou em sessão nula (ex: SIGNED_OUT).');
        initialSessionHandled = false; // Reseta flags para o próximo login
        initialSignInHandled = false;
        fetchUnreadNotifications(undefined); // Limpar contagem ao deslogar (ou user se torna undefined)
      }
      
      // Define isLoading como false após o primeiro evento (INITIAL_SESSION) ser tratado
      // A UI não precisa esperar pelo perfil para o loading inicial
      if (!initialSessionHandled && event === 'INITIAL_SESSION') { 
         // Este bloco pode não ser mais necessário se getSession cobrir isso,
         // mas deixamos por segurança caso onAuthStateChange dispare INITIAL_SESSION primeiro.
         initialSessionHandled = true; // Marca que o estado inicial foi processado
      }

      // Definir isLoading como false assim que a sessão inicial for processada
      if (isLoading && initialSessionHandled) {
          console.log('AuthProvider: onAuthStateChange - Sessão inicial processada. Definindo isLoading=false.');
          setIsLoading(false);
      }
    };
    
    // Processar sessão inicial uma vez de forma mais robusta
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        console.error('AuthProvider: getInitialSession - Erro ao obter sessão inicial:', error);
      } else {
        console.log('AuthProvider: getInitialSession - Sessão inicial recuperada:', initialSession);
      }
      // Chama handleAuthStateChange mesmo com erro ou sessão nula para setar isLoading=false
      if (isMounted) {
        handleAuthStateChange('INITIAL_SESSION', initialSession);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'INITIAL_SESSION') {
        handleAuthStateChange(event, session);
      }
    });

    return () => {
      console.log('AuthProvider: useEffect - Limpando listener e marcando como desmontado.');
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      refreshProfile();
    }, 60000); // 1 minuto
    return () => clearInterval(interval);
  }, [user]);

  const signInWithPassword = async ({ identifier, password }: { identifier: string; password: string }) => {
    setIsProcessing(true);
    setError(null);
    let result = { error: null as AuthError | null };
    try {
      let email: string;
      if (identifier.includes('@')) {
        email = identifier;
      } else {
        // Login por username: buscar email correspondente no Supabase
        const { data, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', identifier)
          .single();
        if (error || !data?.email) {
          result.error = new AuthError('Usuário não encontrado. Verifique o nome de usuário.');
          setError(result.error);
          setIsProcessing(false);
          return result;
        }
        email = data.email;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      result.error = signInError;
      if (signInError) {
        setError(signInError);
        console.error("AuthProvider: signInWithPassword - Erro no login:", signInError);
      }
    } catch (err: any) {
      console.error("AuthProvider: signInWithPassword - Erro inesperado no login:", err);
      const unexpectedError = new AuthError(err.message || "Erro inesperado. Tente novamente.");
      setError(unexpectedError);
      result.error = unexpectedError;
    } finally {
      setIsProcessing(false);
    }
    return result;
  };

  const signOut = async () => {
      setIsProcessing(true); 
      setError(null);
      try {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
            setError(signOutError);
            console.error('AuthProvider: signOut - Erro ao fazer logout:', signOutError);
        }
      } catch (err: any) {
         console.error('AuthProvider: signOut - Erro inesperado ao fazer logout:', err);
         const unexpectedError = new AuthError(err.message || "Erro inesperado ao fazer logout.");
         setError(unexpectedError);
      } 
      finally {
         // Garantir que isProcessing seja definido como false SEMPRE após a tentativa de signOut
         setIsProcessing(false);
         console.log('AuthProvider: signOut - Definindo isProcessing=false no finally.'); 
      }
  };

  const signUp = async (credentials: SignUpWithPasswordCredentials) => {
    setIsProcessing(true);
    setError(null);
    let result = { error: null as AuthError | null }; 
    try {
      let signUpPayload: SignUpWithPasswordCredentials;
      if ('email' in credentials) {
        signUpPayload = {
          email: credentials.email,
          password: credentials.password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: credentials.options?.data,
            captchaToken: credentials.options?.captchaToken,
          }
        };
      } else {
        // Handle phone-based sign-up if necessary, or throw an error if not supported
        // For now, assuming phone sign up doesn't need emailRedirectTo or is handled differently
        signUpPayload = credentials;
      }

      const { data, error: signUpError } = await supabase.auth.signUp(signUpPayload);
      result.error = signUpError;
      if (signUpError) {
        setError(signUpError);
        console.error("AuthProvider: signUp - Erro no cadastro:", signUpError);
      } else {
        console.log("AuthProvider: signUp - Cadastro iniciado:", data);
      }
    } catch (err: any) {
       console.error("AuthProvider: signUp - Erro inesperado no cadastro:", err);
       const unexpectedError = new AuthError(err.message || "Erro inesperado no cadastro.");
       setError(unexpectedError);
       result.error = unexpectedError;
    } finally {
        setIsProcessing(false);
    }
    return result;
  };

  const refreshProfile = async () => {
    if (user?.id) {
      console.log('AuthContext: refreshProfile - Solicitado refresh para userId:', user.id);
      await fetchProfileAndUpdateState(user.id); 
      // fetchProfileAndUpdateState já chama fetchUnreadNotifications
    } else {
      console.warn('AuthContext: refreshProfile - Tentativa de refresh sem usuário logado.');
      setProfile(null);
      fetchUnreadNotifications(undefined);
    }
  };

  const refreshNotifications = async () => {
    if (user?.id) {
      await fetchUnreadNotifications(user.id);
    } else {
       setUnreadNotificationsCount(0); // Se não há usuário, não há notificações
    }
  };

  const value = useMemo(() => ({
    session,
    user,
    profile,
    isLoading,
    isProcessing,
    isFetchingProfile,
    error,
    signInWithPassword,
    signOut,
    signUp,
    refreshProfile,
    unreadNotificationsCount,
    refreshNotifications,
  }), [session, user, profile, isLoading, isProcessing, isFetchingProfile, error, unreadNotificationsCount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}