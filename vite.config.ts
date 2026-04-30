import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        // CORREÇÃO 1: alias '@' apontando para 'src', não para a raiz
        // Isso evita conflitos com arquivos da raiz (server.ts, package.json etc.)
        '@': path.resolve(process.cwd(), './src'),
      },
    },

    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      // ADIÇÃO: proxy para redirecionar chamadas /api/* ao Express em dev
      // Sem isso, em modo dev o React não encontra as rotas do backend
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // ADIÇÃO: separa vendor chunks para melhor cache no browser
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
