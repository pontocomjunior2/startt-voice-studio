import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Session, User, AuthChangeEvent, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

// Definir a interface para o perfil, espelhando a tabela do Supabase
export interface Profile {
  id: string;
  updated_at: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: 'cliente' | 'admin' | null; // Ajuste os tipos de role conforme necessário
  credits: number | null;
  package_id: string | null; // ou number, dependendo da sua definição
}

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isProcessing: boolean;
  isFetchingProfile: boolean;
  error: AuthError | null;
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  signUp: (credentials: SignUpWithPasswordCredentials) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
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
      } else {
        const { data, error: fetchError, status } = result;

        if (fetchError && status !== 406) {
          console.error('AuthContext: fetchProfile - Erro da query Supabase:', fetchError);
          setError(new AuthError(`Erro ao buscar perfil: ${fetchError.message}`));
          setProfile(null);
        } else if (data) {
          console.log('AuthContext: fetchProfile - Perfil encontrado:', data as Profile);
          setProfile(data as Profile);
        } else if (status === 406) {
          console.warn('AuthContext: fetchProfile - Perfil não encontrado (status 406), usuário pode precisar criar um.');
          setProfile(null);
        } else {
          console.log('AuthContext: fetchProfile - Nenhum dado ou erro específico (status 406) da query.');
        }
      }
    } catch (err: any) {
      console.error('AuthContext: fetchProfile - Erro INESPERADO no try/catch:', err);
      setError(new AuthError(`Erro inesperado ao buscar perfil: ${err.message}`));
      setProfile(null);
      if (timeoutId) clearTimeout(timeoutId); // Garante limpeza em caso de erro inesperado
    } finally {
      setIsFetchingProfile(false);
      console.log('AuthContext: fetchProfileAndUpdateState - FINALIZANDO busca.');
      if (timeoutId) clearTimeout(timeoutId); // Garante limpeza no finally
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

  const signInWithPassword = async ({ email, password }: { email: string; password: string }) => {
      setIsProcessing(true);
      setError(null); 
      let result = { error: null as AuthError | null };
      try {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          result.error = signInError;
          if (signInError) {
            setError(signInError);
            console.error("AuthProvider: signInWithPassword - Erro no login:", signInError);
            setIsProcessing(false); 
          }
      } catch (err: any) {
          console.error("AuthProvider: signInWithPassword - Erro inesperado no login:", err);
          const unexpectedError = new AuthError(err.message || "Erro inesperado. Tente novamente.");
          setError(unexpectedError);
          result.error = unexpectedError;
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
      const { data, error: signUpError } = await supabase.auth.signUp(credentials);
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
    if (!user) {
      console.warn("AuthContext: refreshProfile - Usuário não logado, não é possível atualizar perfil.");
      return;
    }
    if (isFetchingProfile) {
      console.log("AuthContext: refreshProfile - Busca de perfil já em andamento. Ignorando.");
      return;
    }
    console.log("AuthContext: refreshProfile - Iniciando atualização de perfil para userId:", user.id);
    await fetchProfileAndUpdateState(user.id);
    console.log("AuthContext: refreshProfile - Atualização de perfil finalizada.");
  };

  const value = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 