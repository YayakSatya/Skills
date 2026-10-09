# PRD to project profile

The profile is the bridge between a PRD (written for features) and design decisions (made for people and feelings). Everything later, shortlist, adaptation, HI-FI, assets, is scored against it. Write it to `design/profile.md`.

## What to extract

Read the whole PRD first. Most fields are inferable; only ask about what is missing *and* would change the shortlist.

| Field | How to infer from the PRD | Why it matters |
|---|---|---|
| Product name + one-line purpose | title, problem statement | used in copy, logo wordmark, rebranding the DESIGN.md |
| Type key | see list below; pick 1 primary, 1 optional secondary | drives catalog lookup |
| Industry (company profiles) | what the company does, e.g. kontraktor, klinik, konsultan pajak | drives `catalog.md` section 6b |
| Real photo inventory | does the company have real photos of office, team, projects, products? quality? | filters photo-first styles in or out (company-profile.md section 4) |
| Pages / sitemap | PRD page list, or the company-profile default | which pages get built; Home is the preview screen |
| Languages | ID only, or ID + EN | bilingual doubles the copy and adds a language switch |
| Surface | marketing site, web app, mobile web, native-style mobile, or a mix | marketing-only DESIGN.md files need the product UI extension for apps |
| Primary users | personas, "target user" | tone, density, font size floor |
| Usage context | where/when they use it: desk, field, on the go, once a month, all day | density, touch target size, dark/light need |
| Key screens | user stories, feature list, flows | which screen becomes the comparison preview |
| Content density | low (story-telling), medium (forms, lists), high (tables, dashboards) | eliminates photo-first and luxury families for high-density apps |
| Trust level | money, health, legal, personal data, enterprise buyers = high | high trust favors restrained palettes and family A |
| Tone words | 3 adjectives the users should feel, e.g. "tenang, cepat, bisa dipercaya" | matches the catalog "feels" column |
| Brand constraints | existing logo, colors, fonts, company brand book | existing brand colors override the borrowed accent |
| Theme need | does the PRD justify dark (night use, media, dev tool) or a toggle? | antislop R-21 |
| Locale | UI language, currency, date/number format, text length | Indonesian UI strings run roughly 20-30% longer than English: buttons and nav need room |
| Accessibility | older users, low-end Android, outdoor glare, low bandwidth | font size floor, contrast, image weight |
| Liveliness dials | ENERGY / RHYTHM / MOTION 1-3 (antislop Part 3) | how loud the final design is allowed to be |

### Type keys

`company-profile`, `app-dashboard`, `internal-tool`, `saas-landing`, `devtool`, `api`, `docs`, `knowledge-base`, `ai-product`, `fintech`, `payments`, `crypto`, `commerce`, `marketplace`, `travel`, `food-retail`, `local-business`, `productivity`, `collaboration`, `workplace`, `hr`, `education`, `health`, `media`, `community`, `creative-tool`, `portfolio`, `agency`, `enterprise`, `b2b-services`, `gov-public`, `telco`, `luxury`, `automotive`, `hardware`, `gaming`, `music`.

Most projects in this team are `company-profile`: a small marketing site for a real company. When the PRD describes pages like Beranda, Tentang Kami, Layanan, Proyek, Kontak, use that key, fill the industry and photo fields, and read `company-profile.md`. When it is an app instead (`internal-tool`, `app-dashboard`), say so: it pushes the shortlist toward systems that survive tables and forms.

## Asking questions

The person reading your questions is not a designer. Ask in their language, in everyday words, and offer choices instead of open questions.

- Ask only when the answer changes the shortlist. Good: "Sudah ada logo atau warna perusahaan yang wajib dipakai?" Bad: "What is your preferred typographic voice?"
- For company profiles the usual round is: logo and brand colors exist? real photos exist? ID only or ID + EN? Plus the tone question only if the PRD leaves it open.
- Bundle into one round (max 4 questions) using AskUserQuestion. Never a question dump.
- When the tone is ambiguous, ask exactly one decisive question (antislop Design Read), framed with familiar references, e.g. "Lebih mirip aplikasi bank (tenang, rapi) atau aplikasi kreatif (berwarna, berani)?"
- If nothing critical is missing, skip the questions; CEK 1 still asks the user to approve the profile summary before Step 2.

## Template

```markdown
# Design profile: {{Product}}

Source: PRD.md ({{date read}})

- Purpose: {{one line}}
- Type: {{primary key}} (+ {{secondary key}})
- Industry: {{for company profiles}}
- Pages: {{Beranda, Tentang Kami, ...}}
- Real photos: {{none / some, uneven / strong}} ({{what exists}})
- Languages: {{ID / ID + EN}}
- Surface: {{web app / marketing / mobile web ...}}
- Users: {{who, how tech-savvy, age range if relevant}}
- Context: {{where, how often, device}}
- Key screens: {{3-8 screens}}; preview screen for comparison: {{one}}
- Density: {{low/medium/high}} because {{reason}}
- Trust: {{low/medium/high}} because {{reason}}
- Tone: {{word}}, {{word}}, {{word}}
- Brand constraints: {{none / logo file / hex colors / fonts}}
- Theme: {{light / dark because ... / light+dark toggle}}
- Locale: {{id-ID, IDR, DD/MM/YYYY ...}}
- Accessibility notes: {{...}}
- Dials: ENERGY {{1-3}} / RHYTHM {{1-3}} / MOTION {{1-3}}

Design Read: Reading this as: {{page kind}} for {{audience}}, in a {{visual language}} style, dial ENERGY x / RHYTHM y / MOTION z.

Refero search phrases (for MCP or manual browsing):
- "{{mood + type, e.g. calm trustworthy finance dashboard light}}"
- "{{alternate mood}}"
```
