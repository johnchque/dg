import { visit } from "unist-util-visit";
import { getResponsiveImageAttributes } from "@imagekit/javascript";
import { h } from "hastscript";
import type { Root, Element } from "hast";

const urlEndpoint = import.meta.env.IMAGEKIT_URL_ENDPOINT;

interface PhotoRef {
	path: string;
	alt: string;
	caption?: string;
	width: number;
	height: number;
}

// Turns a stand-alone Markdown image (`![alt](url?width=&height= "caption")`,
// which CommonMark wraps in its own <p>) into a fully responsive, styled
// <figure>, and records each photo so the feed can show it as a carousel
// without a separate frontmatter list. Dimensions are required in the URL
// query string because there's nowhere else in plain Markdown to put them
// while staying Obsidian-friendly (no MDX/component syntax, no attribute
// blocks Obsidian would render as literal text).
export function rehypePhotos() {
	return (tree: Root, file: { data: Record<string, unknown> }) => {
		const photos: PhotoRef[] = [];
		let photoIndex = 0;

		visit(tree, "element", (node: Element, index, parent) => {
			if (node.tagName !== "p" || !parent || index == null) return;
			if (node.children.length !== 1) return;
			const img = node.children[0];
			if (img.type !== "element" || img.tagName !== "img") return;

			const rawSrc = String(img.properties?.src ?? "");
			const alt = String(img.properties?.alt ?? "");
			const caption = img.properties?.title
				? String(img.properties.title)
				: undefined;

			const url = new URL(rawSrc);
			const widthParam = url.searchParams.get("width");
			const heightParam = url.searchParams.get("height");
			if (!widthParam || !heightParam) {
				throw new Error(
					`[rehype-photos] Photo is missing ?width=&height= in its URL: ${rawSrc}`,
				);
			}
			const width = Number(widthParam);
			const height = Number(heightParam);
			url.searchParams.delete("width");
			url.searchParams.delete("height");
			const cleanSrc = url.toString();

			const priority = photoIndex === 0;
			photoIndex++;

			const { src, srcSet, sizes } = getResponsiveImageAttributes({
				src: cleanSrc,
				urlEndpoint,
				sizes: "(min-width: 42rem) 42rem, 100vw",
				deviceBreakpoints: [640, 828, 1080, 1280],
				imageBreakpoints: [],
			});

			photos.push({ path: cleanSrc, alt, caption, width, height });

			parent.children[index] = h(
				"figure",
				{ class: "mb-10 bleed" },
				h("img", {
					src,
					srcSet,
					sizes,
					width,
					height,
					alt,
					loading: priority ? "eager" : "lazy",
					decoding: priority ? "sync" : "async",
					...(priority ? { fetchpriority: "high" } : {}),
					class: "w-full h-auto rounded-xl",
				}),
				caption &&
					h("figcaption", { class: "mt-2 text-sm text-gray-400" }, caption),
			) as Element;
		});

		const astroData = (file.data.astro ?? {}) as {
			frontmatter?: Record<string, unknown>;
		};
		file.data.astro = {
			...astroData,
			frontmatter: { ...astroData.frontmatter, photos },
		};
	};
}
