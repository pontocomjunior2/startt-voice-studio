import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="p-4 text-center text-sm text-muted-foreground border-t border-border">
      © {new Date().getFullYear()} PONTOCOM ÁUDIO. Todos os direitos reservados.
      {/* Adapte este conteúdo conforme o design do Sidefolio template */}
    </footer>
  );
};

export default Footer; 