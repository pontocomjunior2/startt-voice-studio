import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Sparkles } from "lucide-react";

export const FinalCTASection = () => {
  const handleGetStarted = () => {
    // Navigate to registration page
    window.location.href = '/';
  };

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-startt-blue/5 via-startt-purple/5 to-startt-amber/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--startt-blue)_0%,_transparent_70%)] opacity-10" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Icons */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <div className="p-3 rounded-full bg-startt-blue/10 border border-startt-blue/20">
            <Mic className="h-6 w-6 text-startt-blue" />
          </div>
          <div className="w-12 h-0.5 bg-startt-gradient rounded-full" />
          <div className="p-3 rounded-full bg-startt-purple/10 border border-startt-purple/20">
            <Sparkles className="h-6 w-6 text-startt-purple" />
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
          Pronto para dar{" "}
          <span className="bg-startt-gradient bg-clip-text text-transparent">
            voz
          </span>{" "}
          às suas ideias?
        </h2>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          Junte-se a centenas de clientes que já transformaram sua produção de áudio com a Startt.
        </p>

        {/* CTA Button */}
        <div className="space-y-6">
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            className="bg-startt-gradient hover:opacity-90 text-white font-bold px-12 py-6 rounded-2xl shadow-startt hover:shadow-glow transition-all duration-300 text-xl"
          >
            Crie sua conta e comece agora
            <ArrowRight className="ml-3 h-6 w-6" />
          </Button>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              ✓ Sem compromisso de longo prazo
            </span>
            <span className="hidden sm:block">•</span>
            <span className="flex items-center gap-2">
              ✓ Créditos não expiram
            </span>
            <span className="hidden sm:block">•</span>
            <span className="flex items-center gap-2">
              ✓ Suporte dedicado
            </span>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="mt-16 flex justify-center">
          <div className="w-32 h-1 bg-startt-gradient rounded-full" />
        </div>

        {/* Footer text */}
        <div className="mt-12 space-y-4">
          <p className="text-2xl font-semibold bg-startt-gradient bg-clip-text text-transparent">
            STARTT
          </p>
          <p className="text-muted-foreground">
            A plataforma de locução definitiva
          </p>
        </div>
      </div>
    </section>
  );
};