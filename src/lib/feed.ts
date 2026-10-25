import { getCollection, render } from "astro:content";
import { formatDate, formatMonth } from "./garden";

export interface Photo {
	path: string;
	alt: string;
	caption?: string;
	width: number;
	height: number;
}

export interface FeedPost {
	id: string;
	href: string;
	title?: string;
	date: Date;
	monthOnly: boolean;
	photos: Photo[];
	excerpt: string;
	readingMinutes: number;
}

export function formatPostDate(date: Date, monthOnly: boolean): string {
	return monthOnly ? formatMonth(date) : formatDate(date);
}

// Month-only posts sort as if written at the very end of their month, so they
// sit at the top of that month's posts.
function sortKey(post: FeedPost): number {
	if (!post.monthOnly) return post.date.valueOf();
	const { date } = post;
	return new Date(date.getFullYear(), date.getMonth() + 1, 1).valueOf() - 1;
}

// The feed clamps text to three lines in CSS; this only keeps long
// reflections from shipping their whole body into the feed's HTML.
const EXCERPT_LENGTH = 400;

function excerpt(markdown: string): string {
	return markdown
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/^#+\s+/gm, "")
		.replace(/[*_`>]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, EXCERPT_LENGTH);
}

// At a relaxed ~200 words a minute, never less than one.
function readingMinutes(markdown: string): number {
	const words = markdown.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 200));
}

export async function getFeedPosts(): Promise<FeedPost[]> {
	const entries = await getCollection("feed");

	const posts = await Promise.all(
		entries.map(async (entry) => {
			const { remarkPluginFrontmatter } = await render(entry);
			return {
				id: entry.id,
				href: `/feed/${entry.id}/`,
				title: entry.data.title,
				date: entry.data.date,
				monthOnly: entry.data.monthOnly,
				photos: (remarkPluginFrontmatter.photos ?? []) as Photo[],
				excerpt: excerpt(entry.body ?? ""),
				readingMinutes: readingMinutes(entry.body ?? ""),
			};
		}),
	);

	posts.sort((a, b) => sortKey(b) - sortKey(a));
	return posts;
}
