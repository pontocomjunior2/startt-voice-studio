import { HeroSection } from "@/components/HeroSection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { ServicesSection } from "./components/ServicesSection";
import { SynchroVoiceSection } from "./components/SynchroVoiceSection";
import { PricingSection } from "./components/PricingSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { FinalCTASection } from "./components/FinalCTASection";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <HeroSection />
      
      {/* How It Works Section */}
      <HowItWorksSection />
      
      {/* Services Section */}
      <ServicesSection />
      
      {/* Synchro Voice Section */}
      <SynchroVoiceSection />
      
      {/* Pricing Section */}
      <PricingSection />
      
      {/* Testimonials Section */}
      <TestimonialsSection />
      
      {/* Final CTA Section */}
      <FinalCTASection />
    </div>
  );
};

export default LandingPage;