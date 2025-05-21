import React from 'react';

const WhatsappFloatingButton: React.FC = () => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end group">
    <span className="mb-2 px-3 py-1 rounded bg-gray-900 text-white text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none select-none whitespace-nowrap">
      Suporte via WhatsApp
    </span>
    <a
      href="http://wa.me/5527992643922"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco no WhatsApp"
      className="flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-lg border border-green-500 hover:bg-green-50 transition-colors group"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-8 w-8 text-green-500 group-hover:text-green-600 transition-colors"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.571-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.099 3.2 5.077 4.363.71.306 1.263.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 6.107h-.001a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374A9.86 9.86 0 012.1 12.045c0-5.444 4.425-9.87 9.877-9.87 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.979c-.003 5.444-4.428 9.87-9.872 9.87zm8.413-18.282A11.815 11.815 0 0011.978 0C5.37 0 .002 5.367 0 11.974c0 2.114.552 4.174 1.601 5.981L.057 24l6.164-1.635a11.93 11.93 0 005.758 1.466h.005c6.606 0 11.974-5.367 11.978-11.974a11.89 11.89 0 00-3.487-8.462z" />
      </svg>
    </a>
  </div>
);

export default WhatsappFloatingButton; 