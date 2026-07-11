---
title: "Astro's Content Layer, Piece by Piece"
createdAt: 2026-07-11
updatedAt: 2026-07-11
status: "budding"
description: "Notes on how Astro's content collections, loaders, and render() actually fit together."
---

I used to treat "content collections" as one black-boxed feature. Building this site forced me to actually separate the pieces: a `loader` decides *what* files become entries (I'm using `glob()` against a folder of Markdown), a `schema` decides what frontmatter is *allowed*, and `render(entry)` is the thing that turns one entry into an actual `<Content />` component plus whatever metadata a plugin chose to attach along the way.

That last part surprised me most. A remark/rehype plugin can stash arbitrary data on `file.data.astro.frontmatter` while it's transforming the Markdown, and it comes back out of `render()` as `remarkPluginFrontmatter` — a side channel that isn't part of the declared schema at all. That's how photos embedded in the middle of an album's story text can still get collected into a flat list for a separate photo-stream page, without duplicating anything by hand.

Still figuring out where the edges of this pattern are — in particular, whether it holds up once Astro's newer native markdown processor becomes the default instead of the legacy `unified()` pipeline.
