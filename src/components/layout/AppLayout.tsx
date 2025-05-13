import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { 
  Home, 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Menu as MenuIcon, 
  ShieldCheck, 
  Voicemail,
  PlusCircle,
  ListMusic,
  User
} from 'lucide-react';
import { ThemeToggle } from '../theme-toggle';

// Tipo para os itens de navegação
interface NavItem {
  href: string;
  label: string;
  icon: React.ReactElement; // Ou JSX.Element
  roles: string[];
}

const AppLayout: React.FC = () => {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login'); 
    } catch (error) {
      console.error("Erro ao fazer logout (AppLayout):", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  let navItems: NavItem[] = []; // Tipagem explícita
  if (profile?.role === 'admin') {
    navItems = [
      { href: '/admin', label: 'Dashboard Admin', icon: <ShieldCheck className="h-5 w-5" />, roles: ['admin'] },
      { href: '/admin/locutores', label: 'Gerenciar Locutores', icon: <Voicemail className="h-5 w-5" />, roles: ['admin'] },
      { href: '/admin/usuarios', label: 'Gerenciar Usuários', icon: <Users className="h-5 w-5" />, roles: ['admin'] },
    ];
  } else if (profile?.role === 'cliente') {
    navItems = [
      { href: '/dashboard', label: 'Novo Pedido', icon: <PlusCircle className="h-5 w-5" />, roles: ['cliente'] },
      { href: '/dashboard#meus-audios', label: 'Meus Áudios', icon: <ListMusic className="h-5 w-5" />, roles: ['cliente'] },
      { href: '/dashboard#meu-perfil', label: 'Meu Perfil', icon: <User className="h-5 w-5" />, roles: ['cliente'] },
    ];
  }

  const NavLinks: React.FC<{isMobile?: boolean}> = ({isMobile}) => (
    <nav className={`flex flex-col gap-2 ${isMobile ? 'p-4' : 'px-4 py-6'}`}>
      {profile?.role === 'admin' && (
         <Button variant="ghost" className="w-full justify-start" asChild>
           <Link to="/dashboard">
             <LayoutDashboard className="h-5 w-5" />
             <span className="ml-3">Painel Cliente (Visão Admin)</span>
           </Link>
         </Button>
      )}
      {navItems.map((item) => (
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
      <aside className="hidden md:flex md:w-64 flex-col border-r bg-background">
        <div className="flex h-16 items-center border-b px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold truncate">
            {profile?.full_name || user?.email || 'PontoComAudio'} 
          </Link>
        </div>
        <NavLinks />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline">
                  <MenuIcon className="h-6 w-6" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 flex flex-col">
                 <div className="flex h-16 items-center border-b px-6">
                    <Link to="/" className="flex items-center gap-2 font-semibold truncate">
                      {profile?.full_name || user?.email || 'PontoComAudio'}
                    </Link>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <SheetClose asChild>
                      <NavLinks isMobile />
                    </SheetClose>
                  </div>
                  <div className="p-4 border-t mt-auto">
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full" onClick={handleLogout} disabled={isLoggingOut}>
                         <LogOut className="mr-2 h-4 w-4" /> {isLoggingOut ? 'Saindo...' : 'Sair'}
                      </Button>
                    </SheetClose>
                  </div>
              </SheetContent>
            </Sheet>
            <Link to="/" className="flex items-center gap-2 font-semibold truncate md:hidden">
              {profile?.full_name || user?.email || 'PontoComAudio'}
            </Link>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <ThemeToggle />
            <span className="hidden md:inline-block text-sm font-medium truncate">{profile?.full_name || user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut} className="hidden md:inline-flex">
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout; 