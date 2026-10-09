# Wireframes: use, or make lo-fi ones

The wireframe is the **structure contract**: which screens exist, what is on each, in what order, how screens link. DESIGN.md is the **look contract**. Keeping them separate is what lets a non-designer change the look without redoing the structure.

## If the PRD package has a sitemap

Use its page inventory instead of inventing pages (`prd-package.md`). In `screens.md`, add a Template column and a States column; list optional modules in their own section. Draw lo-fi wireframes per template, filling them with one real instance (e.g. "Detail Layanan" drawn with Konstruksi Gedung).

## If wireframes exist

Accept any form: HTML files, images/screenshots, a Figma link, a markdown screen list, a FigJam board. Read them and write `design/screens.md`:

```markdown
| # | Screen | Purpose (from PRD) | Main content blocks, top to bottom | Links to |
|---|---|---|---|---|
| 1 | Dashboard | see today's orders at a glance | page header, 3 stat tiles, orders table, empty state | 2, 4 |
```

Images: describe what you see; ask only if a block is truly unreadable. Figma links: use the Figma MCP read tools if connected (`get_metadata`, `get_screenshot`).

## If there are none

Generate lo-fi wireframes from the PRD. Keep them deliberately ugly so nobody mistakes them for the design.

1. Screen inventory: for a company profile, start from the default sitemap in `company-profile.md` section 1 and cut pages the PRD does not need. For apps, map every user story / feature to a screen or a state of a screen, merging where one screen serves several stories. Include what PRDs forget: for company profiles a 404 page, the contact form's sent/failed states, and a privacy note if the form collects personal data; for apps sign in, empty first-use state, error, settings, confirmation.
2. For each screen, list content blocks top to bottom with real headings and labels from the PRD (no lorem ipsum).
3. Write `design/wireframes/<nn>-<screen>.html`: grayscale, `system-ui`, boxes with 1px borders, real text, `[IMAGE: what]` and `[DATA: what]` boxes, working links between screens. One shared `wireframe.css` under 40 lines. Mobile-first single column that widens at 1024px.
4. Write `design/wireframes/index.html`: the flow, a list of screens with one-line purposes and links.
5. Write `design/screens.md` (table above).

The screen list and wireframes are reviewed at CEK 2 (SKILL.md checkpoint protocol), e.g. "Ini 7 halaman yang aku tangkap dari PRD, ada yang kurang?". This is the cheapest moment to catch a missing page, so wait for the approval before Step 3.

## Choosing the preview screen

The option comparison renders one screen in every candidate style. Pick the screen that is most representative, not the prettiest:
- company profiles: Beranda (Home), hero plus the next two sections, with the real company name and services
- internal tools and apps: the main dashboard or main list screen, including a table and a primary action
- mobile-first consumer: the home/feed screen at 375px

Mention which screen you picked and why in the profile.
