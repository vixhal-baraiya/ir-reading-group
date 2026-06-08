import { defineCollection, z } from 'astro:content';

const dbInternals = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    chapter: z.number(),
  }),
});

export const collections = {
  'db-internals': dbInternals,
};
