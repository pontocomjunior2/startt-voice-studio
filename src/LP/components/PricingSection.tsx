import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

export const PricingSection = () => {
  const plans = [
    {
      name: "Startt 10",
      credits: 10,
      price: "R$ 150",
      pricePerCredit: "R$ 15,00",
      description: "Ideal para testes e projetos pequenos",
      features: [
        "10 créditos para gravações",
        "Vozes humanas e IA",
        "Qualidade profissional",
        "Suporte por email",
        "Formatos: MP3, WAV"
      ],
      popular: false,
      buttonText: "Começar Agora",
      buttonStyle: "outline"
    },
    {
      name: "Startt 20",
      credits: 20,
      price: "R$ 280",
      pricePerCredit: "R$ 14,00",
      originalPrice: "R$ 300",
      description: "O mais escolhido pelos nossos clientes",
      features: [
        "20 créditos para gravações",
        "Vozes humanas e IA",
        "Qualidade profissional",
        "Suporte prioritário",
        "Formatos: MP3, WAV, AIFF",
        "Revisões incluídas"
      ],
      popular: true,
      buttonText: "Mais Popular",
      buttonStyle: "gradient"
    },
    {
      name: "Startt 50",
      credits: 50,
      price: "R$ 650",
      pricePerCredit: "R$ 13,00",
      originalPrice: "R$ 750",
      description: "Para agências e produtores frequentes",
      features: [
        "50 créditos para gravações",
        "Vozes humanas e IA",
        "Qualidade profissional",
        "Suporte dedicado",
        "Todos os formatos",
        "Revisões ilimitadas",
        "Gerente de conta"
      ],
      popular: false,
      buttonText: "Escalar Produção",
      buttonStyle: "outline"
    }
  ];

  const handlePlanSelect = (planName: string) => {
    // Navigate to registration with selected plan
    window.location.href = `/?plan=${planName.toLowerCase().replace(' ', '-')}`;
  };

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Escolha seu{" "}
            <span className="bg-startt-gradient bg-clip-text text-transparent">
              Pacote
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Planos flexíveis que se adaptam ao seu volume de produção. Quanto mais você usa, mais economiza.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${
                plan.popular 
                  ? 'border-primary bg-gradient-to-b from-primary/5 to-accent/5 scale-105' 
                  : 'border-border bg-card/50'
              } transition-all duration-300 hover:shadow-lg hover:scale-105`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-startt-gradient text-white px-4 py-1 font-semibold">
                    <Star className="h-3 w-3 mr-1" />
                    Mais Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold text-foreground mb-2">
                  {plan.name}
                </CardTitle>
                <div className="mb-4">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through">
                        {plan.originalPrice}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.pricePerCredit} por crédito
                  </p>
                </div>
                <p className="text-muted-foreground">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-startt-blue flex-shrink-0" />
                      <span className="text-sm text-foreground/90">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button 
                  onClick={() => handlePlanSelect(plan.name)}
                  variant={plan.buttonStyle === "gradient" ? "default" : "outline"}
                  className={`w-full py-3 font-semibold transition-all duration-300 ${
                    plan.buttonStyle === "gradient" 
                      ? 'bg-startt-gradient hover:opacity-90 text-white shadow-startt hover:shadow-glow' 
                      : 'border-2 border-primary hover:bg-primary/10'
                  }`}
                >
                  {plan.buttonText}
                </Button>

                {/* Credit info */}
                <div className="text-center pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{plan.credits} créditos</span> inclusos
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom info */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Precisa de mais créditos? Fale conosco para planos personalizados.
          </p>
          <div className="flex justify-center items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-startt-blue" />
            <span>Sem assinatura</span>
            <span>•</span>
            <Check className="h-4 w-4 text-startt-blue" />
            <span>Créditos não expiram</span>
            <span>•</span>
            <Check className="h-4 w-4 text-startt-blue" />
            <span>Pagamento único</span>
          </div>
        </div>
      </div>
    </section>
  );
};