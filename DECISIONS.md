# Site decisions log

This documents the architecture, tooling, and design decisions made while
building this site, and *why* — including the dead ends, so nobody
(including future-me) re-litigates or blindly re-attempts something that was
already tried and rejected. Ordered roughly by topic, not chronologically.

## Photos & albums

### Content model: story-driven albums, not photo grids

Albums are Markdown files in `src/content/albums/*.md`. Frontmatter is just
`{ title, date }` — no photo list in frontmatter. Photos live **in the body
text**, embedded with standard Markdown image syntax, wherever they belong in
the story:

```markdown
We landed in the evening and the city was already lit up for winter.

![Copenhagen harbor at night](https://ik.imagekit.io/johnchque/website/photos/20241117_cph/cph_1.jpg?width=3499&height=2336 "The view from our hotel window")

The next morning we walked along the water...
```

This was a deliberate move away from "one flat list of photos after an intro
paragraph" (the format most photo/social apps force on you) toward albums
that read like an actual story — paragraphs interleaved with photos whatever
order they belong in.

**Why plain Markdown, not MDX/components:** albums must stay comfortably
editable in **Obsidian** (a plain-Markdown, local-first note app). MDX/JSX
component syntax (`<PhotoCard ... />`) in the body would render as
broken-looking literal text in Obsidian. Plain `![]()` syntax previews
correctly there.

**The `?width=&height=` URL convention:** photo dimensions are required (for
CLS-prevention — the `<img>` needs real `width`/`height` attributes) but
plain Markdown image syntax has no attribute slot for them. Appending them as
query params on the image URL is the only place to put them that (a) doesn't
break Obsidian's image preview and (b) isn't a Pandoc-style `{...}`
attribute block, which Obsidian would render as visible literal text.
`title="..."` (the quoted string after the URL) is used for the visible
caption.

Missing `?width=&height=` is a **build-time error** (the plugin throws), not
a silently broken layout — see the caveat below about what actually happens
when it fires.

### `src/lib/rehype-photos.ts`

A rehype plugin, registered in `astro.config.mjs`, that runs on every
album's markdown during the build. For each image (found by looking for a
`<p>` that wraps exactly one `<img>` — the standard shape CommonMark
produces for a stand-alone `![]()`), it:

1. Parses `width`/`height` out of the URL query string, strips them, and
   throws a clear error if either is missing.
2. Computes `src`/`srcSet`/`sizes` via `getResponsiveImageAttributes` from
   `@imagekit/javascript` — the same call `PhotoCard.astro` uses, same
   breakpoints (`[640, 828, 1080, 1280]`), same `sizes` string.
3. Replaces the paragraph with a `<figure>` (built via `hastscript`'s `h()`
   helper, not hand-written hast object literals — see below) containing the
   upgraded `<img>` and a `<figcaption>` from the title, if present. The
   first image in the document gets `loading="eager"`/`fetchpriority="high"`.
4. Records every photo's `{ path, alt, caption, width, height }` and writes
   the list to `file.data.astro.frontmatter.photos` — this is how
   `/photos.astro` gets a flat, chronological list of every photo across
   every album without a separate frontmatter array. It's exposed via
   Astro's `render(entry)` as `remarkPluginFrontmatter.photos`.

**Known gap, found while testing:** if a photo's dimensions are missing, the
plugin's error *does* throw with a clear message, but Astro's content layer
catches it per-entry — the build still exits `0` and reports success, and
that album's page silently renders **completely empty** (not just the one
broken photo — the whole page). There's no CI-visible failure. Worth adding
a stronger guardrail (a script that calls `render()` on every album and
exits non-zero on error) if this becomes a real risk; not done yet.

