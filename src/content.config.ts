import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const albums = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/albums" }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
	}),
});

export const collections = { albums };
