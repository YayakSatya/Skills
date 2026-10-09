---
name: design-killer
description: Turns a PRD.md into a finished visual design for people with no design background, mainly company profile websites (also apps), step by step with a review checkpoint after every step. Profile, page structure, 2-3 DESIGN.md style options (Refero MCP, the open awesome-design-md catalog, or files the user downloaded) shown side by side on the same homepage, the company's own DESIGN.md with a visual style guide, HI-FI homepage, remaining HI-FI pages, assets (tokens, logo, favicon, icons, photo shot list, social preview), antislop Delivery Gate. Use whenever someone has a PRD or PRD package (context, prd, sitemap, spec), brief or wireframe and needs a look and feel, style options, DESIGN.md, hi-fi mockups or design assets, especially product builders without a designer or Figma. Trigger on "company profile", "compro", "website perusahaan", "carikan design.md", "pilih style untuk prd ini", "bikin hi-fi dari wireframe", "aku ga ngerti design", "lanjut step", even if DESIGN.md is never mentioned.
metadata:
  version: "0.4"
  last-updated: "2026-10-09"
---

# Design Killer

PRD in, finished design out, for product builders who do not design. Most projects are **company profile websites** (Beranda, Tentang Kami, Layanan, Proyek, Kontak); apps and dashboards work too. For company profiles, read `references/company-profile.md` alongside each step: it holds the sitemap, content intake, industry-to-style table, photo rules and build rules.

Input is usually a **PRD package** (`<slug>_context.md`, `_prd.md`, `_sitemap.md`, `_spec.md`, `_openapi.yaml`, sometimes the client brief). Read `references/prd-package.md` first: it maps each file to the design decisions it settles (concepts promised, revision limit, minimum width, pages and states, optional modules, performance budget) so you take them from the package instead of inventing them.

The work runs **one step at a time**. Every step ends at a checkpoint (CEK) where the user looks at the result and approves, asks for a revision, or stops. Nothing jumps ahead to HI-FI.

| Step | What gets made | CEK: what the user checks |
|---|---|---|
| 1 Profil | `profile.md`, `content-needed.md` | "Is this our company and our visitors?" + answers to up to 4 questions |
| 2 Struktur | `screens.md` (pages grouped into templates, with states), lo-fi wireframes | pages, sections in the right order, optional modules in or out |
| 3 Pilihan konsep | the number of concepts the PRD promises (often 2), `compare.html` | internal check, then the **client** picks; logo choice |
| 4 Design system | root `DESIGN.md`, `styleguide.html`, `decision.md` | colors, fonts, buttons, cards feel right |
| 5 HI-FI Beranda | homepage HI-FI + screenshots | the homepage; it sets the pattern for every other page |
| 6 HI-FI halaman lain | remaining templates/pages (all at once, or one by one) | each page; client revision rounds counted against the PRD limit |
| 7 Aset | logo, favicon, icons, shot list, og image, tokens | logo first, then the asset list |
| 8 Cek akhir | antislop Delivery Gate report | the final report and what is still placeholder |

## Why it works this way

Non-designers cannot write design direction from scratch, and cannot judge a markdown file full of hex codes. They *can* look at the same page in three styles and say "that one feels right for our visitors". So the skill turns design into a choice between ready-made, coherent systems, then does the expert parts (adaptation, contrast, fonts, states, assets) for them.

The checkpoints exist because a wrong early decision is expensive late: a missing page found at Step 2 costs a line in a list; found after HI-FI it costs a rebuild. Each CEK is placed right before the next expensive step.

Two companions make the result good instead of generic:
- **DESIGN.md gives direction** (identity, palette, type, mood).
- **antislop filters slop** (fake stats, dead buttons, missing states, clones, bad contrast). On a company profile this matters most: invented "200+ klien", made-up testimonials and borrowed client logos damage the company's credibility, which is the whole point of the site.
antislop's own README says neither works alone. This skill supplies the DESIGN.md antislop expects (its R-37) and runs its Delivery Gate at the end.

