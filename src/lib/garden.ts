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

export interface GardenEntry {
	href: string;
	title: string;
	status: "seedling" | "budding" | "evergreen";
	updatedAt: Date;
}

export async function getGardenEntries(): Promise<GardenEntry[]> {
	const [essays, notes] = await Promise.all([
		getCollection("essays"),
		getCollection("notes"),
	]);

	const entries: GardenEntry[] = [
		...essays.map((entry) => ({
			href: `/essays/${entry.id}/`,
			title: entry.data.title,
			status: entry.data.status,
			updatedAt: entry.data.updatedAt,
		})),
		...notes.map((entry) => ({
			href: `/notes/${entry.id}/`,
			title: entry.data.title,
			status: entry.data.status,
			updatedAt: entry.data.updatedAt,
		})),
	];

	entries.sort((a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf());
	return entries;
}
