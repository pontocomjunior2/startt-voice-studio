import React from 'react';
import { Outlet, useNavigate, useLocation, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Menu as MenuIcon, 
  ShieldCheck, 
  Voicemail,
  PlusCircle,
  ListMusic,
  User as UserIcon,
  Youtube,
  Instagram,
  FileText,
  Clock,
  CreditCard,
  Package,
  Sparkles
} from 'lucide-react';
import Footer from './Footer'; // Garantir que esta importação existe
import { TextShimmer } from '@/components/ui/text-shimmer';
import WhatsappFloatingButton from './WhatsappFloatingButton';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/skeleton"; // Importar o Skeleton


// Tipo para os itens de navegação
interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
}

// Adicionar tipo para SocialLink se necessário, ou usar NavItem se a estrutura for idêntica
interface SocialLinkItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const AppLayout: React.FC = () => {
  const { profile, signOut, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  console.log('AppLayout Render - User Role:', profile?.role); // Log para depuração

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

  let navItems: NavItem[] = [];
  if (profile?.role === 'admin') {
    navItems = [
      { href: '/admin', label: 'Dashboard Admin', icon: ShieldCheck, roles: ['admin'] },
      { href: '/admin/locutores', label: 'Gerenciar Locutores', icon: Voicemail, roles: ['admin'] },
      { href: '/admin/usuarios', label: 'Gerenciar Usuários', icon: Users, roles: ['admin'] },
      { href: '/admin/pacotes', label: 'Gerenciar Pacotes', icon: Package, roles: ['admin'] },
    ];
  } else if (profile?.role === 'cliente') {
    navItems = [
      { href: '/dashboard', label: 'Meu Painel', icon: LayoutDashboard, roles: ['cliente'] },
      { href: '/gravar-locucao', label: 'Novo Áudio', icon: PlusCircle, roles: ['cliente'] },
      { href: '/meus-audios', label: 'Meus Áudios', icon: ListMusic, roles: ['cliente'] },
      { href: '/locutores', label: 'Locutores', icon: Voicemail, roles: ['cliente'] },
      { href: '/comprar-creditos', label: 'Comprar Créditos', icon: CreditCard, roles: ['cliente'] },
      { href: '/meu-perfil', label: 'Meu Perfil', icon: UserIcon, roles: ['cliente'] },
      { href: '/historico-creditos', label: 'Histórico de Créditos', icon: Clock, roles: ['cliente'] },
    ];
  }

  // Lista de links sociais
  const socialLinks: SocialLinkItem[] = [
    { href: 'https://instagram.com/pontocomaudio', label: 'Instagram', icon: Instagram },
    { href: 'https://youtube.com/@pontocomaudio', label: 'YouTube', icon: Youtube },
  ];

  const SidebarNav: React.FC = () => (
    <nav className="flex flex-col gap-1 mt-10">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center w-full gap-2 rounded-md px-2 py-2 text-sm transition-all duration-200",
              isActive 
                ? "bg-gradient-to-r from-startt-blue to-startt-purple text-white shadow-lg font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-800"
            )}
            end={item.href.indexOf('#') === -1}
          >
            <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-white" : "text-startt-blue")} aria-hidden="true" />
            <span className="whitespace-nowrap">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex w-full bg-background text-foreground"> {/* Fundo principal */}
      <aside className="hidden md:flex md:w-[14rem] flex-col bg-card text-card-foreground px-6 py-10">
        {/* Logo no topo da Sidebar */}
        <div className="flex items-center justify-center mb-8">
          <img src="/startt-logo-transp.png" alt="STARTT" className="h-14 w-auto" />
        </div>
        <Separator className="mb-6 bg-gray-300 dark:bg-neutral-800" /> {/* Separador abaixo do logo, ajustado mb e cor */}

        {/* Menu */}
        <SidebarNav />
        {/* <Separator className="my-4 bg-slate-700" /> */}
        {/* Socials */}
        <div className="mt-10">
          <h3 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Socials
          </h3>
          <nav className="flex flex-col gap-1">
            {socialLinks.map((link) => (
              <a // Usar <a> para links externos, ou Link se forem rotas internas
                key={link.label}
                href={link.href}
                target="_blank" // Para links externos
                rel="noopener noreferrer" // Para links externos
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-800 transition-all duration-200"
              >
                <link.icon className="h-4 w-4 flex-shrink-0" />
                <span>{link.label}</span>
              </a>
            ))}
          </nav>
        </div>
        {/* Botão Termos e Privacidade estilizado */}
        <div className="mt-auto pt-10"> {/* mt-auto para empurrar para baixo, pt-10 para espaço acima */}
          <Link to="/termos-privacidade">
            <Button
              variant="ghost"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-gray-800 dark:bg-neutral-800 px-4 py-3 text-sm font-medium text-gray-100 dark:text-gray-100 hover:bg-gray-700 dark:hover:bg-neutral-700 transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>Termos e Privacidade</span>
            </Button>
          </Link>
        </div>
      </aside>

