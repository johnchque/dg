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

const gardenSchema = z.object({
	title: z.string(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	status: z.enum(["seedling", "budding", "evergreen"]).default("seedling"),
	description: z.string().optional(),
});

const essays = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/essays" }),
	schema: gardenSchema,
});

const explorations = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/explorations" }),
	schema: gardenSchema,
});

const reflections = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/reflections" }),
	schema: gardenSchema,
});

export const collections = { albums, essays, explorations, reflections };
