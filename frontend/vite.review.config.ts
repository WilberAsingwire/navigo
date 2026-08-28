import { mergeConfig } from 'vite';
import base from './vite.config';

export default mergeConfig(base, {
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['5173-ifmpqbehz7uy5t0a08z1x.e2b.app'],
  },
});
