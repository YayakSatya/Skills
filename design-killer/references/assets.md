# Generating assets from the chosen DESIGN.md

Assets are everything outside the screens that the product needs to look finished: tokens for developers, logo, favicon, icons, images, social preview. All of them derive from DESIGN.md so they match without anyone having design sense.

## Ask first (antislop R-23)

Identity assets need the owner's confirmation. Ask once, bundled with the profile questions (SKILL.md Step 1) or the style choice (Step 3), in plain words:

- **Logo**: "Sudah punya logo?" Options: use my file (path) / make a simple text logo from the product name (recommended default) / leave a `[LOGO]` placeholder.
- **Photos of people or places**: real ones available? Otherwise honest placeholders plus prompts.
- **Illustrations**: wanted at all? Many internal tools are better without.

Tokens, icons, favicon-from-confirmed-logo, and social preview need no extra question.

## Outputs

All under `design/assets/`, listed in `design/assets/README.md` with: file, where it is used, status (final / placeholder / needs real content).

### 1. Tokens (always)
```bash
python3 scripts/design_tokens.py DESIGN.md design/assets/tokens
```
`tokens.css` (CSS variables, `.type-*`, `.c-*`, dark mode), `tokens.json` (resolved values for any tool), `tailwind.preset.js`.

### 2. Logo (only after confirmation)
- `logo-wordmark.svg`: the product name set in the DESIGN.md display font, weight and tracking, in `ink`; plus `logo-wordmark-inverse.svg`. Use SVG `<text>` with the font stack and note in README that a designer should convert text to outlines before print use.
- `logo-mark.svg`: a simple mark (1-3 shapes) derived from the identity motif or the product's first letter, sized on a 24px grid, readable at 16px. Plain geometry, no gradients unless DESIGN.md uses them.
- Show both to the user before using them in HI-FI. If they reject, fall back to the wordmark only.

### 3. Favicon and app icons
- `favicon.svg` from the mark (or first letter on the primary color).
- PNGs by rendering a tiny HTML page with the mark centered on the brand color:
  ```bash
  scripts/screenshot.sh design/assets/icon.html design/assets 180x180 512x512 32x32
  ```

### 4. Icons
Pick one open-source icon set that matches DESIGN.md (stroke weight, corner roundness, fill vs outline). Record the choice and reason in DESIGN.md under Imagery & Icons.

| Set (license) | Character | Fits |
|---|---|---|
| Lucide (ISC) | 2px stroke, rounded joins, neutral | most light/clean and warm systems |
| Phosphor (MIT) | 6 weights incl. thin/duotone, friendly | playful or editorial systems; thin weight for luxury |
| Tabler (MIT) | 2px stroke, slightly geometric, huge set | dense dashboards, internal tools |
| Heroicons (MIT) | outline + solid, compact set | simple SaaS |
| IBM Carbon icons (Apache-2.0) | 16/20/32px grid, squared | enterprise, ibm-based systems |

Copy only the icons the screens use into `design/assets/icons/` as inline-able SVG. Pinned CDN paths that work:
- `https://unpkg.com/lucide-static@0.460.0/icons/<name>.svg`
- `https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2.1.1/assets/<weight>/<name>.svg`
- `https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/<name>.svg`

Set `stroke="currentColor"` / `fill="currentColor"` so icons take token colors. Icons need a purpose (antislop R-04): no decorative icon in every card title.

### 5. Images and illustrations
- For every image slot in the HI-FI, write an entry in `design/assets/image-prompts.md`: slot id and file it appears in, aspect ratio and pixel size, subject (from the PRD), style (from DESIGN.md: palette tokens as words and hex, lighting, composition, texture), and an avoid list (text in image, fake UI, stock clichés, people presented as real customers).
- Company profiles: generated images only for abstract backgrounds, patterns or illustrations. Never generate people, offices, products or projects presented as the company's own; use placeholders plus the shot list instead.
- If an image-generation tool is available in the session (for example the Figma MCP's image generation, or an imagegen skill the user has), offer to generate and save to `design/assets/images/`, then swap placeholders. Otherwise keep labeled placeholders in the HI-FI (a token-colored box with `[FOTO: ...]` text in the UI language).
- Illustrations: only if the user wanted them. Prefer a simple style buildable from the tokens (flat shapes in the palette) over imitating the source brand's illustrators.

### 5b. Photo shot list (company profiles)
Real photos make or break a company profile, and AI images of "our team" or "our projects" are fabricated claims (R-36). Write `design/assets/photo-shot-list.md` in the user's language: a brief the company can hand to whoever shoots photos (a staff member with a good phone is enough). For each slot: what to shoot, where it appears, orientation and aspect ratio, light (from DESIGN.md: bright and airy, warm, high contrast...), framing, what to avoid (cluttered desks, logos of other brands, people who did not consent). Include phone tips: daylight, clean lens, landscape for heroes, shoot extra.

### 6. Social preview
`og-image.html` at 1200x630 using tokens, wordmark, and the product's one-line purpose, then:
```bash
scripts/screenshot.sh design/assets/og-image.html design/assets 1200x630
```

### 7. Empty-state art
Reuse the icon set at large size on a subtle surface token. Cheap, consistent, and easy for developers to rebuild.