## Talking to the user

They are not designers. Write to them in their language (usually Bahasa Indonesia here), in everyday words, short.
- Offer choices, never open design questions. "Lebih mirip website bank atau website agensi kreatif?" not "What typographic voice do you want?"
- When a design term is unavoidable, explain it in five words or fewer.
- Be honest about trade-offs ("butuh foto bagus, kalau belum ada, opsi ini akan terlihat kosong").
- Within a step, ask at most one bundled round of questions. The CEK at the end is the other conversation point.

## The checkpoint protocol

Run this at the end of every step. It is the core of the skill; do not shortcut it.

1. **Finish the step's outputs** and verify them yourself first (screenshots for anything visual: `scripts/screenshot.sh`). Do not show the user something you have not looked at.
2. **Update `design/progress.md`** (format below): this step `menunggu cek`.
3. **Report in chat**, in the user's language, in this shape:
   - **Step N selesai: <name>**: what was made, 2-5 bullets.
   - **Cara lihat**: the exact file to open. Open it for them (`open <file>` on macOS, `xdg-open` on Linux) when it is HTML or an image.
   - **Yang perlu dicek**: 2-4 concrete questions for this step (listed per step below), in plain words.
4. **Ask with AskUserQuestion**: "Oke, lanjut ke Step N+1 (<name>)" / "Revisi dulu" / "Berhenti dulu". Client checkpoints (Step 3, client revision rounds) use the two-stage form in "Client rounds" below.
5. **End the turn.** Do not start the next step in the same turn, even if the step went smoothly.

Then:
- **Lanjut**: mark the step `disetujui` with the date, start the next step.
- **Revisi**: get the notes (from the "Other" text or a follow-up message), apply them to this step's outputs only, log the round in progress.md, and run the checkpoint again.
- **Berhenti**: leave progress.md as is. Next session resumes from it.

Moving around:
- "ulang step 3", "balik ke struktur": redo that step. Every later step that was `disetujui` becomes `perlu cek ulang`; tell the user which ones and redo them in order, each with its own CEK. Never silently rebuild approved work.
- "lompat ke step 6": allowed only if every earlier step is `disetujui`; otherwise say which one is missing.
- "langsung saja sampai X tanpa berhenti": allowed only when the user says it explicitly. Still produce every step's outputs, mark them `disetujui (otomatis, atas permintaan)`, and show all of them at X's checkpoint.

### Client rounds

Some checkpoints are decided by the client, not the product builder: the concept choice (Step 3) and the revision rounds on the chosen concept (usually after Step 5 and Step 6). For these, the CEK has two stages:
1. **Internal**: the product builder checks first, as with any CEK ("Siap dikirim ke klien" / "Revisi dulu").
2. **Client**: they present it (the compare page, style guide and HI-FI index are written to be client-presentable: formal Indonesian, no internal labels), then come back with the client's decision or feedback. Record it verbatim in progress.md.

Count each batch of client feedback on the chosen concept as one revision round. The PRD package states the limit (Arunika: 2) and that a new direction after choosing is a scope change. When the next round would exceed the limit, or the feedback changes direction, tell the product builder plainly before doing the work; they decide whether it proceeds as a change request. Internal revisions by the product builder do not count as client rounds.

### progress.md

```markdown
# Progress: <Company / product>

Konsep dijanjikan: 2 · Revisi klien: 0 dari 2 · Lebar minimum: 360 px · Bahasa: ID + EN

| Step | Status | Tanggal | Catatan |
|---|---|---|---|
| 1 Profil | disetujui | 2026-10-09 | |
| 2 Struktur | disetujui | 2026-10-09 | revisi 1: tambah halaman Karier |
| 3 Pilihan konsep | menunggu cek | | |
| 4 Design system | belum | | |
| 5 HI-FI Beranda | belum | | |
| 6 HI-FI halaman lain | belum | | |
| 7 Aset | belum | | |
| 8 Cek akhir | belum | | |

## Riwayat revisi
- Step 2, revisi internal (2026-10-09): "tambah halaman Karier" -> ditambah di screens.md dan wireframe 07-karier.html
- Step 3, keputusan klien (2026-10-14): "Konsep B, tapi logo pakai versi biru" -> dicatat di decision.md
```

