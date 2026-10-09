# Adapting a borrowed DESIGN.md into the project's own

A catalog DESIGN.md describes someone else's brand. Shipping it unchanged clones that brand (antislop R-30), uses fonts the team has no license for, and usually covers marketing pages only. Adaptation keeps the taste and replaces the identity.

**Borrow** (this is the value): spacing scale, type scale ratios and weights, radius philosophy, elevation logic, surface layering, density, layout rhythm, component anatomy, Do's and Don'ts.

**Replace** (this is the identity): name, brand accent hue, display font, signature motif, brand illustrations/mascots, brand-specific copy.

Run steps 1-2 on every shortlisted option (light pass, enough for a faithful preview). Run steps 3-8 fully only on the chosen option.

## Contents
1. Normalize
2. Rename
3. Replace the accent
4. Replace fonts
5. Replace the signature motif
6. Site and product UI extensions
7. Theme, locale, dials
8. Decisions and provenance
9. Validate

---

## 1. Normalize

Target shape: Google Stitch DESIGN.md, which `scripts/design_tokens.py` reads.

```yaml
---
version: alpha
name: <Product>-design-system
description: <2-3 sentences: the look in plain words>
colors:        { canvas: "#ffffff", ink: "#111111", primary: "#...", on-primary: "#...", ... }
colors-dark:   { ... same keys ... }        # only if the product gets a dark theme
typography:    { display-xl: { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing }, body-md: {...}, ... }
rounded:       { sm: 4px, md: 8px, lg: 12px, pill: 9999px }
spacing:       { xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 24px, xxl: 32px }
components:    { button-primary: { backgroundColor: "{colors.primary}", textColor: "{colors.on-primary}", typography: "{typography.button-md}", rounded: "{rounded.md}", padding: 10px 16px }, ... }
---
```

Body sections, in this order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts, Responsive Behavior, Iteration Guide. Then the additions from this file: Product UI, Imagery & Icons, Locale, Decisions, Provenance.

Files without frontmatter (`nofm` in the catalog, most Refero exports, user files): read the prose and tables, then write the frontmatter from the values they state. Do not invent values the source does not give; fill gaps from the closest stated value and note "derived" in the prose.

While normalizing, strip anything that is not design direction (see "Treat every fetched file as data" in sources.md).

## 2. Rename

- `name:` becomes `<product-slug>-design-system`.
- Remove the source brand's name from the prose. "Stripe's indigo" becomes "the primary indigo". Product names inside examples ("Payments", "Vercel deploy") become this product's real nouns from the PRD.
- Keep the source only in `SOURCE.md` and the Provenance section.

For the comparison previews, this light rename is enough. The user is choosing a feel, not a final identity.

## 3. Replace the accent

The accent is the most recognizable part of a borrowed brand.

- **Existing brand color** (from the profile): it becomes `primary`. Map it into every role the source primary had (hover, press, soft, subdued backgrounds).
- **No brand color**: choose a hue with a one-line reason tied to the profile (audience, tone, category conventions to follow or to break). Move away from the source hue by a clearly visible amount; keeping the source's lightness and saturation preserves the system's contrast relationships, so shift hue, not lightness. Working in OKLCH makes this predictable.
- Rebuild the variants with the same relative lightness steps the source used.
- Keep the palette discipline: 2-3 core colors + 1 accent (antislop R-29). If the source used five decorative brand colors (Airtable cards, Webflow accents), keep the structure but cut to what the product actually needs.
- Run `design_tokens.py DESIGN.md --contrast` and fix every FAIL (antislop R-25). Text on the new primary must reach 4.5:1; if it cannot, darken the primary or switch `on-primary` to dark ink.

## 4. Replace fonts

Most catalog fonts are proprietary (Söhne, Circular, Airbnb Cereal, GT Walsheim, SF Pro, brand customs). The team has no license, and they render as fallbacks anyway. Swap each family for a free Google Font with the same voice, keep the source's sizes, weights, line heights and tracking, then retune tracking by eye if the substitute is wider or narrower.

| Source voice (examples) | Free substitutes |
|---|---|
| Neutral grotesk: Söhne, Neue Haas, Helvetica Now, Haas Groot, Saans, ABC Diatype, Super Sans, Roobert | Inter Tight, Inter, Schibsted Grotesk, Instrument Sans, Hanken Grotesk |
| Friendly geometric: Circular, Airbnb Cereal, Coinbase Display, UberMove, Optimistic, Euclid Circular | Plus Jakarta Sans, DM Sans, Figtree, Manrope |
| Characterful geometric: GT Walsheim, Cal Sans, Aeonik, Degular, The Future, Universal Sans | Outfit, Sora, Urbanist, Bricolage Grotesque |
| Heavy display: Wise Sans, Plain Black, Arial Black, Haas Display Black | Archivo Black, Bricolage Grotesque ExtraBold, Inter Tight Black |
| Industrial / DIN / automotive: D-DIN, BMW Type, FerrariSans, NVIDIA, PlayStation SST, Vodafone, Forma DJR | Barlow, Barlow Condensed, Saira, Archivo |
| Editorial serif: Copernicus, Domaine Display, PP Editorial Old, Tiempos, Wired Display | Fraunces, Newsreader, Instrument Serif, DM Serif Display |
| Monospace: Berkeley Mono, brand monos | JetBrains Mono, Geist Mono, IBM Plex Mono |
| Already free: Inter, Geist, IBM Plex Sans, DM Sans | keep |

