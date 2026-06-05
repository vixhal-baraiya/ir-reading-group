import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';

const site = process.env.SITE ?? 'https://example.github.io';
const base = process.env.BASE_PATH ?? '/ir-reading-group';

export default defineConfig({
  site,
  base,
  integrations: [sitemap()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkGfm],
    }),
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