Statuses: `belum`, `menunggu cek`, `disetujui`, `perlu cek ulang`.

## Output layout

```
DESIGN.md                      # the chosen, adapted system (root: other agents and antislop find it here)
design/
  progress.md                  # step status and revision log
  profile.md                   # PRD read as design needs
  content-needed.md            # company profiles: real content checklist to forward to the company
  screens.md                   # page/screen list (structure contract)
  wireframes/                  # lo-fi, only if generated here
  inbox/                       # DESIGN.md files the user dropped in (manual Refero downloads)
  options/
    compare.html               # side-by-side picker
    A-<slug>/ DESIGN.md SOURCE.md tokens/ preview.html
    B-<slug>/ ...
    C-<slug>/ ...
  decision.md                  # what was chosen, why, what changed from the source
  system/                      # tokens.css, tokens.json, tailwind.preset.js, styleguide.html
  hifi/                        # index.html, one HTML per page, styles/, shots/, NOTES.md
  assets/                      # logo, favicon, icons, photo shot list, image prompts, og image, README.md
  delivery-gate.md             # antislop PASS/FAIL report
```

User-facing files (progress, content-needed, compare page, style guide, decision.md, shot list, assets README, hifi NOTES) go in the user's language. DESIGN.md keeps the standard English section headings so tools can read it.

## Starting or resuming

1. Look for `design/progress.md`. If it exists, read it, tell the user in two lines where things stand ("Step 1-3 sudah disetujui, Step 4 menunggu cek kamu"), and continue from the first step that is not `disetujui`. If that step is `menunggu cek`, show its checkpoint again instead of redoing it.
2. Otherwise this is a fresh start. Find the input: a PRD package folder (`*_prd.md`, `*_sitemap.md`, `*_context.md`, `*_spec.md`), a single `PRD.md`, or ask for the path. Find wireframes if any. For a package, read `references/prd-package.md` and take the concepts promised, revision limit, minimum width and languages from it; put them in progress.md's header line.
3. **antislop**: check whether the `antislop` skill is available. If it is, follow it in *During* mode from Step 5 on. If not, tell the user once how to install it (`npx skills add miqdadbadjuber/anti-slop`, or in Claude Code `/plugin marketplace add https://github.com/miqdadbadjuber/anti-slop` then `/plugin install antislop@anti-slop`), and for this session fetch the single-file version as a read-only reference: `https://raw.githubusercontent.com/miqdadbadjuber/anti-slop/main/antislop.md`. Do not run its install wizard on your own.
4. **Refero MCP**: check for `refero_*` tools (ToolSearch "refero"). Note whether tier 1 is available. See `references/sources.md`.
5. Create `design/progress.md` with every step `belum`, then start Step 1. Mention the antislop and Refero status in Step 1's report, not as a separate stop.

## Step 1: Profil

Read the whole PRD (for a package: context, prd, sitemap, and spec NFR/data model) and write `design/profile.md` following `references/project-profile.md`: type, industry, pages, real photo inventory, languages, surface, users, density, trust, tone, brand constraints, theme need, locale, dials, Design Read line, Refero search phrases. Quote the client's own style words from the brief or the design section; they outrank your inference.

Company profiles: also write `design/content-needed.md` (company-profile.md section 2), the checklist of real content the company must supply. It travels in parallel; later steps use honest placeholders until content arrives.

The question round happens inside this checkpoint: ask the up-to-4 questions the PRD leaves open (for a company profile usually: logo and brand colors? real photos? ID only or ID + EN? tone only if unclear) together with the approval, so the user answers once. Put the profile summary in chat as 6-8 short lines; the file is for reference.

