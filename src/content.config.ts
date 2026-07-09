import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const albums = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/albums" }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		photos: z.array(
			z.object({
				path: z.string(),
				alt: z.string(),
				caption: z.string().optional(),
				width: z.number(),
				height: z.number(),
			}),
		),
	}),
});

export const collections = { albums };
