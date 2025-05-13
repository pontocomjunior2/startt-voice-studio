import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Ajuste o caminho se necessário

const AuthRedirector: React.FC = () => {
  const { session, profile, isLoading, isFetchingProfile } = useAuth();

  // Espera enquanto a sessão inicial está carregando (isLoading) 
  // OU enquanto o perfil está sendo buscado (isFetchingProfile)
  const stillLoading = isLoading || (session && isFetchingProfile);

  console.log('AuthRedirector Check:', { isLoading, isFetchingProfile, stillLoading, session, profile: profile ? {role: profile.role} : null });

  if (stillLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Verificando autenticação...</div> 
      </div>
    );
  }

  if (!session) {
    console.log('AuthRedirector: No session, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // Se tem sessão e não está carregando, verifica a role do perfil
  if (profile?.role === 'admin') {
    console.log('AuthRedirector: Admin detected, redirecting to /admin');
    return <Navigate to="/admin" replace />;
  } else {
    console.log('AuthRedirector: Non-admin or no profile role, redirecting to /dashboard');
    // Redireciona para o dashboard para clientes ou usuários sem role definida
    return <Navigate to="/dashboard" replace />;
  }
};

export default AuthRedirector; 