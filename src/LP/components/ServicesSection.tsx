import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Sparkles, Clock, Heart, Zap, Trophy } from "lucide-react";

export const ServicesSection = () => {
  const services = [
    {
      icon: <Mic className="h-8 w-8 text-startt-blue" />,
      title: "Gravação Humana",
      badge: "Premium",
      badgeColor: "bg-startt-amber text-black",
      description: "A performance, emoção e qualidade de estúdio que apenas um artista pode oferecer.",
      subtitle: "Ideal para comerciais e projetos de alto impacto.",
      features: [
        { icon: <Heart className="h-4 w-4" />, text: "Emoção genuína e interpretação" },
        { icon: <Trophy className="h-4 w-4" />, text: "Qualidade de estúdio profissional" },
        { icon: <Clock className="h-4 w-4" />, text: "Entrega em até 24 horas" }
      ],
      gradient: "from-startt-blue/10 to-startt-purple/10"
    },
    {
      icon: <Sparkles className="h-8 w-8 text-startt-purple" />,
      title: "Gravação com IA",
      badge: "Instantâneo",
      badgeColor: "bg-startt-purple text-white",
      description: "Agilidade e consistência para seus projetos. Gere áudios de alta qualidade instantaneamente.",
      subtitle: "Perfeito para testes, redes sociais e URA.",
      features: [
        { icon: <Zap className="h-4 w-4" />, text: "Geração instantânea" },
        { icon: <Clock className="h-4 w-4" />, text: "Disponível 24/7" },
        { icon: <Trophy className="h-4 w-4" />, text: "Consistência garantida" }
      ],
      gradient: "from-startt-purple/10 to-startt-blue/10"
    }
  ];

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background to-background/50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            A Solução{" "}
            <span className="bg-startt-gradient bg-clip-text text-transparent">
              Completa
            </span>{" "}
            para sua Voz
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Combinamos o melhor dos dois mundos: a autenticidade humana e a eficiência da inteligência artificial
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className={`relative overflow-hidden bg-gradient-to-br ${service.gradient} border-border/50 hover:border-primary/30 transition-all duration-500 group`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                    {service.icon}
                  </div>
                  <Badge className={`${service.badgeColor} font-semibold`}>
                    {service.badge}
                  </Badge>
                </div>
                <CardTitle className="text-2xl text-foreground">
                  {service.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div>
                  <p className="text-foreground/90 font-medium mb-2">
                    {service.description}
                  </p>
                  <p className="text-muted-foreground">
                    {service.subtitle}
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  {service.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center gap-3 text-sm">
                      <div className="text-primary">
                        {feature.icon}
                      </div>
                      <span className="text-foreground/80">{feature.text}</span>
                    </div>
                  ))}
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-startt-gradient opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-card/50 rounded-full border border-border/50">
            <div className="flex items-center gap-1">
              <Mic className="h-4 w-4 text-startt-blue" />
              <span className="text-sm font-medium">Humano</span>
            </div>
            <div className="w-8 h-0.5 bg-startt-gradient rounded-full" />
            <div className="flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-startt-purple" />
              <span className="text-sm font-medium">IA</span>
            </div>
          </div>
          <p className="text-muted-foreground mt-4 max-w-md mx-auto">
            A combinação perfeita de tecnologia e talento humano para resultados excepcionais
          </p>
        </div>
      </div>
    </section>
  );
};