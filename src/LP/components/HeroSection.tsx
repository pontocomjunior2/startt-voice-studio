import { Button } from "@/components/ui/button";
import { WavyBackground } from "./WavyBackground";
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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <WavyBackground
        className="max-w-4xl mx-auto px-4"
        containerClassName="absolute inset-0"
        waveOpacity={0.3}
        speed="slow"
      />
      
      <div className="relative z-20 text-center max-w-5xl mx-auto px-6">
        {/* Logo/Brand */}
        <div className="mb-8">
          <h1 className="text-6xl md:text-8xl font-bold bg-startt-gradient bg-clip-text text-transparent mb-4">
            STARTT
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            by Pontocom Audio
          </p>
        </div>

        {/* Main Headline */}
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
          A voz certa para{" "}
          <span className="bg-startt-gradient bg-clip-text text-transparent">
            cada projeto
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
          A plataforma completa que une locutores profissionais e inteligência artificial 
          para entregar gravações de alta qualidade com a velocidade que você precisa.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
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
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center opacity-70">
          <div>
            <p className="text-2xl font-bold text-startt-blue">500+</p>
            <p className="text-sm text-muted-foreground">Locutores</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-startt-purple">1000+</p>
            <p className="text-sm text-muted-foreground">Projetos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-startt-amber">24h</p>
            <p className="text-sm text-muted-foreground">Entrega Rápida</p>
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