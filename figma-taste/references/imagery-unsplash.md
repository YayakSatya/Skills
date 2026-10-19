# Imagery from Unsplash

## How images reach Figma

`use_figma` cannot fetch URLs (`createImageAsync` is unavailable). The route is:

1. Build the slots first: rectangles/frames named `image/<slot>` with the `image/placeholder` fill.
   Collect their IDs in order.
2. Call the Figma tool `upload_assets` with `fileKey`, `count = N`, `nodeIds = [slot ids…]` and
   `currentPageId`. It returns N single-use upload URLs in the same order.
3. Write `.figma-taste/plan.json` mapping each URL to a chosen photo and size:

```json
[
  { "slot": "image/hero",   "nodeId": "12:34", "uploadUrl": "https://…", "photo": "abc123XYZ", "w": 2400, "h": 1500 },
  { "slot": "image/place",  "nodeId": "12:40", "uploadUrl": "https://…", "photo": "https://unsplash.com/photos/old-street-tiles-k3Jd8sQp1aZ", "w": 1600, "h": 1067 }
]
```

4. `node <skill>/scripts/unsplash.mjs place --plan .figma-taste/plan.json` downloads each photo
   cropped to `w × h` (imgix `fit=crop&crop=entropy`), POSTs the bytes with the right
   `Content-Type`, reports the result, pings Unsplash's download endpoint (their API guideline when a
   key is used), and appends credits to `.figma-taste/credits.json`.
5. Screenshot to confirm the fills; set `scaleMode` if a crop looks wrong (re-upload with different
   `w/h` rather than stretching).

Upload URLs are single-use. If a POST fails, request a new URL for that slot only.

## Slots inside component instances (intake mode)

`upload_assets` only accepts plain ids (`^\d+[:-]\d+$`), so it rejects instance sublayers such as
`I4591:50;4588:22`. Route those through intake rectangles:

1. In a `use_figma` call, create a frame `_intake` on the same page (away from the design) with one
   plain rectangle per photo, and return their ids.
2. `upload_assets` with `nodeIds` = the intake rectangle ids.
3. In plan.json give each item `nodeId` (its intake rectangle), `target` (the real slot id, instance
   sublayers allowed), `uploadUrl` and `photo`.
4. `node <skill>/scripts/unsplash.mjs place --intake --plan .figma-taste/plan.json --intake-frame <_intake id>`
5. Paste the written `.figma-taste/intake-transfer.figma.js` into a `use_figma` call. It copies each
   `imageHash` onto its target (an instance override, which persists) and removes `_intake` when every
   transfer succeeded.

Upload limit: 10MB per asset. The script requests JPEG at quality 80 and caps the long edge at
2400px, which stays well under it.

## Searching

With an API key (recommended; free at unsplash.com/developers, set `UNSPLASH_ACCESS_KEY`):

```bash
node <skill>/scripts/unsplash.mjs search "<query>" [--orientation landscape|portrait|squarish] [--per 12] [--color black_and_white|black|white|yellow|orange|red|purple|green|teal|blue]
```

prints id, size, colour, description, photographer and a small preview URL for each result and saves
them to `.figma-taste/unsplash-last.json`.

Without a key, `search` prints the fallback that worked in testing (the public `napi` endpoint
answers 307, so do not use it):

1. WebFetch `https://unsplash.com/s/photos/<query-with-dashes>` and read the photo page links
   (`https://unsplash.com/photos/<slug>-<id>`) from the result. WebSearch
   (`site:unsplash.com/photos <query>`) is a second route.
2. Look at each candidate (WebFetch its page) before choosing.
3. Put the page URLs in plan.json → `photo`. The script resolves them through Unsplash's public
   download redirect without a key.

`photo` accepts a page URL, a bare page/API id, an `images.unsplash.com` URL, or a CDN id
(`1508450859948-4e04fabaa4ea`). Credits record the page link; add the photographer name from the page
if you can read it.

**Download tracking** (an Unsplash API guideline) needs the photo's page/API id **and** a key. The CDN
id is a different id (its `/download` URL returns 404). The script records `tracking` per photo as
`sent`, `failed (…)` or `not sent (reason)`; never report it as sent unless the credits say so.

## Looking at candidates (preview)

```bash
node <skill>/scripts/unsplash.mjs preview <page url|id> [<page url|id> …] --out .figma-taste/previews
```

saves a small JPEG (480px wide) per photo, one by one with a timeout each, so you can open them with
the Read tool. It works without a key: it follows only the download redirect to
`images.unsplash.com/photo-…` and requests the small size, never the full file (in testing, fetching
the full files made 11 of 14 previews time out).

## Choosing

- Query the **inventory**, not the category: "terrazzo floor close up", "Ubud rice terrace morning
  mist", "hand-stitched leather edge", "tannery hides drying", not "luxury" or "business team".
- Look before choosing: open each candidate's preview (WebFetch on the preview URL, or Read the
  downloaded thumbnail). Reject anything with visible logos, watermarks, readable brand names,
  posed stock smiles, or a person who could be mistaken for the client's team.
- One family per page: the same light (all overcast, or all warm late sun), the same distance
  (all close or all wide), one colour grade. Mixing a bright flat-lay with a moody night street makes
  a page look assembled.
- One dominant photograph per screen; the hero photograph covers at least half the first screen.
- A found photograph shows the client's world, never claims to be the client's own product, room,
  dish or team. If the client has its own photographs, they come first; Unsplash fills the rest.

## One upload, several slots

Design options share the image pool, so one photograph often fills a slot in Option A and one in
Option B. In intake mode, give the plan item an array: `"target": ["I45:6;7:8", "I90:1;7:8"]`. The
transfer snippet copies the same `imageHash` to every target (it cut the uploads from 9 to 6 in a
run). A plain-node slot can also take the hash from another slot the same way.

## Grade: one look for photos from different shoots

Photos from different shoots (a bright corridor, a black-and-white facade, a dark office) look
assembled. Give every slot of a page the same image filters:

```js
const GRADE = { saturation: -0.6, exposure: -0.25, contrast: 0.1 };   // tested in a run
for (const id of slotIds) {                         // plain nodes or instance sublayers
  const n = await figma.getNodeByIdAsync(id);
  n.fills = n.fills.map(p => p.type === 'IMAGE' ? { ...p, filters: { ...(p.filters || {}), ...GRADE } } : p);
}
```

In intake mode, put `"filters": { … }` on a plan item and the transfer applies it; a target's existing
filters are kept otherwise. Decide the grade once per direction and write it in the manifest's
decisions.

## Crops and ratios

Keep a crop family: 3:2 landscape and 4:5 portrait, or 1:1 and 3:4. Repeated media use the `Media`
component's `Ratio` variants. Ask the script for the slot's
own pixel size times 2 (retina) so the crop is made at source. Corners follow the direction's radius
(usually `radius/none`).

## Credits

`node <skill>/scripts/unsplash.mjs credits` prints one line per photo, with its tracking status. Put a single Small line in
the footer ("Photographs: Name, Name, Name via Unsplash") and list all of them in the report with
links. Unsplash's licence does not require attribution, but the house rule does.

## When the shell has no network

The upload and the download both need outbound HTTPS from the shell. If either fails, do not fake
images: keep the named slots with the placeholder token, write the plan with the chosen photo ids,
and tell the user to run `unsplash.mjs place` on their own machine (upload URLs expire, so they
re-run `upload_assets` first, or ask you to in a session that has network).
