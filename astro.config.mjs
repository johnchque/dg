// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://johnchque.com/',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()]
  },
  fonts: [
    {
      name: 'Geist',
      cssVariable: '--font-geist',
      provider: fontProviders.google(),
      weights: [400, 700],
      styles: ['normal']
    }
  ]
});