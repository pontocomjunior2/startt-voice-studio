import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Home, LayoutDashboard, Users, FileText, LogOut, Menu as MenuIcon, Settings, ShieldCheck, UsersRound } from 'lucide-react'; // Ícones

const AppLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login'); // Redireciona após logout
    } catch (error) {
      console.error("Erro ao fazer logout (AppLayout):", error);
      // toast.error("Erro ao Sair"); // Opcional: toast de erro
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { href: '/dashboard', label: 'Meu Painel', icon: <LayoutDashboard className="h-5 w-5" />, roles: ['cliente', 'admin'] },
    { href: '/admin', label: 'Admin Dashboard', icon: <ShieldCheck className="h-5 w-5" />, roles: ['admin'] },
    // Novo link para Gerenciar Locutores
    { href: '/admin/locutores', label: 'Gerenciar Locutores', icon: <Users className="h-5 w-5" />, roles: ['admin'] },
    {
      label: 'Gerenciar Clientes',
      href: '/admin/clientes',
      icon: <UsersRound className="h-4 w-4" />,
      roles: ['admin'],
    },
    // Adicionar mais links conforme necessário
    // { href: '/pedidos', label: 'Meus Pedidos', icon: <FileText className="h-5 w-5" />, roles: ['cliente'] },
    // { href: '/configuracoes', label: 'Configurações', icon: <Settings className="h-5 w-5" />, roles: ['cliente', 'admin'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(profile?.role || '')
  );

  const NavLinks: React.FC<{isMobile?: boolean}> = ({isMobile}) => (
    <nav className={`flex flex-col gap-2 ${isMobile ? 'p-4' : 'px-4 py-6'}`}>
      {filteredNavItems.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          className="w-full justify-start"
          asChild
        >
          <Link to={item.href}>
            {item.icon}
            <span className="ml-3">{item.label}</span>
          </Link>
        </Button>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Menu Lateral para Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col border-r bg-background">
        <div className="flex h-16 items-center border-b px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Home className="h-6 w-6" /> {/* Ou seu logo */}
            <span>PontoComAudio</span>
          </Link>
        </div>
        <NavLinks />
        <div className="mt-auto p-4">
          <Button variant="outline" className="w-full" onClick={handleLogout} disabled={isLoggingOut}>
            <LogOut className="mr-2 h-4 w-4" /> {isLoggingOut ? 'Saindo...' : 'Sair'}
          </Button>
        </div>
      </aside>

      {/* Conteúdo Principal e Header Mobile */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 md:justify-end">
          {/* Botão do Menu Mobile */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline">
                  <MenuIcon className="h-6 w-6" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                 <div className="flex h-16 items-center border-b px-6">
                    <Link to="/" className="flex items-center gap-2 font-semibold">
                      <Home className="h-6 w-6" />
                      <span>PontoComAudio</span>
                    </Link>
                  </div>
                  <SheetClose asChild>
                    <NavLinks isMobile />
                  </SheetClose>
                  <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full" onClick={handleLogout} disabled={isLoggingOut}>
                         <LogOut className="mr-2 h-4 w-4" /> {isLoggingOut ? 'Saindo...' : 'Sair'}
                      </Button>
                    </SheetClose>
                  </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Poderia adicionar UserMenu aqui se necessário no header desktop */}
          {/* <UserMenu /> */}
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet /> {/* O conteúdo da rota atual será renderizado aqui */}
        </main>
      </div>
    </div>
  );
};

export default AppLayout; 