**CEK 1 asks**: Apakah ringkasan ini sudah menggambarkan perusahaannya? Siapa pengunjung utamanya, sudah benar? Ada konten yang sebenarnya sudah ada tapi aku tandai "belum"?

## Step 2: Struktur halaman

With a PRD package, build `design/screens.md` from the sitemap page inventory (Web rows), grouped into templates, each with its states; skip admin pages when the CMS is off the shelf (Strapi, WordPress); flag optional modules (`references/prd-package.md`). Without one, use existing wireframes or the default company-profile sitemap. Then generate lo-fi wireframes per template with `design/wireframes/index.html`, and pick the preview page (the homepage for company profiles). Details in `references/wireframe.md`.

**CEK 2 asks**: Halamannya sudah lengkap? Urutan section di Beranda sudah pas? Modul opsional (misalnya E-katalog) ikut didesain atau tidak? Admin CMS memakai tampilan bawaan, jadi tidak didesain: sudah benar? (Remind them: this is structure only, intentionally plain; the look comes in Step 3.)

## Step 3: Pilihan konsep

Sources in order (`references/sources.md`): Refero MCP if connected, the open catalog (`references/catalog.md`), files in `design/inbox/`. Never fetch styles.refero.design directly: its robots.txt blocks AI agents; the MCP and human downloads are the sanctioned routes.

Shortlist:
1. Gather 5-8 candidates: catalog section 6b by industry for company profiles (section 6 by type key otherwise), plus Refero search results, plus inbox files.
2. Remove hard misfits:
   - photo-first (catalog family E, nike, airbnb) when the company has no strong real photos; this filter matters more than industry (company-profile.md section 4);
   - novelty (dell-1996, nintendo-2001) unless the PRD asks for retro;
   - dark-only systems when the profile has no reason for dark (antislop R-21), unless a light variant is easy to derive; company profiles rarely have one;
   - marketing-only systems for high-density apps, unless the product UI extension can be built from their tokens without guessing.
