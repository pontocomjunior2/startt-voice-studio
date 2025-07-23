import { createRoot } from 'react-dom/client'
import { initToolbar } from '@stagewise/toolbar'
import App from './App.tsx'
import './index.css'

// Initialize Stagewise toolbar in development mode
if (import.meta.env.DEV) {
  initToolbar({
    plugins: []
  });
}

createRoot(document.getElementById("root")!).render(<App />);
