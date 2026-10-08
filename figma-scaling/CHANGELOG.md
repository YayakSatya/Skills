# Changelog — figma-scaling

- **3.3** (2026-09-04) — **Responsive Breakpoint Architecture & Flex Reset Standard:**
  - Added **Section 5 (The Responsive Flex Reset Rule)** preventing 0px height collapse (`flex-basis: 0`) and giant ghost gaps (`flex-basis: clamp(...)`) when stacking flex rows into columns.
  - Added **Section 6 (Responsive Breakpoint Architecture)** defining `< 1024px` (Tablet tier: 32px lateral padding, hamburger nav, vertical stack) and `< 768px` (Mobile tier: 16px lateral padding, vertical form controls, map aspect ratio).
  - Added mobile display typography clamp standard to prevent heading overflow on narrow viewports.
  - Expanded Section 12 Verification Checklist to cover 375px, 768px, and 1024px viewports.
- **3.2** (2026-09-04) — **Extended 3-Point Fluid Standard (1440px → 1920px → 2560px):**
  - Added `MAX_FRAME = 2560` (1.3333x ceiling) to eliminate dead lateral space on 2K monitors.
  - Added **Flex Child Sizing Rule** to prevent column pinching and excessive whitespace in multi-column flex containers.
  - Added strict guidance and mathematical validation for negative clamp offsets.
  - Added comprehensive 15-tier precomputed token table with ready-to-copy clamp snippets.
- **3.1** (2026-08-28) — Added Fluid mode: `clamp()` + `vw` formula between 1440px and 1920px.
- **3.0** (2026-08-28) — Added font-size floor (`FONT_FLOOR_PX = 15px`).
- **2.0** (2026-08-11) — Added token mapping table, rounding rules, unitless line-height handling, and ultrawide cap.
- **1.0** — Initial version (1920 → 1440, ratio 0.75).
