import { getCollection } from "astro:content";

export function formatDate(date: Date, includeYear = true): string {
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	return includeYear ? `${day}.${month}.${date.getFullYear()}` : `${day}.${month}`;
}

export interface GardenEntry {
	href: string;
	title: string;
	status: "seedling" | "budding" | "evergreen";
	updatedAt: Date;
}

export async function getGardenEntries(): Promise<GardenEntry[]> {
	const [essays, explorations, reflections] = await Promise.all([
		getCollection("essays"),
		getCollection("explorations"),
		getCollection("reflections"),
	]);

	const entries: GardenEntry[] = [
		...essays.map((entry) => ({
			href: `/essays/${entry.id}/`,
			title: entry.data.title,
			status: entry.data.status,
			updatedAt: entry.data.updatedAt,
		})),
		...explorations.map((entry) => ({
			href: `/explorations/${entry.id}/`,
			title: entry.data.title,
			status: entry.data.status,
			updatedAt: entry.data.updatedAt,
		})),
		...reflections.map((entry) => ({
			href: `/reflections/${entry.id}/`,
			title: entry.data.title,
			status: entry.data.status,
			updatedAt: entry.data.updatedAt,
		})),
	];

	entries.sort((a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf());
	return entries;
}
