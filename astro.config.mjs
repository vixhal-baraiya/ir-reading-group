import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';

const site = process.env.SITE ?? 'https://example.github.io';
const base = process.env.BASE_PATH ?? '/ir-reading-group';

export default defineConfig({
  site,
  base,
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkGfm],
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
