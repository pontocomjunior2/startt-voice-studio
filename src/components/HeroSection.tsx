import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

export const HeroSection = () => {
  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGetStarted = () => {
    // Navigate to registration/login page
    window.location.href = '/';
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background to-background/80">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-startt-blue/10 via-transparent to-startt-purple/10" />
      
      <div className="relative z-10 text-center w-full max-w-4xl mx-auto px-6">
        {/* Logo */}
        <div className="mb-8">
          <img 
            src="/startt-logo-transp.png" 
            alt="STARTT Logo" 
            className="mx-auto h-24 md:h-32 lg:h-40 w-auto"
          />
        </div>

        {/* Main Headline */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
          <span className="bg-startt-gradient bg-clip-text text-transparent">
            Plataforma de Banco de vozes
          </span>
        </h2>


        
        <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          Locutores profissionais e inteligência artificial para entregar gravações de alta qualidade com a velocidade que você precisa.
        </p>
        
        {/* Services Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 border border-border/50">
            <h4 className="text-lg font-semibold text-startt-blue mb-2">📻 Spots para Rádio</h4>
            <p className="text-sm text-muted-foreground">Comerciais impactantes com locutores especializados em comunicação radiofônica</p>
          </div>
          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 border border-border/50">
            <h4 className="text-lg font-semibold text-startt-purple mb-2">🎥 Locução para Vídeo</h4>
            <p className="text-sm text-muted-foreground">Narrações profissionais para documentários, institucionais e conteúdo digital</p>
          </div>
          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 border border-border/50">
            <h4 className="text-lg font-semibold text-startt-amber mb-2">🎙️ Produção Completa</h4>
            <p className="text-sm text-muted-foreground">Edição, mixagem e masterização incluídas para resultado profissional</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            className="bg-startt-gradient hover:opacity-90 text-white font-semibold px-8 py-4 rounded-xl shadow-startt hover:shadow-glow transition-all duration-300 text-lg"
          >
            Comece a Gravar Agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            onClick={scrollToPricing}
            className="border-2 border-primary hover:bg-primary/10 text-foreground font-semibold px-8 py-4 rounded-xl transition-all duration-300 text-lg"
          >
            <Play className="mr-2 h-5 w-5" />
            Ver Pacotes
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center opacity-70">
          <div>
            <p className="text-2xl font-bold text-startt-blue">Dezenas de</p>
            <p className="text-sm text-muted-foreground">Vozes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-startt-purple">1000+</p>
            <p className="text-sm text-muted-foreground">Projetos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-startt-amber">Entrega</p>
            <p className="text-sm text-muted-foreground">Rápida</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-startt-blue">IA+</p>
            <p className="text-sm text-muted-foreground">Humano</p>
          </div>
        </div>
      </div>
    </section>
  );
};