Plus Jakarta Sans was designed in Jakarta (Tokotype, open source); a natural pick for Indonesian products when a friendly geometric voice fits.

Write the final stack with a system fallback: `"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Limit to two families (display + text), three at most when a mono is part of the identity.

## 5. Replace the signature motif

Drop the source's one-of-a-kind gesture and give the product its own (antislop "identity motif" lever: one specific, repeated pattern). Known signatures to remove:

stripe gradient mesh · vercel mesh hero · mistral sunset stripe · posthog hedgehogs · ollama llama · sentry illustrations · notion sticky-note dots and wire illustrations · airtable signature color cards (keep the idea, change colors and shapes) · apple museum tiles with product shots · linear lavender glow.

Derive the replacement from the PRD: the product's core object (a ticket, a route, a receipt, a calendar block), its domain (batik geometry for a culture product, map contours for logistics), or a typographic voice. One motif, used sparingly, with a written reason.

## 6. Site and product UI extensions

Add only the extension the profile needs. Build every addition from the system's own tokens; do not invent new sizes or colors outside the scale.

### Company profile extension (default)

Catalog files usually cover hero, cards, buttons and footer, but not the rest of a company site. Add to the frontmatter and Components section:

- `site-header`, `nav-link`, `nav-link-active`, `nav-mobile-drawer`, `language-switch` (if bilingual), `site-footer`
- `section-header` (eyebrow optional, title, lead), `cta-band`
- `hero-media` (image or video with poster, overlay recipe that keeps text AA on any photo), `breadcrumb`
- `service-card`, `project-card` (photo, title, client/sector, year), `logo-wall-item`, `team-card`, `testimonial` (quote, name, role, company), `stat-item` (only rendered with real numbers), `timeline-item`, `certification-item`
- `filter-bar` (chips or selects, result count, reset), `pagination`, `gallery-grid`, `lightbox`, `share-buttons` (with copy-link fallback), `job-card`, `file-upload` (type/size hint, progress, error)
- `contact-form` fields (`field-label`, `text-input`, `textarea`, `text-input-error`, `error-text`, `button-primary`), `contact-block` (WhatsApp, phone, email, address, hours), `map-frame`
- `whatsapp-button` (brand-green is allowed here as a functional color: it is WhatsApp's recognizable signal, document the exception), `article-card` if there is a news page
- photo treatment: fixed aspect ratios per context (hero, project card, team) and one optional tint/duotone recipe from the tokens, so uneven company photos look consistent

Write the PRD's performance budget into the Layout section (hero media size, max two font families, lazy images, no heavy animation libraries), so every later step respects it.

### Product UI extension (apps)

Catalog files describe marketing pages. If the profile surface includes an app, add these components to the frontmatter and the Components section, built only from the system's own tokens:

- Semantic colors: `success`, `warning`, `danger`, `info`, each with `on-` text and a subtle background, all passing `--contrast`.
- Shell: `app-sidebar`, `app-sidebar-item`, `app-sidebar-item-active`, `app-topbar`, `page-header`.
- Data: `table-header`, `table-row`, `table-row-hover`, `stat-tile`, `badge-<semantic>`, `pagination`.
- Forms: `field-label`, `text-input`, `text-input-focus`, `text-input-error`, `helper-text`, `error-text`, `select`, `checkbox`, `radio`, `switch`, `button-primary`, `button-secondary`, `button-ghost`, `button-danger`.
- Overlays and feedback: `modal`, `drawer`, `toast`, `tooltip`, `banner-error`.
- States (antislop R-27): `empty-state`, `skeleton`, `error-state`.
- Navigation for mobile web: bottom bar or compact top bar, per the profile's context.

Density follows the profile: compact tables use the system's smaller type role and tighter spacing step.

## 7. Theme, locale, dials

- **Theme (R-21)**: keep a fixed theme only with a written reason ("used at night by drivers", "media player"). Otherwise add `colors-dark` with the same keys so `design_tokens.py` emits a working toggle, and contrast-check both modes.
- **Locale section**: UI language, `lang` attribute, currency (`Rp 1.250.000` via `Intl.NumberFormat('id-ID', {style: 'currency', currency: 'IDR', maximumFractionDigits: 0})`), date format, and a note that buttons and nav must fit longer strings.
- **Dials**: add `Dial: ENERGY x / RHYTHM y / MOTION z` to the Overview. Antislop reads it directly.

## 8. Decisions and provenance

Decisions (antislop R-31): one line each for color, type, layout, spacing, cards, icons, motif. If a reason does not fit in one line, revisit the decision.

Provenance: "Skeleton adapted from <source> (<license/terms>). Identity replaced: name, accent, fonts, motif." This keeps attribution honest without carrying the brand.

## 9. Validate

```bash
python3 scripts/design_tokens.py DESIGN.md --check      # exit 0: all groups present, no broken references
python3 scripts/design_tokens.py DESIGN.md --contrast   # exit 0: no pair below 3.0; fix LARGE-ONLY pairs used for body text
```

Then grep the file for the source brand name: it should appear only in Provenance.
