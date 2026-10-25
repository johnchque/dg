import { visit } from "unist-util-visit";
import { h } from "hastscript";
import type { Root, Element } from "hast";

const YOUTUBE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;
const VIDEO_FILE = /\.(mp4|webm)(\?.*)?$/i;

// Turns a stand-alone link (`<https://youtube.com/watch?v=…>` or a bare
// .mp4/.webm URL on its own line) into an embedded player; add `#wide` to the
// URL for a wider one. Same idea as
// rehype-photos: plain Markdown that still reads fine in Obsidian.
export function rehypeVideos() {
	return (tree: Root) => {
		visit(tree, "element", (node: Element, index, parent) => {
			if (node.tagName !== "p" || !parent || index == null) return;
			if (node.children.length !== 1) return;
			const link = node.children[0];
			if (link.type !== "element" || link.tagName !== "a") return;

			// `#wide` at the end of the link makes the video run out to the
			// header's edge on desktop (see .wide in global.css).
			const rawHref = String(link.properties?.href ?? "");
			const wide = rawHref.endsWith("#wide");
			const href = wide ? rawHref.slice(0, -"#wide".length) : rawHref;
			const figureClass = wide ? "my-10 wide" : "my-10";
			const youtubeId = href.match(YOUTUBE)?.[1];

			if (youtubeId) {
				// A still with a play button; the real player only loads on click
				// (see the youtube-facade script in Layout.astro). Not every video
				// has a maxres thumbnail, so fall back to hqdefault.
				parent.children[index] = h(
					"figure",
					{ class: figureClass },
					h(
						"button",
						{
							type: "button",
							"data-youtube": youtubeId,
							"aria-label": "Play video",
							class:
								"group relative block aspect-video w-full cursor-pointer overflow-hidden rounded-xl bg-black",
						},
						h("img", {
							src: `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`,
							onerror: `this.onerror=null;this.src='https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg'`,
							alt: "",
							loading: "lazy",
							decoding: "async",
							class: "h-full w-full object-cover",
						}),
						h(
							"span",
							{
								class:
									"absolute top-1/2 left-1/2 grid size-14 -translate-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors duration-150 group-hover:bg-black/65",
							},
							h(
								"svg",
								{ width: 20, height: 20, viewBox: "0 0 256 256", fill: "currentColor", "aria-hidden": "true" },
								// Phosphor (fill): play.
								h("path", {
									d: "M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z",
								}),
							),
						),
					),
				) as Element;
			} else if (VIDEO_FILE.test(href)) {
				// ImageKit serves a poster frame for any video at /ik-thumbnail.jpg.
				const poster = href.startsWith("https://ik.imagekit.io/")
					? `${href.split("?")[0]}/ik-thumbnail.jpg`
					: undefined;
				parent.children[index] = h(
					"figure",
					{ class: figureClass },
					h("video", {
						src: href,
						poster,
						controls: true,
						playsInline: true,
						// Metadata only, so the player takes the clip's real size
						// instead of guessing from the poster.
						preload: "metadata",
						class: "w-full h-auto rounded-xl bg-black",
					}),
				) as Element;
			}
		});
	};
}
