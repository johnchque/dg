import { readdirSync } from "node:fs";
import { visit, SKIP } from "unist-util-visit";
import type { Root, Element, ElementContent, Text } from "hast";

// Collections a wikilink can point to, and the URL each one lives under.
const COLLECTIONS = ["notes", "essays", "feed", "workbench"];

const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;

// The same id Astro's glob loader gives a file: its name, slugified.
function slugify(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s_-]/gu, "")
		.replace(/\s/g, "-");
}

// Filename (lowercased, no .md) → URL. Read fresh for every Markdown file so
// a note created while the dev server runs can be linked right away.
function readTargets(): Map<string, string> {
	const targets = new Map<string, string>();
	for (const collection of COLLECTIONS) {
		let files: string[] = [];
		try {
			files = readdirSync(`./src/content/${collection}`);
		} catch {
			continue;
		}
		for (const file of files) {
			if (!file.endsWith(".md")) continue;
			const name = file.slice(0, -".md".length);
			targets.set(name.toLowerCase(), `/${collection}/${slugify(name)}/`);
		}
	}
	return targets;
}

// Turns Obsidian wikilinks (`[[note-name]]` or `[[note-name|Shown text]]`)
// into links to the note's page, so the same Markdown links work in Obsidian
// and on the site. A link to a note that doesn't exist (yet) stays plain text.
export function rehypeWikilinks() {
	return (tree: Root) => {
		const targets = readTargets();

		visit(tree, "text", (node: Text, index, parent) => {
			if (!parent || index == null || !node.value.includes("[[")) return;
			if (parent.type === "element" && ["code", "pre", "a"].includes(parent.tagName)) return;

			const children: ElementContent[] = [];
			let last = 0;
			for (const match of node.value.matchAll(WIKILINK)) {
				const [whole, target, alias] = match;
				const name = target.trim().split("/").pop()!;
				const text = (alias ?? name).trim();
				const href = targets.get(name.toLowerCase());

				children.push({ type: "text", value: node.value.slice(last, match.index) });
				children.push(
					href
						? ({
								type: "element",
								tagName: "a",
								properties: { href, className: ["link"] },
								children: [{ type: "text", value: text }],
							} satisfies Element)
						: { type: "text", value: text },
				);
				last = match.index + whole.length;
			}
			if (last === 0) return;
			children.push({ type: "text", value: node.value.slice(last) });

			(parent as Element).children.splice(index, 1, ...children);
			return [SKIP, index + children.length];
		});
	};
}