      <div className="lg:pl-2 lg:pt-2 bg-background text-foreground flex-1 overflow-y-auto">
        <div className="flex-1 min-h-screen lg:rounded-tl-xl border-none bg-background text-foreground overflow-y-auto">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card text-card-foreground px-4 sm:px-6">
            <div className="flex items-center gap-4"> {/* Ajustado gap se necessário */}
              {/* Botão Menu Mobile (sempre visível em mobile, some em md) */}
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button size="icon" variant="outline">
                      <MenuIcon className="h-6 w-6" />
                      <span className="sr-only">Abrir menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0 flex flex-col bg-neutral-100 text-gray-700">
                    {/* Logo no menu mobile */}
                    <div className="flex items-center justify-center py-6 px-4 border-b border-gray-300">
                      <img src="/startt-logo-transp.png" alt="STARTT" className="h-14 w-auto" />
                    </div>

                    {/* Perfil do Usuário no menu mobile */}
                    <div className="flex flex-col items-center p-4 space-y-2 border-b border-gray-300">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || 'Avatar do usuário'}
                          className="h-16 w-16 rounded-full object-cover border-2 border-gray-300"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-500">
                          <UserIcon className="h-8 w-8" />
                        </div>
                      )}
                      <p className="font-semibold text-md text-gray-800 text-center">
                        {profile?.full_name || user?.email || 'Usuário'}
                      </p>
                      <p className="text-xs text-gray-600 capitalize bg-gray-200 px-2 py-0.5 rounded-full">
                        {profile?.role || 'Cliente'}
                      </p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto py-2">
                      <SheetClose asChild>
                        <SidebarNav />
                      </SheetClose>
                    </div>
                    <Separator className="my-4 bg-slate-700" />
                    <div className="p-4 border-t border-slate-700 mt-auto">
                      <SheetClose asChild>
                        <Link to="/termos-privacidade">
                          <Button
                            variant="ghost"
                            className="flex items-center justify-center gap-2 w-full rounded-lg bg-gray-800 dark:bg-neutral-800 px-4 py-3 text-sm font-medium text-gray-100 dark:text-gray-100 hover:bg-gray-700 dark:hover:bg-neutral-700 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Termos e Privacidade</span>
                          </Button>
                        </Link>
                      </SheetClose>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Logo (visível apenas em telas md e maiores) - REMOVIDO PARA EVITAR DUPLICAÇÃO COM SIDEBAR */}
              {/* <div className="hidden md:flex items-center">
                <img src="/logo.png" alt="PONTOCOM ÁUDIO" className="h-8" />
              </div> */}

              {/* Saudação e Status (visível apenas em telas menores que md) - AGORA VISÍVEL EM TODAS AS TELAS */}
              <div className='flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400'> {/* Removido md:hidden */}
                {(() => { 
                  console.log('AppLayout Header - Auth State for Shimmer (restaurado):', { profile, user }); 
                  const userName = profile?.full_name?.split(' ')[0] || user?.email || 'Usuário';
                  if (user || profile) {
                    return (
                      <TextShimmer
                        as="span" 
                        duration={3} 
                        className="font-medium text-[--base-color] [--base-color:hsl(var(--primary))] [--base-gradient-color:hsl(var(--primary-foreground))] dark:[--base-color:hsl(var(--primary))] dark:[--base-gradient-color:hsl(var(--primary-foreground))]"
                      >
                        {`Seja bem-vindo(a), ${userName}!`}
                      </TextShimmer>
                    );
                  } else {
                    return <span>Carregando...</span>; 
                  }
                })()}

                {/* TESTE DIRETO NO APPLAYOUT - REMOVIDO */}
                {/* <span className="text-purple-600 font-extrabold text-3xl p-2 bg-green-200">
                  TESTE NO APPLAYOUT: Olá, {profile?.full_name?.split(' ')[0] || user?.email || 'Usuário'}!
                </span> */}

                <span className='hidden sm:inline'></span> 
              </div>
            </div>
            
            <div className="flex items-center gap-4 ml-auto">
              {/* Exibição dos Créditos */}
              {isLoading ? (
                // Esqueleto de Loading
                <div className="hidden sm:flex items-center gap-4 text-sm font-medium">
                  <Skeleton className="h-8 w-32 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              ) : profile && (
                <div className="hidden sm:flex items-center gap-4 text-sm font-medium animate-fadeIn">
                  <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/50">
                    <Voicemail className="h-4 w-4 text-sky-500" />
                    <span>Gravação:</span>
                    <span className="font-bold text-foreground">{profile.saldo_gravacao ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/50">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>IA:</span>
                    <span className="font-bold text-foreground">{profile.saldo_ia ?? 0}</span>
                  </div>
                </div>
              )}

              <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut} className="hidden md:inline-flex dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-100 dark:hover:bg-neutral-800">
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? 'Saindo...' : 'Sair'}
              </Button>
            </div>
          </header>
          <main className="flex-1 bg-background text-foreground p-4 sm:p-6">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
      <WhatsappFloatingButton />
    </div>
  );
};

export default AppLayout;