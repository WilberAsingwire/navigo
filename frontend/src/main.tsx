import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/* Brand fonts — bundled locally (no CDN) */
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';

const container = document.getElementById('root');
const root = createRoot(container!);

// Register Service Worker for PWA support — only in production, and clean up in dev to avoid stale cache navigation bugs
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('✅ SW registered:', reg.scope))
        .catch(err => console.error('❌ SW registration failed:', err));
    });
  } else {
    // In dev, unregister any existing SW to prevent it from serving cached index.html for all routes (which makes it look like you bounce back to home)
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => {
        reg.unregister().then(() => console.log('🧹 SW unregistered in dev:', reg.scope));
      });
      // Also clear caches
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
      }
    });
  }
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
