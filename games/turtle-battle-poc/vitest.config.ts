import { defineConfig } from 'vitest/config';

// 纯逻辑单测 (无 DOM / 无 Phaser) — engine/data 层的纯函数。
// 跑: yarn test  (或 yarn test:watch)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