**Why `hastscript` instead of hand-written hast objects:** the original
version manually constructed `{ type: "element", tagName, properties,
children }` objects for the `img`/`figcaption`/`figure` nodes — about a
third of the file was pure boilerplate. `hastscript`'s `h(tag, props,
...children)` does the same thing as a function call. Zero new capability,
just less code to read. (`hastscript` was already cached transitively via
Astro's own dependency tree, so adding it as a direct dependency cost
nothing.)

### Legacy `unified()` pipeline, not Sätteri

Astro 7 replaced its default Markdown engine with a new native Rust
processor called **Sätteri**. `rehype-photos.ts` is registered the
*legacy* way, on purpose:

```js
import { unified } from '@astrojs/markdown-remark';
// ...
markdown: {
  processor: unified({ rehypePlugins: [rehypePhotos] })
}
```

Investigated migrating to Sätteri's native plugin API and decided
**against it, for now**:

- Sätteri's `ctx.wrapNode()` primitive would actually make the
  figure-wrapping *simpler* than the current `hastscript` approach.
- But there is **no documented way to get a Sätteri plugin's exported data
  (`ctx.data` / `result.data`) into Astro's `remarkPluginFrontmatter`** —
  confirmed by reading Sätteri's own Plugin API reference directly, not
  guessed. That side-channel is exactly what `/photos.astro`'s flat stream
  depends on. Migrating today would mean inventing a replacement mechanism
  (likely a second raw-markdown parse), which is *more* complexity, not
  less, for a processor that's brand-new (2026) and still thin on docs.
- Revisit this if/when Astro documents a bridge from Sätteri plugin data to
  content-collection `render()`.

### ImageKit hosting

Photos are hosted on ImageKit (Frankfurt/EU region, set in the ImageKit
dashboard — not a code setting), for a not-big-tech, privacy-respecting
photo pipeline. `IMAGEKIT_URL_ENDPOINT` lives in `.env` (gitignored); see
`.env.example`.

**We do NOT use the `@imagekit/astro` integration package.** It was tried
first, then removed after discovering (and reproducing) a real, open
upstream bug: in `output: "static"` builds, Astro's static-generation step
misidentifies ImageKit-routed images as needing local static pre-rendering,
and the build crashes with `ENOENT` trying to find them as local files in
`dist/`. Confirmed via a matching open GitHub issue
(`imagekit-developer/imagekit-astro` #4) with the same root cause we found
independently. The fix was to drop the integration and call
`@imagekit/javascript`'s `getResponsiveImageAttributes`/`buildSrc` directly
(see `src/lib/imagekit.ts` and `PhotoCard.astro`) — same visual output, same
CDN, no dependency on a broken package.

A side effect of removing `@imagekit/astro`: it also used to intercept
*any* bare root-relative image path (including ones meant to reference
`public/`) and wrongly route them to ImageKit's CDN — reproduced live at the
time. That bug no longer exists since the integration is gone. The general
rule stands regardless: local images must be `import`ed from `src/assets/`
and used with `astro:assets`' `<Image>`, not referenced by a raw
`public/`-relative string, if you ever want that Astro-optimization path —
plain `<img>`/`<link>` tags referencing `public/` directly (like the
favicon) are unaffected either way.

### `/photos` vs `/albums/[slug]`

- **`/photos.astro`** — flat, reverse-chronological stream of every photo
  across every album. Built by calling `render(album)` for each album,
  reading `remarkPluginFrontmatter.photos`, flattening, sorting by album
  date, and rendering through `PhotoCard.astro`.
- **`/albums/[slug].astro`** — just renders `<Content />`; the story and
  photos appear in whatever order the author wrote them. The OG-image for
  the album page is the first photo, read the same way
  (`remarkPluginFrontmatter.photos?.[0]`).
- **`PhotoCard.astro`** and **`src/lib/imagekit.ts`** are the only two
  places that call `@imagekit/javascript` directly; `rehype-photos.ts`
  duplicates the responsive-image logic (same function, same breakpoints)
  because Astro components can't be invoked from inside a rehype plugin —
  different rendering pipelines. Keep both in sync by hand if the visual
  design changes.

## TypeScript & tooling

- `typescript` was **not installed at all** until this was caught — the
  project was silently relying on the editor's own bundled TS version,
  which isn't reproducible across machines/CI. Now pinned as a real
  devDependency.
- **Pinned to `typescript@5.9.3`, not the newest `7.x`.** TypeScript 7 is
  the brand-new native/Go-based compiler ("tsgo"); `@astrojs/check`'s
  language-server actually crashed against it
  (`Cannot read properties of undefined (reading 'fileExists')`) —
  reproduced directly, not assumed. Its Language Service API isn't fully
  ported yet. Revisit the pin once Astro's tooling catches up.
- **`@astrojs/check` installed** so `astro check` actually runs. Plain
  `tsc` silently skips `.astro` files entirely — `astro check` is the real
  tool for whole-project type-checking here.
- **Import `z` from `astro/zod`, not `astro:content`.** The `z` re-export
  from `astro:content` is deprecated (confirmed by testing both import
  paths side by side — only the `astro:content` one triggered the `ts(6385)`
  warning). `src/content.config.ts` uses `import { z } from "astro/zod"`.
- Running `astro check` right now: 0 errors, 0 warnings, 0 hints.

## Design system

### Colors (`src/styles/global.css`, `@theme` block)

| Token | Hex | Used for |
| --- | --- | --- |
| `mist` | `#e5e7e8` | Light-mode background |
| `charcoal` | `#111111` | Dark-mode background |
| `evening` | `#1f5299` | Light-mode links (base) |
| `evening-dark` | `#163d73` | Light-mode links (hover) |
| `sunset` | `#c98f65` | Dark-mode links (base) |
| `sunset-light` | `#d9a679` | Dark-mode links (hover) |

Light-mode body text is plain `black`; dark-mode body text is plain `white`.
The `evening`/`sunset` pair was deliberately chosen to feel like "blue
evening" and "sunset" rather than generic saturated blue/beige — both
verified against real WCAG contrast-ratio math (not eyeballed) before
landing on final values, all comfortably clearing AA (most clear AAA).

