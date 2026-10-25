import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// One stream for everything short-lived: text posts, reflections and photo
// albums. Photos are read from the Markdown body by rehype-photos, so a post
// with photos is an album and one without is text. A text post without a
// title is a short one, shown whole like a tweet.
//
// `date` is either a full day (2024-11-17) or just a month (2024-11) for
// posts that shouldn't be pinned to an exact day. YAML reads the month form
// as a plain string, which is how the two are told apart.
const feed = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/feed" }),
	schema: z
		.object({
			title: z.string().optional(),
			// A few handwritten words next to the date: a place, a mood.
			note: z.string().optional(),
			date: z.union([z.string().regex(/^\d{4}-\d{2}$/), z.coerce.date()]),
		})
		.transform(({ date, ...rest }) => {
			if (typeof date !== "string") return { ...rest, date, monthOnly: false };
			const [year, month] = date.split("-").map(Number);
			return { ...rest, date: new Date(year, month - 1, 1), monthOnly: true };
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

const notes = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
	schema: gardenSchema,
});

// Projects of every kind (startups, organizations, videos, books, comics).
// A project with a Markdown body gets its own page; one without is just a
// line on /workbench.
const workbench = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/workbench" }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		description: z.string(),
		// Singular and lowercase ("music video", "startup").
		type: z.string().transform((type) => type.toLowerCase()),
		role: z.string(),
		with: z.string().optional(),
		// Where a project without its own page lives elsewhere (a site, a
		// social profile); its card links out there instead.
		url: z.url().optional(),
	}),
});

export const collections = { essays, feed, notes, workbench };
