import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './data/theme';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(registration=>registration.active?.postMessage({type:'cleanup-shared-pdfs'})).catch(() => {});
  });
}
