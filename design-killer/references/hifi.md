# Building HI-FI screens

HI-FI here means: every screen from `design/screens.md`, styled with the chosen DESIGN.md, real content, working links and states, viewable by double-clicking a file. A developer can lift the CSS, a designer can import it into Figma, and the product builder can demo it.

For company profiles, also follow `company-profile.md` section 5 (multi-page, working contact without backend, WhatsApp, map, bilingual, SEO, weight). Pages there play the role of "screens" here.

## Setup

```
design/hifi/
  index.html            # gallery: every screen, purpose, link, thumbnail
  styles/tokens.css     # generated, never hand-edited
  styles/app.css        # components and layout, built only from tokens
  <nn>-<screen>.html    # one file per screen
  shots/                # screenshots from scripts/screenshot.sh
```

```bash
mkdir -p design/hifi/styles && cp design/system/tokens.css design/hifi/styles/   # generated in Step 4; never hand-edit
```

Stack: static HTML + CSS + a little vanilla JS. No build step, no framework, so it opens anywhere. Fonts via Google Fonts `<link>`. If the team wants it in their real stack, that is a separate step (see Handoff).

## Rules

**Structure follows the wireframe.** Same screens, same blocks, same order. If the design system suggests a better arrangement, propose it in one line; do not silently restructure.

**Look follows DESIGN.md.** Every color, size, radius, space and shadow comes from a token or `.type-*` / `.c-*` class in `tokens.css`. A raw hex or px in `app.css` means a missing token: add it to DESIGN.md, regenerate, then use it. Follow the Do's and Don'ts section literally.

**Content is real or honestly marked** (antislop R-17, R-18, R-36, R-38). Copy comes from the PRD, written for the users in the profile, in their language. Unknown numbers show `[DATA NYATA]`-style markers in the UI language or are left out. No invented testimonials, logos of customers, stats, or team members. No em dashes in UI copy (R-02); use a comma, colon or period.

**Every data view has its states** (R-27). With a PRD package, the states column of `screens.md` (from the sitemap inventory) is the checklist; build each one behind the `?state=` switcher. In general: default, empty (first use, with the next action), loading (skeleton matching the layout), error (what happened + how to retry). Put state switches in a small dev toolbar (`?state=empty` query param) so reviewers can see them. On a company profile this applies to the contact form (validation errors, sending, sent, failed), project filters with no results, and any list that loads.

**It works** (R-24, R-26, R-35). Links go to real screens or anchors. Buttons do something: navigate, open a modal, toggle, submit a form with visible validation and success feedback. Escape closes overlays.

**Responsive** (R-03). Check the PRD minimum width (360 in the team's packages), 768, 1440. No horizontal scroll. Tables become stacked cards or scroll inside their own container on mobile. Touch targets at least 44px.

**Accessible** (R-25, R-32). Visible focus ring from the system's accent. Labels on every input. Contrast already checked in tokens; recheck any new pair. Semantic HTML: `header`, `nav`, `main`, `button` for actions, `a` for navigation.

**Theme** (R-21, R-34). If `colors-dark` exists, add a toggle that sets `data-theme` on `<html>` and remembers the choice in `localStorage` (wrapped in try/catch). Check both modes.

**Locale.** `<html lang="...">` from the profile. Format money and dates with `Intl` and the profile locale. Leave room for longer strings.

**Liveliness** (antislop Part 3). Hold the dials from DESIGN.md on every screen. One focal point per screen. One deliberate accent moment. Repeat the identity motif, sparingly. Motion only at the MOTION dial level, and respect `prefers-reduced-motion`.

## Process

1. Declare the Design Read line (from the profile) at the top of `design/hifi/NOTES.md`.
2. Build shared pieces once in `app.css`: shell, page header, buttons, inputs, table, cards, states.
3. Build the preview screen first, screenshot it, compare with DESIGN.md Do's and Don'ts, fix. This calibrates everything else.
4. Build the remaining screens. When a screen needs a pattern you have not built (stepper, calendar, kanban), check Refero screens if the MCP is connected (`refero_search_screens`), then build it from tokens.
5. Screenshot every screen at 360/768/1440 (or the PRD's minimum):
   ```bash
   for f in design/hifi/*.html; do scripts/screenshot.sh "$f" design/hifi/shots; done
   ```
   Look at the images. Fix overflow, cramped spacing, broken alignment, unreadable text. If no browser is found (exit 3), open the files and ask the user to look at the mobile width.
6. Write `index.html` with thumbnails from `shots/`.
7. Each of these lands at a checkpoint: the preview/home page at CEK 5, the rest at CEK 6 (SKILL.md). The antislop Delivery Gate runs in Step 8.

## Handoff (optional, offer at the end)

- **To Figma** for a designer to polish: if the DesignAgent MCP is connected, `html_to_design` imports HTML into Figma; with the Figma MCP, the `figma:figma-generate-design` skill rebuilds screens with variables. Push only when the user asks.
- **To code**: the `designagent:design-to-code` skill (if installed) builds production UI in the project's stack from DESIGN.md. `tailwind.preset.js` from `design/system/` plugs into Tailwind projects.
