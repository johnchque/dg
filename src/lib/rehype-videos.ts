import { visit } from "unist-util-visit";
import { h } from "hastscript";
import type { Root, Element } from "hast";

const YOUTUBE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;
const VIDEO_FILE = /\.(mp4|webm)(\?.*)?$/i;

// Turns a stand-alone link (`<https://youtube.com/watch?v=…>` or a bare
// .mp4/.webm URL on its own line) into an embedded player. Same idea as
// rehype-photos: plain Markdown that still reads fine in Obsidian.
export function rehypeVideos() {
	return (tree: Root) => {
		visit(tree, "element", (node: Element, index, parent) => {
			if (node.tagName !== "p" || !parent || index == null) return;
			if (node.children.length !== 1) return;
			const link = node.children[0];
			if (link.type !== "element" || link.tagName !== "a") return;

			const href = String(link.properties?.href ?? "");
			const youtubeId = href.match(YOUTUBE)?.[1];

			if (youtubeId) {
				parent.children[index] = h(
					"figure",
					{ class: "mb-10 bleed" },
					h("iframe", {
						src: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
						title: "YouTube video",
						loading: "lazy",
						allow: "encrypted-media; picture-in-picture; fullscreen",
						allowFullScreen: true,
						class: "aspect-video w-full rounded-xl",
					}),
				) as Element;
			} else if (VIDEO_FILE.test(href)) {
				// ImageKit serves a poster frame for any video at /ik-thumbnail.jpg.
				const poster = href.startsWith("https://ik.imagekit.io/")
					? `${href.split("?")[0]}/ik-thumbnail.jpg`
					: undefined;
				parent.children[index] = h(
					"figure",
					{ class: "mb-10 bleed" },
					h("video", {
						src: href,
						poster,
						controls: true,
						playsInline: true,
						preload: "none",
						class: "w-full h-auto rounded-xl",
					}),
				) as Element;
			}
		});
	};
}
