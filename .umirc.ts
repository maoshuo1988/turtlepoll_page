import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'umi';

export default defineConfig({
  // Umi replaces the previous Vite entry and owns routing/build/dev-server now.
  npmClient: 'npm',
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
  routes: [
    { path: '/jump', component: 'jump' },
    {
      path: '/',
      component: '@/layouts/home',
      routes: [
        { path: '/', component: 'home' },
        { path: '/rivalry', component: 'rivalry' },
        { path: '/forum', component: 'forum' },
        { path: '/games', component: 'games' },
        { path: '/battle-plaza', component: 'battle-plaza' },
        { path: '/rank', component: 'rank' },
        { path: '/shop', component: 'shop' },
        { path: '/pet', component: 'pet' },
        { path: '/profile', component: 'profile' },
        { path: '/active-predictions', component: 'active-predictions' },
      ],
    },
  ],
  extraPostCSSPlugins: [
    // Keep the existing Tailwind v4 styles working under Umi's build pipeline.
    tailwindcss(),
  ],
});
