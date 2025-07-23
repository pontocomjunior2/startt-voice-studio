import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";

export const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Carlos Silva",
      role: "Diretor de Marketing",
      company: "Farmácia Popular",
      content: "A Startt revolucionou nossa produção de conteúdo. Em 2 horas tivemos 15 spots para rádio prontos. A qualidade das vozes é impressionante!",
      rating: 5,
      avatar: "CS",
      gradient: "from-startt-blue/20 to-startt-purple/20"
    },
    {
      name: "Marina Costa",
      role: "Sócia-Fundadora",
      company: "Agência Criativa",
      content: "Nossos clientes ficaram impressionados com a agilidade. O que antes levava dias, agora resolvemos em horas. A IA é perfeita para testes rápidos.",
      rating: 5,
      avatar: "MC",
      gradient: "from-startt-purple/20 to-startt-amber/20"
    },
    {
      name: "João Santos",
      role: "Diretor de Conteúdo",
      company: "Rádio Metropolitana",
      content: "A combinação de locutores humanos e IA nos deu uma flexibilidade incrível. Qualidade profissional sempre, independente do prazo.",
      rating: 5,
      avatar: "JS",
      gradient: "from-startt-amber/20 to-startt-blue/20"
    }
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-startt-amber fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background/50 to-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            O que nossos{" "}
            <span className="bg-startt-gradient bg-clip-text text-transparent">
              clientes
            </span>{" "}
            dizem
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Histórias reais de quem já transformou sua produção de áudio com a Startt
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className={`relative overflow-hidden bg-gradient-to-br ${testimonial.gradient} border-border/50 hover:border-primary/30 transition-all duration-500 group`}
            >
              <CardContent className="p-8">
                {/* Quote Icon */}
                <div className="mb-6">
                  <Quote className="h-8 w-8 text-primary/60" />
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-6">
                  {renderStars(testimonial.rating)}
                </div>

                {/* Testimonial Content */}
                <blockquote className="text-foreground/90 mb-6 leading-relaxed">
                  "{testimonial.content}"
                </blockquote>

                {/* Author Info */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 bg-startt-gradient">
                    <AvatarFallback className="bg-startt-gradient text-white font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                    <p className="text-sm text-primary font-medium">
                      {testimonial.company}
                    </p>
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-startt-gradient opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold bg-startt-gradient bg-clip-text text-transparent mb-2">
              98%
            </p>
            <p className="text-sm text-muted-foreground">Satisfação</p>
          </div>
          <div>
            <p className="text-3xl font-bold bg-startt-gradient bg-clip-text text-transparent mb-2">
              2h
            </p>
            <p className="text-sm text-muted-foreground">Entrega Média</p>
          </div>
          <div>
            <p className="text-3xl font-bold bg-startt-gradient bg-clip-text text-transparent mb-2">
              500+
            </p>
            <p className="text-sm text-muted-foreground">Clientes Ativos</p>
          </div>
          <div>
            <p className="text-3xl font-bold bg-startt-gradient bg-clip-text text-transparent mb-2">
              24/7
            </p>
            <p className="text-sm text-muted-foreground">Disponibilidade</p>
          </div>
        </div>
      </div>
    </section>
  );
};