// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { rehypePhotos } from './src/lib/rehype-photos.ts';
import { rehypeVideos } from './src/lib/rehype-videos.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://johnchque.com/',
  integrations: [sitemap()],
  // Reflections, albums and the photo stream were folded into /feed.
  redirects: {
    '/photos': '/feed',
    '/albums': '/feed',
    '/albums/copenhagen-2024': '/feed/copenhagen-2024',
    '/reflections': '/feed',
    '/reflections/to-write-again': '/feed/to-write-again'
  },
  markdown: {
    // Astro 7 defaults to the native Sätteri processor; staying on the
    // classic unified/remark/rehype pipeline here since rehype-photos.ts
    // and rehype-videos.ts do non-trivial AST work (paragraph->figure rewriting) and Sätteri's
    // own plugin API/porting docs are still new.
    processor: unified({ rehypePlugins: [rehypePhotos, rehypeVideos] })
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
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      provider: fontProviders.google(),
      weights: [400],
      styles: ['normal']
    },
    {
      name: 'Reenie Beanie',
      cssVariable: '--font-reenie-beanie',
      provider: fontProviders.google(),
      weights: [400],
      styles: ['normal']
    }
  ]
});