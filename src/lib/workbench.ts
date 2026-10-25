import { getCollection, type CollectionEntry } from "astro:content";

export type Project = CollectionEntry<"workbench">;

export function hasPage(project: Project): boolean {
	return Boolean(project.body?.trim());
}

export function formatType(type: string): string {
	return type.charAt(0).toUpperCase() + type.slice(1);
}

export async function getProjects(): Promise<Project[]> {
	const projects = await getCollection("workbench");
	projects.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
	return projects;
}
