import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'umi';
import { resolveApiTarget } from './src/config/apiTargets';

const apiTarget = resolveApiTarget();

export default defineConfig({
  // Umi replaces the previous Vite entry and owns routing/build/dev-server now.
  npmClient: 'yarn',
  publicPath: '/',
  title: '龟投',
  favicons: ['/logo.png'],
  esbuildMinifyIIFE: true,
  history: {
    type: 'browser',
  },
  alias: {
    '@': '/src',
  },
  // define: {
  //   'process.env.TURTLE_API_ORIGIN': JSON.stringify(apiTarget),
  // },
  routes: [
    { path: '/jump', component: 'jump', name: '跳一跳' },
    {
      path: '/',
      name: '首页',
      component: '@/layouts/home',
      routes: [
        { path: '/', component: 'home', name: '首页' },
        { path: '/event-battle', component: 'event-battle', name: '撕裂带' },
        { path: '/world-cup', component: 'world-cup', name: '世界杯' },
        { path: '/rivalry', component: 'rivalry', name: '开撕台' },
        { path: '/forum', component: 'forum', name: '论坛' },
        { path: '/games', component: 'games', name: '游戏' },
        { path: '/battle-plaza', component: 'battle-plaza', name: '撕裂带广场' },
        { path: '/rank', component: 'rank', name: '排行榜' },
        { path: '/shop', component: 'shop', name: '商店' },
        { path: '/pet', component: 'pet', name: '宠物' },
        { path: '/profile', component: 'profile', name: '个人中心' },
        { path: '/active-predictions', component: 'active-predictions', name: '活跃预测' },
      ],
    },
  ],
  extraPostCSSPlugins: [
    // Keep the existing Tailwind v4 styles working under Umi's build pipeline.
    tailwindcss(),
  ],
  proxy: {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
      secure: false,
    },
  },
});
