import { getCollection } from "astro:content";

// Spelled out by hand rather than with toLocaleDateString, which gives
// "Sept" for September in en-GB and can vary between Node versions.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "19 Aug 2026", or "19 Aug" without the year.
export function formatDate(date: Date, includeYear = true): string {
	const dayMonth = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
	return includeYear ? `${dayMonth} ${date.getFullYear()}` : dayMonth;
}

// "Aug 2026": the same format as formatDate, minus the day.
export function formatMonth(date: Date): string {
	return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export type GardenType = "essay" | "note";

export interface GardenEntry {
	type: GardenType;
	href: string;
	title: string;
	description?: string;
	status: "seedling" | "budding" | "evergreen";
	updatedAt: Date;
	pinned: boolean;
	image?: string;
}

export async function getGardenEntries(): Promise<GardenEntry[]> {
	const [essays, notes] = await Promise.all([
		getCollection("essays"),
		getCollection("notes"),
	]);

	const toEntries = (
		type: GardenType,
		base: string,
		collection: typeof essays,
	): GardenEntry[] =>
		collection.map((entry) => ({
			type,
			href: `/${base}/${entry.id}/`,
			title: entry.data.title,
			description: entry.data.description,
			status: entry.data.status,
			updatedAt: entry.data.updatedAt,
			pinned: entry.data.pinned,
			image: entry.data.image,
		}));

	const entries = [
		...toEntries("essay", "essays", essays),
		...toEntries("note", "notes", notes),
	];

	entries.sort((a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf());
	return entries;
}
