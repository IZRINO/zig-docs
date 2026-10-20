import { defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    loader: { name: 'snapshot-json-routes', load: async () => {} },
    schema: docsSchema(),
  }),
};
