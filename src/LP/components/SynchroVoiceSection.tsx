import React from 'react';

export const SynchroVoiceSection = () => {
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-background to-background/95">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Coluna da Esquerda - Elemento Visual */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative w-80 h-80 flex items-center justify-center">
              {/* Onda sonora orgânica que se transforma em circuito digital */}
              <svg 
                viewBox="0 0 320 320" 
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--startt-blue))" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="hsl(var(--startt-purple))" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="hsl(var(--startt-amber))" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--startt-purple))" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="hsl(var(--startt-blue))" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                
                {/* Onda sonora orgânica (lado esquerdo) */}
                <path 
                  d="M20 160 Q40 120, 60 160 T100 160 T140 160" 
                  stroke="url(#waveGradient)" 
                  strokeWidth="4" 
                  fill="none"
                  className="animate-pulse"
                />
                <path 
                  d="M20 140 Q40 100, 60 140 T100 140 T140 140" 
                  stroke="url(#waveGradient)" 
                  strokeWidth="3" 
                  fill="none" 
                  opacity="0.7"
                  className="animate-pulse"
                  style={{animationDelay: '0.5s'}}
                />
                <path 
                  d="M20 180 Q40 140, 60 180 T100 180 T140 180" 
                  stroke="url(#waveGradient)" 
                  strokeWidth="3" 
                  fill="none" 
                  opacity="0.7"
                  className="animate-pulse"
                  style={{animationDelay: '1s'}}
                />
                
                {/* Transição central */}
                <circle 
                  cx="160" 
                  cy="160" 
                  r="30" 
                  fill="none" 
                  stroke="url(#circuitGradient)" 
                  strokeWidth="2" 
                  className="animate-spin"
                  style={{animationDuration: '8s'}}
                />
                <circle 
                  cx="160" 
                  cy="160" 
                  r="20" 
                  fill="hsl(var(--startt-purple))" 
                  opacity="0.3" 
                  className="animate-pulse"
                />
                
                {/* Padrão de circuito digital (lado direito) */}
                <g stroke="url(#circuitGradient)" strokeWidth="2" fill="none">
                  <rect x="200" y="140" width="40" height="40" rx="4" className="animate-pulse" style={{animationDelay: '0.2s'}} />
                  <rect x="250" y="120" width="30" height="30" rx="3" className="animate-pulse" style={{animationDelay: '0.4s'}} />
                  <rect x="250" y="170" width="30" height="30" rx="3" className="animate-pulse" style={{animationDelay: '0.6s'}} />
                  <line x1="240" y1="160" x2="250" y2="135" className="animate-pulse" style={{animationDelay: '0.8s'}} />
                  <line x1="240" y1="160" x2="250" y2="185" className="animate-pulse" style={{animationDelay: '1.2s'}} />
                  <circle cx="290" cy="135" r="8" className="animate-pulse" style={{animationDelay: '1.4s'}} />
                  <circle cx="290" cy="185" r="8" className="animate-pulse" style={{animationDelay: '1.6s'}} />
                </g>
              </svg>
            </div>
          </div>
          
          {/* Coluna da Direita - Conteúdo Explicativo */}
          <div className="space-y-8">
            {/* Badge/Tagline */}
            <div className="inline-block">
              <span className="bg-startt-gradient text-white text-sm font-semibold px-4 py-2 rounded-full">
                TECNOLOGIA EXCLUSIVA STARTT
              </span>
            </div>
            
            {/* Título Principal */}
            <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Apresentando a{" "}
              <span className="bg-startt-gradient bg-clip-text text-transparent">
                Startt Synchro Voice™
              </span>
            </h2>
            
            {/* Subtítulo */}
            <p className="text-xl text-muted-foreground leading-relaxed">
              A fusão perfeita entre a performance humana e a precisão da inteligência artificial.
            </p>
            
            {/* Explicação do Processo */}
            <div className="space-y-6">
              {/* Etapa 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-startt-blue/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎙️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-startt-blue mb-2">Performance Humana</h3>
                  <p className="text-muted-foreground">
                    Tudo começa com a arte. Um de nossos diretores de voz grava seu roteiro, garantindo a entonação, o ritmo e a emoção perfeitos que apenas um humano pode criar.
                  </p>
                </div>
              </div>
              
              {/* Etapa 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-startt-purple/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-startt-purple mb-2">Sincronização por IA</h3>
                  <p className="text-muted-foreground">
                    Nossa IA revolucionária e otimizada aplica a voz do seu locutor preferido sobre essa performance, preservando cada nuance e sentimento da gravação original.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Parágrafo Final */}
            <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 border border-border/50">
              <p className="text-lg text-foreground leading-relaxed">
                O resultado é um áudio com a alma de uma direção artística e a consistência da tecnologia, entregue com a agilidade que seu projeto precisa. É mais que uma voz, é uma performance garantida.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};