3. Fetch and read the survivors' DESIGN.md (`scripts/fetch_design_md.sh <slug> design/options/<X>-<slug>`). Judge against the profile: tone match, density, trust, surface.
4. Choose as many as the PRD promises (a package usually says 2 concepts). Without a number, choose 3, or 2 when only 2 genuinely fit; never pad with a bad option. Give each a role (internal reasoning, shown to the product builder, not on the client page):
   - **A "Aman"**: closest to what visitors of this industry expect. Lowest risk.
   - **B "Berkarakter"**: fits just as well, with a more distinctive voice.
   - **C "Berani"**: optional, bolder, from another family, still defensible for these visitors.
   With 2 concepts, use A and B (or A and C when a bolder second option suits the client's words). The options must differ on at least two of: canvas (light / cream / dark), type voice (neutral sans / friendly geometric / serif / mono / heavy), accent temperament (cool / warm / neon / muted), ENERGY dial. Three variations of the same look is not a choice.

Previews, for each option:
1. Light adaptation only: normalize and rename (`references/adapt-design-md.md` steps 1-2) and swap proprietary fonts for their free substitutes (step 4), so the preview shows what they will actually get. If the company already has brand colors and a logo, put them into every preview now (brand color as `primary`, contrast-checked): people judge a style by its colors, so they should see their own, not the source brand's.
2. `python3 scripts/design_tokens.py design/options/<X>/DESIGN.md design/options/<X>/tokens`
3. Build `design/options/<X>/preview.html`: the preview page from `screens.md`, real PRD content, styled only with that option's `tokens.css` and its Do's and Don'ts. Same structure in every option, so the style is the only variable. Main blocks only; this is a sample, not the build.

Then copy `assets/compare-template.html` to `design/options/compare.html` and fill only its JSON block: for each option a client-facing tag ("Konsep A"), a name, three plain-language lines (the impression it gives, why it fits this company and its clients, the honest trade-off), 3-4 swatch hexes, and the preview path. Leave `source` empty on a client-facing page (attribution stays in SOURCE.md and decision.md). Write it in formal Indonesian ("Anda"), since the client reads it. Screenshot every preview at the PRD minimum width (360 by default) and 1440 and look at them: a broken preview kills a good option.

**CEK 3** runs in the two client stages. Open the compare page and summarize each concept in one line in chat, with the internal reasoning (why A is the safe read, why B is the distinctive one).
- Internal: "Siap dikirim ke klien" / "Revisi: ganti salah satu konsep" (back to the shortlist with their notes) / "Berhenti dulu".
- Client: when they come back, ask which concept the client chose, plus any single swap ("Konsep B tapi warna aksennya biru perusahaan", "A tapi versi gelap"). Do not merge two systems wholesale; explain in one sentence that mixing breaks the consistency being chosen, and offer one swap instead. Ask about the logo (antislop R-23) only if Step 1 did not settle it: "pakai logo yang sudah ada" / "buatkan logo teks dari nama perusahaan" / "biarkan placeholder dulu".

The choice belongs to the client; do not pick for them. You may tell the product builder which you would recommend and why, so they can advise the client.

## Step 4: Design system

Run the full adaptation on the chosen option (`references/adapt-design-md.md` steps 1-9): rename, new accent (or their brand color), free fonts, new identity motif, company-site or product UI extension, theme, locale, dials, decisions, provenance. Write it to the project root as `DESIGN.md`. If a root DESIGN.md already exists, show what will change and confirm before overwriting.

```bash
python3 scripts/design_tokens.py DESIGN.md --check
python3 scripts/design_tokens.py DESIGN.md --contrast
python3 scripts/design_tokens.py DESIGN.md design/system      # tokens + styleguide.html
```
The first two must exit 0. Write `design/decision.md`: chosen option, the alternatives and why they lost, what was changed from the source, swaps the user asked for.

The user cannot review DESIGN.md itself; they review `design/system/styleguide.html`, the visual page of every color, type role, corner, spacing step and component. Screenshot it and check it first.

**CEK 4 asks**: Warna dan hurufnya sudah terasa "perusahaan ini"? Tombol dan kartunya sudah pas? Ada warna yang terlalu ramai atau terlalu pucat? (Tell them tweaks are cheapest now: changing a color here updates every page later.)

## Step 5: HI-FI Beranda

Build the homepage only, following `references/hifi.md` and, for company sites, `company-profile.md` section 5. Set up `design/hifi/` (tokens copied from `design/system/`, shared `app.css`, shared header and footer). Everything the other pages will reuse is decided here: header, footer, section rhythm, buttons, cards, photo treatment, CTA. Real or honestly marked content; sections that would only exist with fake content (stats, testimonials, client logos) are left out until real content arrives. Screenshot at the PRD minimum width (360 by default), 768 and 1440, and fix what you see before showing.

**CEK 5 asks**: Kesan pertamanya sudah sesuai? Header, footer, dan tombol utama sudah oke (karena ini dipakai di semua halaman)? Ada teks yang salah atau kurang? Then ask how to continue Step 6: "semua halaman sekaligus" (faster) or "satu per satu" (more control). If the product builder wants to show the homepage to the client before the other pages, treat that as a client round.

## Step 6: HI-FI halaman lain

Build the remaining templates and pages from `screens.md` with the approved homepage patterns: shared header/footer, forms (with a PRD backend flow: simulate every defined state; without one: send via WhatsApp or email), map, language switcher, SEO basics, every state listed in `screens.md`, working links between pages, responsive from the PRD minimum width, accessible. Screenshot everything and look at the shots. Update `design/hifi/index.html` with every page and a thumbnail.

- **Sekaligus**: build all, one CEK for all pages, with a one-line note per page.
- **Satu per satu**: one page, one CEK, repeat. progress.md tracks the pages inside Step 6 in its Catatan column.

**CEK 6 asks** (per page or for all): Isi dan urutannya sudah benar? Formulir sudah bisa dicoba, termasuk tampilan error dan berhasil? Ada halaman yang terasa beda sendiri dari Beranda? After the internal check, the full set usually goes to the client: each batch of client feedback is one revision round (see Client rounds).

## Step 7: Aset

Follow `references/assets.md`. Start with the logo if Step 3 asked for one: make it, show it, and get a yes before using it anywhere (part of this CEK, logo first). Then: favicon and app icons, one icon set chosen to match the system, the photo shot list for company profiles (real photos, never AI images of "our team" or "our projects"), image prompts only for abstract or illustrative slots, social preview image, tokens copied into `design/assets/tokens`. List everything in `design/assets/README.md` with status final / placeholder.

**CEK 7 asks**: Logonya oke? Daftar foto yang perlu diambil sudah masuk akal untuk perusahaannya? Ada aset lain yang dibutuhkan (misalnya kartu nama, banner)?

## Step 8: Cek akhir

Run antislop's Delivery Gate over the HI-FI and assets: all four blocks, one PASS/FAIL line per item, each PASS with concrete evidence (which file, what was clicked, which contrast check). Fix every FAIL, then re-run. Save the report to `design/delivery-gate.md`. Do not present the work as finished while any item fails.

Final report in the user's language:
- how to view it (`design/hifi/index.html`; the style guide and compare page for reference);
- what is still placeholder and needs real content (point to `content-needed.md` and the shot list);
- next steps: deploy the static files as they are or rebuild in a CMS the company will edit (company-profile.md section 6); for apps, build in the real stack (`designagent:design-to-code` if installed); or push to Figma for a designer.

Mark Step 8 `disetujui` when they confirm.

## Changes after the flow is done

Each change reopens only what it touches, with its own CEK:
- **New page**: add to `screens.md` (CEK 2 for the list), build it (CEK 6 for that page), re-run Step 8 on it.
- **Real content arrived** (photos, numbers, testimonials): swap placeholders, add back the proof sections that were left out, update `content-needed.md`, show the affected pages (CEK 6), re-run Step 8.
- **Tweak the system** (accent, font, radius): edit `DESIGN.md`, regenerate `design/system/` (CEK 4), copy tokens into `design/hifi/styles` and `design/assets/tokens`, screenshot the pages (one CEK for all), re-run Step 8. Pages update without rebuilding because they only use tokens.
- **Ganti gaya**: back to Step 3 with the old options kept; Steps 4-8 become `perlu cek ulang`.

## Bundled files

- `references/prd-package.md`: reading the PRD package (context, prd, sitemap, spec): where concepts, revision limit, widths, pages, states, optional modules and performance budget come from; Arunika worked example.
- `references/company-profile.md`: the default project type: sitemap, content intake, styles by industry, photo rules, build rules, deploy.
- `references/project-profile.md`: PRD fields to extract, type keys, how to ask, profile template.
- `references/wireframe.md`: using existing wireframes or generating lo-fi ones, choosing the preview page.
- `references/sources.md`: Refero MCP, open catalog, user inbox, writing from scratch, and the robots/terms notes.
- `references/catalog.md`: index of all 74 open-catalog DESIGN.md files by family, website type, and company-profile industry.
- `references/adapt-design-md.md`: normalize, de-brand, font substitutes, company-site and product UI extensions, validation.
- `references/hifi.md`: HI-FI build rules, process, handoff.
- `references/assets.md`: what assets to make (incl. photo shot list), how, and when to ask first.
- `scripts/fetch_design_md.sh`: fetch one open-catalog DESIGN.md with attribution.
- `scripts/design_tokens.py`: DESIGN.md frontmatter to tokens.css / tokens.json / tailwind.preset.js / styleguide.html; `--check`; `--contrast` (WCAG).
- `scripts/screenshot.sh`: headless Chrome screenshots at given widths or exact sizes.
- `assets/compare-template.html`: the option picker page.