Body background/text color changes (the light/dark toggle) are animated via
a plain CSS `transition-colors duration-700 ease-in-out` on `<body>` —
respects `prefers-reduced-motion`.

### Header

- `position: fixed`, full width on mobile, capped at `max-w-4xl` (wider
  than `main`'s `max-w-2xl` reading column) and centered on desktop via
  `mx-auto`.
- Text color is `text-white` combined with `mix-blend-mode: difference` —
  this makes the header text automatically render as the inverse of
  whatever's directly behind it (dark backdrop → white text, light
  backdrop → black text) without needing `dark:` conditional classes on the
  header itself, since it may sit over content that scrolls underneath it.
- `<main>` has extra top padding (`pt-28`/`pt-32`) to clear the fixed
  header so scrolled content doesn't start hidden underneath it.
- The theme-toggle button's two SVG icons (Remixicon moon/sun) are laid out
  with `grid` + `place-items-center` with both icons sharing the same grid
  cell (`col-start-1 row-start-1`) — fixes a real visual misalignment that
  showed up when relying on inline-element baseline positioning instead.

### `RoleRotator.astro`

Vertical sliding text rotator for the roles under the name in the header
(e.g. "Software Engineer" → "Social Entrepreneur" → "Photographer"). Pure
CSS `@keyframes translateY`, no JS. The frame list repeats the first role
at the end so the loop-back is visually seamless (identical text, so the
instant reset when the animation restarts is imperceptible). Keyframe
percentages are **generated from the role count** (not hand-tuned), so
adding/removing roles doesn't silently break the animation — this was a
real bug found and fixed: hand-tuned percentages for 2 roles silently
dropped a 4th role when the list grew, with no error. Respects
`prefers-reduced-motion`.

## SEO & performance

- `site: 'https://johnchque.com/'` set in `astro.config.mjs` — required for
  sitemap/canonical/OG absolute URLs to generate correctly.
- `@astrojs/sitemap` generates `sitemap-index.xml`/`sitemap-0.xml`.
- `robots.txt` in `public/`, points at the sitemap.
- Per-page `<title>`/meta description/canonical/OG/Twitter Card tags via
  `Layout.astro` props — previously every page hardcoded the Astro
  starter-template title ("Astro Basics"); fixed.
- Default social-preview image is a plain generated black PNG
  (`public/og-default.png`); album/photo pages override it with the
  album's/photo's real ImageKit URL via `ogImageUrl()` in
  `src/lib/imagekit.ts`.
- Images: responsive `srcset` across `[640, 828, 1080, 1280]` breakpoints,
  `sizes="(min-width: 42rem) 42rem, 100vw"` (matches `main`'s max-width),
  first image on a page gets `loading="eager"`/`fetchpriority="high"`
  (LCP), everything else `loading="lazy"`. All computed at build time —
  zero runtime cost, same ImageKit CDN edge-caching either way.

## Abandoned experiments

Documented so these aren't re-attempted blindly — each was actually built,
tested, and explicitly rejected by the user, not just discussed:

- **CSS noise-texture "old paper" background** — generated a real tileable
  grayscale noise PNG, blended over a cream/dark base via
  `background-blend-mode`. Rejected: looked bad in practice. Removed
  entirely, including the generated PNG.
- **"Dappled light through leaves" effect** (adapted from
  `jackyzha0/sunlit`) — window-blind shadow stripes + hand-drawn SVG leaf
  silhouette with a real `feTurbulence`/`feDisplacementMap` wind filter,
  tilted via `matrix3d`. Hit and fixed two real bugs along the way
  (`z-index: -1` hiding behind the opaque body background; needed
  `isolation: isolate` on `<main>`, matching a detail in the reference
  implementation's own CSS). Ultimately rejected by the user as too much for
  the site ("didn't like it") — replaced with something much simpler.
- **Simple ambient glow, auto-cycling every 45s** — a corner `radial-gradient`
  with `@property`-animated color, looping on its own timer. User feedback:
  the color transition should be tied to the *theme-toggle click*, not run
  on an independent timer — changed from `@keyframes animation` to a plain
  CSS `transition` on the custom property (fires only when `.dark` toggles).
  Later replaced entirely by the current fixed-color `mist`/`charcoal`
  background once the color palette settled.

## Open items / things to revisit

- The "silent empty page on missing photo dimensions" gap in
  `rehype-photos.ts` (see above) — no build-time guardrail currently
  catches this in CI.
- Sätteri migration for `rehype-photos.ts` — blocked on Astro documenting a
  `remarkPluginFrontmatter`-equivalent bridge for Sätteri plugin data.
- `typescript` pinned below latest (`5.9.3`, not `7.x`) until
  `@astrojs/check`/`@astrojs/language-server` support the new native
  compiler.
