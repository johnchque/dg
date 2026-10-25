import { getCollection, render } from "astro:content";
import { formatDate, formatMonth } from "./garden";

export interface Photo {
	path: string;
	alt: string;
	caption?: string;
	width: number;
	height: number;
}

type Rendered = Awaited<ReturnType<typeof render>>;

export interface FeedPost {
	id: string;
	href: string;
	title?: string;
	note?: string;
	date: Date;
	monthOnly: boolean;
	photos: Photo[];
	readingMinutes: number;
	Content: Rendered["Content"];
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

// At a relaxed ~200 words a minute, never less than one.
function readingMinutes(markdown: string): number {
	const words = markdown.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 200));
}

export async function getFeedPosts(): Promise<FeedPost[]> {
	const entries = await getCollection("feed");

	const posts = await Promise.all(
		entries.map(async (entry) => {
			const { Content, remarkPluginFrontmatter } = await render(entry);
			return {
				id: entry.id,
				href: `/feed/${entry.id}/`,
				title: entry.data.title,
				note: entry.data.note,
				date: entry.data.date,
				monthOnly: entry.data.monthOnly,
				photos: (remarkPluginFrontmatter.photos ?? []) as Photo[],
				readingMinutes: readingMinutes(entry.body ?? ""),
				Content,
			};
		}),
	);

	posts.sort((a, b) => sortKey(b) - sortKey(a));
	return posts;
}
