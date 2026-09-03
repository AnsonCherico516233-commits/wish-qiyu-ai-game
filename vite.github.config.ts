import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';

export default defineConfig({
  root: 'github-pages',
  publicDir: '../public',
  base: repositoryName ? `/${repositoryName}/` : '/',
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: {
    alias: { '@': projectRoot },
    dedupe: ['react', 'react-dom'],
  },
  plugins: [react()],
  build: {
    outDir: '../dist/github-pages',
    emptyOutDir: true,
  },
});
