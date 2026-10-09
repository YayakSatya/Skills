# Reading a PRD package (Timedoor format)

Most projects arrive as a folder generated from a client brief, not a single PRD.md. Example: `PRD Compro/` for PT Arunika Bangun Persada.

```
<slug>_context.md     # client identity, scope inventory, discovery decisions, business rules, assumptions
<slug>_prd.md         # personas, journeys, FR user stories, acceptance criteria, edge cases, walkthroughs
<slug>_sitemap.md     # IA diagrams, PAGE INVENTORY with states, navigation per role
<slug>_spec.md        # tech stack, data model, FR detail, NFR, module list
<slug>_openapi.yaml   # API contract (rarely needed for design)
<brief>.md            # optional: the client's original brief, often with a style reference in their words
```

Read context, prd and sitemap fully. Read spec sections on NFR and data model. Skim openapi only if a card or detail page needs a field the others do not list.

## Where each design input lives

| Need | Source | Example (Arunika) |
|---|---|---|
| Company, industry, one-line purpose | context §1-2 | kontraktor gedung & interior, Surabaya, website lama WordPress lambat |
| Client's own style words | brief "Referensi gaya", context §7.x "Desain UI" | "website kontraktor yang bersih dan banyak foto besar"; "mengutamakan foto proyek berukuran besar, hierarki bersih, kontras terbaca, CTA konsultasi jelas" |
| **Number of concepts promised** | context §6 discovery row "Desain", FR "Desain Responsif" | 2 konsep awal |
| **Client revision limit** | same, plus business rules | maks 2 putaran revisi; ganti arah setelah konsep dipilih = perubahan scope |
| Who chooses | context §7.x "Desain UI" | klien memilih satu konsep |
| Breakpoints, minimum width | NFR compatibility, FR desain | mulai 360 px; desktop, tablet, mobile |
| Accessibility bar | NFR | WCAG 2.1 AA, focus terlihat, label form |
| Performance budget | NFR performance, context §9 | PageSpeed ≥80 mobile/≥90 desktop on 5 main pages, LCP ≤2.5 s, hero video MP4 ≤10 MB with poster, lazy images |
| Languages | context scope "Lokalisasi" | ID + EN, EN as machine draft edited by admin |
| Pages to design | sitemap §2 page inventory, rows with Platform = Web | 23 web pages incl. 4 service details, 404, privacy |
| States per page | sitemap §2 "States" column | Portofolio: loading, success, filtered, empty, error |
| Navigation, header, footer | sitemap §3 | header: 7 links + language switcher + CTA konsultasi; footer: kantor, workshop, kontak, WA, privasi |
| Fields shown on cards and detail pages | prd FR CRUD lists, spec data model | Project: judul, kategori, tahun, kota, lokasi, luas, durasi, nilai (opsional), galeri, testimoni |
| Optional modules | context scope "Optional", FR tagged [OPTIONAL] | E-katalog: design only if the add-on is taken |
| Admin / CMS | spec tech stack, sitemap CMS tree | Strapi: its own admin UI, no custom admin design needed |
| Content and media the client supplies | context assumptions, out of scope | client provides photos, video, logos, certificates, testimonials; photo/video production is out of scope; old WordPress media migrates |
| Edge cases that need a visual state | prd §6 edge cases | video autoplay blocked shows poster; manager photo fails shows name + role with fallback; clipboard denied shows URL to copy |

## What this changes in the workflow

- **Profile (Step 1)**: almost everything is in the package. Usually only two questions remain: the logo/brand colors file, and whether sample photos from the old site or the client are available. Ask whether the optional add-ons were taken only if the package does not say.
- **Structure (Step 2)**: do not invent a sitemap. Build `screens.md` from the page inventory, Web rows only. Group pages into **templates** (one list template, one detail template, the four service details share one template), and carry each page's states. Skip ADMIN rows when the CMS is off the shelf (Strapi, WordPress, Payload, Sanity); say so at CEK 2. Mark optional pages and ask at CEK 2 whether to include them. Wireframe templates, not every page.
- **Concepts (Step 3)**: offer exactly the number promised in the package (2 here), labeled "Konsep A" / "Konsep B" with a name, because the compare page goes to the client. Keep the internal Aman/Berkarakter reasoning for the product builder's chat summary.
- **Client approval**: the product builder checks first (internal CEK), then presents to the client, then records the client's decision. See SKILL.md "Client rounds".
- **Revision rounds**: count client revision rounds against the package limit in `progress.md`. When the limit is reached, or the client asks for a new direction after choosing, say plainly that the package treats it as a scope change (business rule), and let the product builder decide.
- **Breakpoints**: screenshot at the package minimum (360) plus 768 and 1440.
- **Forms**: the package defines a real backend flow (reCAPTCHA, storage, email). The HI-FI is a prototype: simulate every defined state (idle, validating, submitting, success, error, upload error) with the dev state switcher; do not fake a send. Show the honeypot nowhere.
- **Performance**: write the budget into DESIGN.md (Layout or a "Performance" note): hero video optional with poster, two font families max, no heavy animation libraries, images sized per breakpoint. A concept that only works with a 40 MB hero video fails the package.
- **Handoff**: the build is Next.js + headless CMS, so the developers need DESIGN.md, `design/system/` tokens (incl. `tailwind.preset.js`), the style guide, and the HI-FI as reference. The HI-FI itself is not the production site.

## Worked example: Arunika (abridged)

- Industry row (catalog 6b): Konstruksi, engineering. Defaults ibm, hp, nvidia; with strong photos spacex, bmw.
- Client words point to photo-led ("banyak foto besar"), but photos come from the old WordPress site and the client (production out of scope). Ask for 5-10 sample project photos before Step 3; if they are strong, one concept can be photo-led (bmw-like structure, de-branded), the other typographic and systematic (ibm-like), on different canvases and type voices.
- Preview page: Beranda (banner with poster, angka pencapaian only with real numbers, layanan, proyek unggulan, logo klien, CTA konsultasi).
- Templates: Beranda, Tentang Kami, Layanan list, Layanan detail (x4), Portofolio list (filters), Proyek detail (gallery), Artikel list, Artikel detail, Karier list, Lowongan detail, Form lamaran + konfirmasi, Kontak + form konsultasi, Kebijakan Privasi, 404. Optional: E-katalog list, detail.
