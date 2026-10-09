# Company profile websites

The default project type for this skill. A company profile ("compro") is a small marketing site whose job is to make a real company look credible and easy to contact. It is content-led, low density, photo-dependent, and the place where AI slop does the most damage: invented numbers, fake testimonials, borrowed client logos, stock "team" photos. Credibility is the product, so honesty is the design.

## Contents
1. Sitemap and sections
2. Content intake (real content first)
3. Choosing styles by industry
4. Photos decide the style
5. Build rules specific to company profiles
6. Handoff and deploy

---

## 1. Sitemap and sections

Start from this default and cut what the PRD does not need. Five pages is typical; a one-page site is fine for small companies.

| Page | Sections (top to bottom) | Notes |
|---|---|---|
| Beranda (Home) | hero (who we are, for whom, one CTA) · services summary · proof (real clients, projects, certifications) · about teaser · featured projects · CTA band · footer | the preview screen for the option comparison: hero + the next two sections |
| Tentang Kami | story / history · Visi & Misi · values · leadership or team · legality and certifications (NIB, ISO, memberships) · timeline | Visi & Misi is expected by Indonesian corporate readers; keep it short and real |
| Layanan / Produk | list with one-line outcome each · detail page or expandable detail per service | write services as what the client gets, not internal jargon |
| Proyek / Portofolio | filterable grid (by sector or year) · case detail: client, scope, year, location, photos, result | only projects the company can name publicly |
| Klien & Mitra | logo wall | only logos the company has permission to show |
| Berita / Artikel | list · article page | optional; skip if nobody will post |
| Karier | open roles or "kirim CV ke" email | optional |
| Kontak | form · WhatsApp · phone · email · address · map · office hours | the page that converts; make it the easiest to use |
| Footer (every page) | legal name (PT ...), address, contacts, social links, sitemap links, copyright year | |

Global: header with logo + nav + one CTA (usually "Hubungi Kami" or WhatsApp); language switch if bilingual.

## 2. Content intake (real content first)

Before HI-FI, write `design/content-needed.md` in the user's language: a checklist the product builder can forward to the company. Group by page. Each line: item, why it is needed, status (`ada` / `belum` / `placeholder dulu`).

Must be real or visibly marked as placeholder (antislop R-17, R-18, R-23, R-36, R-38):
- legal company name, year founded, address, phone/WhatsApp, email, office hours
- logo files and brand colors (if any)
- services list and short descriptions
- projects: name, client (if allowed), year, location, photos
- client and partner logos, with permission to display
- testimonials: exact quote, name, role, company, with consent
- numbers ("15 tahun", "200+ proyek"): only with a source the company stands behind
- team: names, roles, photos, with consent
- certifications and licenses: name and number

Do not block on this list. Build with honest placeholders (`[FOTO PROYEK: jembatan, 16:9]`, `[ANGKA ASLI]`, `[LOGO KLIEN]`) and leave out sections that would only exist with fake content: a site with no testimonial section beats one with invented testimonials.

## 3. Choosing styles by industry

The open catalog is tech-heavy. Map the company's industry to catalog families with `catalog.md` section 6b. Rules of thumb:
- **Trust-first industries** (finance, legal, health, government suppliers, B2B industrial): family A or restrained B. Calm, plenty of whitespace, one accent.
- **Experience industries** (hospitality, F&B, property, creative, events): family B or E, but E only with strong real photos.
- **Technical industries** (IT services, engineering, manufacturing): family A, or C with a light variant. Dark-only rarely fits a company profile (R-21): visitors include older decision makers reading on phones in daylight.
- **Existing brand colors are common**: most companies already have a logo and colors. The borrowed system then contributes structure, type and rhythm, and the brand color becomes `primary` (adapt-design-md.md step 3).

## 4. Photos decide the style

Ask early: does the company have real photos of its office, team, projects, products? The answer filters the shortlist more than industry does.

- **Strong real photos**: photo-first systems (family E, nike, airbnb) become viable and often the most impressive option.
- **Some photos, uneven quality**: systems where photos sit in cards or framed blocks (family A/B), not full-bleed heroes. Treat photos consistently (same aspect ratio, same crop style, optional duotone/tint from tokens) to hide uneven quality.
- **No photos yet**: typography- and color-led systems (claude, wired, cal, zapier, ibm). Plus a shot list (assets.md) so the company can produce photos that fit later.

Never fill a company profile with AI-generated or stock images presented as the company's own people, office, or projects. That is a fabricated claim (R-36). Generated imagery is acceptable only for abstract backgrounds, patterns, or illustrations clearly not depicting the company.

## 5. Build rules specific to company profiles

These add to `hifi.md`.

- **Multi-page**: one HTML file per page, shared header and footer kept identical (copy from one source partial; if the screens are many, a tiny build-free include via JS is acceptable but prefer plain duplication for a handful of pages). Every nav link points to a page that exists (R-24).
- **Forms when the PRD defines a backend** (PRD packages usually do: reCAPTCHA, storage, email): the HI-FI is a prototype, so simulate every state the sitemap lists (idle, validating, submitting, success, validation error, submission/upload error) behind the `?state=` switcher, with validation messages next to their fields. Do not pretend to send. CV upload shows type and size limits before upload.
- **Contact that works without a backend** (R-26), only when there is no backend: the form validates on the client, then composes the message into a WhatsApp link (`https://wa.me/62<number>?text=<encoded>`) or a `mailto:`; label which one happens. If the company has a form service account (Formspree, Google Forms, their own endpoint), use it instead. Never a submit button that does nothing.
- **WhatsApp**: Indonesian visitors expect it. One clear WhatsApp CTA (header or contact block). A floating button only if the profile's tone allows it, and never covering content on mobile.
- **Map**: `https://www.google.com/maps?q=<encoded address>&output=embed` in an iframe with `loading="lazy"` and a title, plus a plain "Buka di Google Maps" link.
- **Bilingual (ID/EN)** when asked: separate files per language (`/en/...`) with a language switch linking to the same page in the other language, `lang` set per file, and `hreflang` links. Do not machine-translate silently; mark EN copy as draft for review.
- **SEO basics** (cheap, expected of a company site): unique `<title>` and meta description per page, one `h1` per page, alt text on every image, Open Graph tags with the og image from assets, `Organization` or `LocalBusiness` JSON-LD with real data only.
- **Hero media**: when the PRD allows banner video, design the hero so the poster image alone works (video blocked, slow connection, reduced motion), text and CTA stay readable over both, and video stays within the PRD size budget.
- **Gallery**: project and service galleries need a consistent grid, a keyboard-operable lightbox (arrows, Escape), alt text, and an image-failed fallback that keeps captions.
- **Weight**: hero images ≤ 300 KB, `loading="lazy"` below the fold, explicit width/height, two font families at most with `display=swap`. Many visitors are on mobile data.
- **Proof sections**: stats band, logo wall, testimonials appear only with real content or are omitted from the build (keep them in the wireframe with a note).

## 6. Handoff and deploy

For a company profile the HI-FI is close to the real site. Offer, in the closing message:
- deploy the static files as they are (Netlify Drop, Vercel, GitHub Pages, or the company's cPanel hosting);
- or rebuild in a CMS the company will edit (WordPress, Webflow, Framer) using DESIGN.md and tokens as the spec;
- or push to Figma for a designer's review.

Who will update the content after launch decides which one; ask only at the end.
