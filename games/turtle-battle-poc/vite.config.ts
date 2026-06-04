import { defineConfig } from 'vite';

export default defineConfig({
  base: '/games/turtle-arena-game/',
  // publicDir 保留为 ./public，构建时整体输出到主站 public/games/turtle-arena-game。
  publicDir: 'public',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    outDir: '../../public/games/turtle-arena-game',
    assetsDir: 'assets',
    emptyOutDir: true,
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
