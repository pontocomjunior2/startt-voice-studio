import { Card, CardContent } from "@/components/ui/card";
import { Mic, FileText, Download } from "lucide-react";

export const HowItWorksSection = () => {
  const steps = [
    {
      icon: <Mic className="h-12 w-12 text-startt-blue" />,
      title: "Escolha sua Voz",
      description: "Navegue em um catálogo de vozes profissionais, humanas e de IA.",
      number: "01"
    },
    {
      icon: <FileText className="h-12 w-12 text-startt-purple" />,
      title: "Envie seu Roteiro",
      description: "Descreva seu projeto e envie seu texto em nosso formulário intuitivo.",
      number: "02"
    },
    {
      icon: <Download className="h-12 w-12 text-startt-amber" />,
      title: "Receba seu Áudio",
      description: "Receba seu áudio profissional em horas, ou até mesmo instantaneamente.",
      number: "03"
    }
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Produza seu áudio em{" "}
            <span className="bg-startt-gradient bg-clip-text text-transparent">
              minutos
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Um processo simples e eficiente para transformar suas ideias em áudio profissional
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-startt-blue to-startt-purple opacity-30 z-0" />
              )}
              
              <Card className="relative z-10 bg-card/50 border-border backdrop-blur-sm hover:bg-card/70 transition-all duration-300 group">
                <CardContent className="p-8 text-center">
                  {/* Step Number */}
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-startt-gradient rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className="mb-6 flex justify-center">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                      {step.icon}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-lg text-muted-foreground mb-4">
            Pronto para começar?
          </p>
          <div className="w-24 h-1 bg-startt-gradient mx-auto rounded-full"></div>
        </div>
      </div>
    </section>
  );
};