import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const dbInternals = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/db-internals' }),
  schema: z.object({
    title: z.string(),
    chapter: z.number(),
  }),
});

export const collections = {
  'db-internals': dbInternals,
};
