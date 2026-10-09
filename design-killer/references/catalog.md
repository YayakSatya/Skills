# Open DESIGN.md catalog index

Index of the 74 DESIGN.md files in [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (MIT, snapshot 2026-10-09). Use it to shortlist without downloading all 74. Fetch a file with `scripts/fetch_design_md.sh <slug> <dest>`.

Each file is an *unofficial interpretation* of a public website. It is a skeleton to borrow (spacing, type scale, density, surface logic), never an identity to copy. See `adapt-design-md.md`.

Columns: **slug** — look in one line · **feels** (plain words to repeat to a non-designer) · **fits** (website types, keys from `project-profile.md`) · **watch** (risk).

`nofm` = no YAML frontmatter; normalize before running `design_tokens.py`.

## Contents
1. Family A: Light & clean
2. Family B: Warm & editorial
3. Family C: Dark & technical
4. Family D: Bold, colorful, playful
5. Family E: Cinematic, photo-first, luxury
6. Website type to candidates
6b. Company profile by industry
7. Coverage gaps

---

## 1. Family A: Light & clean
White canvas, one accent, calm. Safe default for most business apps.

- **airbnb** — white, coral-pink accent, rounded, photo cards · feels: warm, welcoming, easy · fits: marketplace, travel, consumer, health · watch: needs real photos
- **cal** — white, black CTAs, soft 12px cards, product UI shown directly · feels: tidy, friendly, modern · fits: saas-landing, productivity, app-dashboard · watch: low drama
- **coinbase** — white, one blue used sparingly · feels: calm, trustworthy, institutional · fits: fintech, crypto, insurance · watch: can feel plain
- **expo** — white with sky-blue wash, near-black ink · feels: calm, technical, clean · fits: devtool, docs
- **hp** — white paper, electric blue CTA, angular chevrons · feels: corporate, dependable · fits: enterprise, hardware, b2b-services
- **ibm** — Carbon: white, charcoal, single blue, 0-4px corners, IBM Plex (free font) · feels: serious, systematic, no-nonsense · fits: app-dashboard, internal-tool, enterprise, gov-public · watch: austere; best base for data-dense apps
- **intercom** — cream-white, charcoal, one orange, floating white cards · feels: helpful, professional · fits: saas-landing, support, b2b
- **kraken** `nofm` — white, commanding purple · feels: trustworthy, energetic · fits: crypto, fintech
- **meta** — white, full-bleed product photo cards · feels: confident retail · fits: commerce, hardware · watch: needs product photos
- **mintlify** — sky-gradient hero + dense docs, Inter · feels: airy, helpful · fits: docs, devtool, knowledge-base
- **nike** — photo-first, towering uppercase display, monochrome retail chrome · feels: athletic, bold, absolute · fits: commerce, sports, fashion · watch: collapses without strong photos
- **ollama** — README-like paper-white, one black pill, hand-drawn mascot · feels: humble, minimal · fits: devtool, open-source, small-tool · watch: mascot is identity, replace it
- **renault** — black/white canvas, flat-line diamond mark · feels: modern corporate · fits: automotive, enterprise
- **supabase** — white + near-black, emerald CTA, dense product mockups · feels: capable, developer-friendly · fits: devtool, saas-landing, app-dashboard
- **uber** — black/white duet, pill shapes everywhere · feels: direct, utilitarian · fits: mobility, logistics, ops-tool, marketplace
- **vercel** — near-white, black ink, multi-color mesh hero · feels: sharp, premium-tech · fits: devtool, saas-landing · watch: most-copied look on the web (R-30 risk high)
- **wise** — heavy black display, lime accent, sage neutrals, rounded · feels: bold but friendly money · fits: fintech, payments, consumer

## 2. Family B: Warm & editorial
Cream/off-white canvas, warm ink, often a serif. Feels human and considered.

- **airtable** — white editorial, full-bleed signature cards (coral, dark green, peach, navy) · feels: smart, organized, a bit playful · fits: productivity, no-code, saas-landing
- **claude** — tinted cream, serif display, coral CTA, navy product surfaces · feels: thoughtful, calm, literary · fits: ai-product, education, health, media
- **cursor** — warm cream canvas, warm near-black ink · feels: quiet, confident, crafted · fits: devtool, ai-product
- **elevenlabs** — off-white, warm ink, soft pastel gradient orbs · feels: editorial, soft, premium · fits: ai-product, media, creative
- **lovable** `nofm` — parchment cream, restraint · feels: warm, approachable · fits: ai-product, builder-tool, consumer
- **mastercard** `nofm` — putty-cream, signal orange, magazine feel · feels: warm, established · fits: fintech, corporate, brand
- **mistral.ai** — warm cream, sunset gradients, closing sunset stripe · feels: bold, European, warm · fits: ai-product, brand · watch: sunset stripe is its signature, drop it
- **opencode.ai** — everything monospace on cream, manpage style · feels: nerdy, honest · fits: cli-tool, devtool · watch: niche
- **pinterest** — warm cream chrome, red CTA, masonry grid · feels: inspiring, browsable · fits: discovery, community, content, recipes
- **posthog** — warm cream, olive ink, hand-drawn mascots · feels: playful engineering blog · fits: devtool, analytics, startup · watch: mascot is identity, replace it
- **replicate** — warm cream ML playground, hot orange · feels: indie, energetic · fits: ai-product, devtool
- **starbucks** `nofm` — warm cream + deep green · feels: welcoming retail · fits: food-retail, loyalty, local-business
- **zapier** — warm cream, coffee ink, one orange CTA · feels: practical, friendly · fits: saas-landing, automation, smb-tool, productivity

## 3. Family C: Dark & technical
Near-black canvas, one bright accent. Legit for dev tools, terminals, media players, trading. Needs a reason (antislop R-21), not "dark looks tech".

- **binance** — near-black, signature yellow · feels: high-energy trading · fits: crypto, trading
- **clickhouse** — black + electric yellow, yellow stat numbers · feels: fast, loud, technical · fits: data-infra, devtool
- **cohere** — stark white editorial + deep green-black bands, mineral surfaces · feels: controlled enterprise AI · fits: ai-product, enterprise
- **composio** — near-black, deep electric blue · feels: technical, focused · fits: devtool, integrations
- **framer** — pure black artboard, tight-tracked display, blue links · feels: creative-pro · fits: creative-tool, agency, portfolio
- **hashicorp** — black ground, one accent color per product · feels: enterprise infra · fits: devtool, multi-product-platform
- **linear.app** — deepest near-black, lavender accent · feels: precise, fast, premium · fits: app-dashboard, productivity, project-management · watch: second most-copied look (R-30)
- **mongodb** — deep-teal hero bands, green pill CTA, white docs · feels: solid, technical · fits: devtool, data-infra, docs
- **nvidia** — black hero/footer, paper-white body, saturated green · feels: engineering-grade power · fits: hardware, enterprise, gaming
- **raycast** — near-black, hairline borders, command-palette cards · feels: keyboard-fast, crafted · fits: devtool, productivity, desktop-app
- **resend** — near-black, editorial serif display · feels: refined technical · fits: devtool, api
- **revolut** — black canvas, cobalt-violet, saturated accents · feels: modern neobank · fits: fintech, consumer
- **sanity** `nofm` — near-black "command center" · feels: precise, structured · fits: cms, devtool
- **sentry** — deep purple midnight, lime accents, cheeky illustrations · feels: playful-technical · fits: devtool · watch: illustration voice is identity
- **spotify** `nofm` — dark immersive, content artwork supplies color · feels: immersive, entertainment · fits: media-player, music, streaming
- **superhuman** — dark indigo editorial hero + quiet white body · feels: premium, fast · fits: productivity, email, premium-consumer
- **together.ai** — near-black bands, orange-magenta-periwinkle gradient, white body · feels: AI infra, bold · fits: ai-product
- **voltagent** — near-black, electric green, code mockups · feels: hacker-focused · fits: devtool, ai-agents
- **warp** — warm charcoal, Inter, occasional serif · feels: modern terminal, calm · fits: devtool, ai-product
- **x.ai** — strict near-black, white pill outlines, dusk gradients · feels: frontier, stark · fits: ai-product, deep-tech
- **minimax** — white canvas + black pills, vibrant gradient product cards · feels: bold AI showcase · fits: ai-product, multi-product-platform
- **stripe** — navy ink, indigo, gradient mesh, thin display · feels: polished, trustworthy infrastructure · fits: fintech, payments, saas-landing · watch: very recognizable mesh (R-30), drop the mesh

## 4. Family D: Bold, colorful, playful
Many saturated colors in a disciplined system. Good when the product wants personality.

- **clay** — claymation feel, saturated single-color cards · feels: fun, data-savvy · fits: startup, gtm-tool
- **dell-1996** — retro catalog web, black page frame, color-block ribbons · feels: nostalgic 90s · fits: retro campaign only · watch: novelty
- **figma** — black/white editorial with oversized pastel color blocks · feels: creative, confident · fits: creative-tool, collaboration, education
- **miro** — canary yellow, pastel tints · feels: playful, collaborative · fits: collaboration, education, workshop
- **nintendo-2001** — brushed-metal console chrome, beveled plates · feels: Y2K gaming · fits: retro/gaming fan site only · watch: novelty, contrast issues
- **notion** — navy hero, sticky-note dots, illustration-rich, purple pill · feels: friendly, organized · fits: productivity, docs, education, knowledge-base · watch: illustration style is identity
- **playstation** — black/white/blue chapters, launch-trailer pacing · feels: epic, entertainment · fits: gaming, events
- **slack** — aubergine, cream-lavender gradients, pills · feels: friendly workplace · fits: workplace, hr, internal-tool, community
- **theverge** `nofm` — near-black, brutally heavy display, chiptune energy · feels: loud magazine · fits: media, news, culture
- **webflow** — near-black vs white, five-stop accent set · feels: pro builder · fits: builder-tool, creative, agency
- **wired** — black wordmark on white, tall narrow serif · feels: serious magazine · fits: media, editorial, newsletter

## 5. Family E: Cinematic, photo-first, luxury
Photography or video IS the UI. Only pick when the product has (or will commission) strong imagery.

- **apple** — museum-gallery product tiles, light/dark alternating · feels: premium, polished · fits: hardware, premium-product · watch: needs studio photos; R-30
- **bmw** — cream-tinted white, corporate blue, navy hero bands · feels: measured premium · fits: automotive, corporate
- **bmw-m** — near-black motorsport, uppercase display · feels: fast, aggressive · fits: sports, performance
- **bugatti** — near-pure black, uppercase letterspaced · feels: ultra-luxury, silent · fits: luxury
- **ferrari** — near-black cinematic editorial · feels: passionate luxury · fits: luxury, automotive, events
- **lamborghini** `nofm` — "cathedral of darkness", spotlight drama · feels: dramatic · fits: luxury, nightlife
- **runwayml** `nofm` — cinematic reel, video as primary UI · feels: film studio · fits: creative-ai, video
- **shopify** — dark cinematic merchant photography + bright product track · feels: ambitious commerce · fits: commerce-platform, merchant-tool
- **spacex** — pure black, full-bleed rocket imagery, uppercase D-DIN · feels: mission, awe · fits: deep-tech, aerospace
- **tesla** `nofm` — radical subtraction, full-viewport hero · feels: minimal, product-is-everything · fits: hardware, single-product
- **vodafone** — editorial photo heroes, massive uppercase, signature red · feels: big consumer brand · fits: telco, utility

---

## 6. Website type to candidates

First names are the usual best fit. Always pick final options from **different families** (see SKILL.md, Step 3).

| Type key | Strong candidates | Alternates for contrast |
|---|---|---|
| company-profile | by industry: see 6b | |
| app-dashboard / internal-tool | ibm, linear.app, cal, supabase | airtable, raycast, posthog, notion |
| saas-landing (B2B) | cal, intercom, zapier, supabase | airtable, stripe, cursor, linear.app |
| devtool / api | supabase, resend, raycast, warp | posthog, opencode.ai, expo, voltagent |
| docs / knowledge-base | mintlify, ibm, notion | ollama, opencode.ai, expo |
| ai-product | claude, cursor, elevenlabs, cohere | replicate, together.ai, x.ai, lovable |
| fintech / payments / banking | coinbase, stripe, wise, revolut | mastercard, kraken |
| crypto / trading | coinbase, kraken, binance | revolut |
| commerce / retail | nike, shopify, meta | pinterest, starbucks |
| marketplace / booking / travel | airbnb, uber | pinterest, cal |
| food-retail / local-business | starbucks, airbnb | zapier, mastercard |
| productivity / collaboration | notion, cal, airtable, linear.app | miro, slack, superhuman |
| workplace / hr | slack, notion, intercom | cal, ibm |
| education / learning | notion, miro, claude | figma, airtable, cal |
| health / wellness / care | airbnb, claude, cal | lovable, elevenlabs, coinbase (trust) |
| media / news / editorial | wired, theverge, claude | elevenlabs, pinterest |
| community / social / discovery | pinterest, slack, airbnb | miro, posthog |
| creative-tool / portfolio / agency | framer, figma, webflow | runwayml, elevenlabs |
| enterprise / b2b-services | ibm, hp, cohere | hashicorp, bmw, intercom |
| gov-public / utility / telco | ibm, vodafone | coinbase, hp |
| luxury / automotive / hardware | apple, tesla, bmw | ferrari, bugatti, spacex |
| gaming / entertainment / music | playstation, spotify | theverge, nvidia |

## 6b. Company profile by industry

For `company-profile` projects (see `company-profile.md`). Column "with strong real photos" applies only when the company actually has them; otherwise stay in the first column.

| Industry | Default candidates | With strong real photos | Notes |
|---|---|---|---|
| Konsultan, hukum, akuntan, keuangan | claude, coinbase, ibm, wired | bmw | serif or restrained sans; trust over flash |
| Bank, koperasi, asuransi, fintech | coinbase, wise, mastercard | stripe (drop the mesh) | brand color usually exists |
| Konstruksi, kontraktor, engineering | ibm, hp, nvidia | spacex, bmw | project photos carry the site |
| Manufaktur, industri, energi, tambang | nvidia, ibm, hp | spacex, tesla | light variant needed for dark systems |
| Properti, arsitek, interior | cal, claude | apple, tesla, bmw | gallery-style project pages |
| Logistik, transportasi, ekspedisi | uber, ibm | vodafone | coverage map, fleet, contact |
| IT services, software house, startup | supabase, cal, intercom, cursor | elevenlabs | avoid vercel/linear clones (R-30) |
| Klinik, rumah sakit, farmasi, wellness | airbnb, claude, cal | airbnb | calm, warm, high legibility, older readers |
| Pendidikan, sekolah, kursus, pelatihan | notion, claude, miro | airbnb | friendly, structured, parents are readers too |
| F&B, restoran, kafe, katering | starbucks, zapier, airbnb | nike, ferrari (fine dining) | menu, location, hours, WhatsApp order |
| Hotel, travel, event, venue | airbnb, claude | apple, ferrari, lamborghini | photo-first is often right here |
| Agensi kreatif, studio, production house | framer, figma, webflow | runwayml, theverge | portfolio is the homepage |
| Retail, fashion, produk konsumen | nike, starbucks, pinterest | nike, apple, meta | product photos required |
| Otomotif, dealer, bengkel | bmw, renault | bmw-m, tesla | |
| Telko, utilitas, BUMN, pemerintah | ibm, vodafone, hp | vodafone | accessibility and formality matter |
| Yayasan, NGO, CSR, komunitas | claude, mastercard, notion | airbnb | stories and real impact numbers only |
| Pertanian, perkebunan, perikanan | starbucks, claude, zapier | airbnb | weak coverage: prefer Refero |

## 7. Coverage gaps

The open catalog is skewed toward tech marketing sites. These are weakly covered: kids, NGO/non-profit, local government, healthcare, agriculture, religious/community orgs, traditional Indonesian industries and brands. For company profiles in these industries:
1. Prefer Refero (MCP or user download): far larger catalog (2,000+ styles), searchable by mood.
2. Otherwise adapt the closest family (usually A for trust-heavy, B for human/warm) and say plainly that it is an adaptation.
3. Most catalog files describe marketing pages, which suits company profiles. Apps and dashboards still need the "product UI extension" from `adapt-design-md.md`.
