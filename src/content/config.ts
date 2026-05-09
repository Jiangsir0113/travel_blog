import { defineCollection, z } from "astro:content";

const trips = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    destination: z.string(),
    summary: z.string(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
  }),
});

export const collections = { trips };
