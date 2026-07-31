// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { rehypePhotos } from './src/lib/rehype-photos.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://johnchque.com/',
  integrations: [sitemap()],
  markdown: {
    // Astro 7 defaults to the native Sätteri processor; staying on the
    // classic unified/remark/rehype pipeline here since rehype-photos.ts
    // does non-trivial AST work (paragraph->figure rewriting) and Sätteri's
    // own plugin API/porting docs are still new.
    processor: unified({ rehypePlugins: [rehypePhotos] })
  },
  vite: {
    plugins: [tailwindcss()]
  },
  fonts: [
    {
      name: 'Open Sans',
      cssVariable: '--font-open-sans',
      provider: fontProviders.google(),
      weights: [400, 700],
      styles: ['normal']
    },
    {
      name: 'Literata',
      cssVariable: '--font-literata',
      provider: fontProviders.google(),
      weights: [400],
      styles: ['normal']
    }
  ]
});