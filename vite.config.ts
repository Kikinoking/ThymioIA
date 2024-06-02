import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import jotaiDebugLabel from 'jotai/babel/plugin-debug-label';
import jotaiReactRefresh from 'jotai/babel/plugin-react-refresh';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import svgrPlugin from 'vite-plugin-svgr';

export default defineConfig({
  base: '/', // Utilisez '/' si vous hébergez à la racine
  plugins: [
    nodePolyfills(),
    react({
      babel: {
        plugins: [
          jotaiDebugLabel,
          jotaiReactRefresh,
          ['@babel/plugin-proposal-decorators', { legacy: true }],
        ],
      },
    }),
    svgrPlugin()
  ],
  build: {
    outDir: 'dist', // Assurez-vous que cela correspond à votre configuration Vercel
    assetsDir: 'assets', // Répertoire pour les actifs
  },
});
