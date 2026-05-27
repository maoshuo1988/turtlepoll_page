import { defineConfig } from 'vite';

export default defineConfig({
  base: '/games/turtle-contest-phaser/',
  publicDir: 'public',
  server: {
    port: 5174,
    host: true,
  },
  build: {
    target: 'es2022',
    outDir: '../../public/games/turtle-contest-phaser',
    emptyOutDir: false,
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
