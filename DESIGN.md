---
name: Cubium — Light Protocol
description: A quiet, keyboard-first speedcubing work surface with precise measurements.
colors:
  surface: "#f5f3ec"
  ink: "#18232e"
  muted: "#596470"
  line: "#cbd0d1"
  control-border: "#7d8791"
  accent: "#244ac7"
  accent-soft: "#e5eafa"
  ready: "#176b45"
  holding: "#85570b"
  danger: "#a02d34"
  surface-raised: "#fffdf8"
typography:
  display:
    fontFamily: "'Cubium Golos Numeric', system-ui, sans-serif"
    fontSize: "clamp(64px, 10vw, 144px)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
  scramble:
    fontFamily: "'IBM Plex Mono', ui-monospace, Consolas, monospace"
    fontSize: "clamp(18px, 1.8vw, 25px)"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  body:
    fontFamily: "'Golos Text', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Golos Text', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
  title:
    fontFamily: "'Golos Text', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
  statistic:
    fontFamily: "'Cubium Golos Numeric', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
  history:
    fontFamily: "'Cubium Golos Numeric', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
rounded:
  control: "4px"
  dialog: "12px"
spacing:
  detail: "4px"
  control-gap: "8px"
  compact: "12px"
  standard: "16px"
  help: "20px"
  section: "24px"
  flow: "32px"
components:
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-secondary-hover:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  button-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  note-field:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px"
  language-select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px"
  timer-readout:
    textColor: "{colors.ink}"
    typography: "{typography.display}"
  recent-result:
    textColor: "{colors.ink}"
    typography: "{typography.history}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  dialog:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    padding: "24px"
---

# Design System: Cubium — Light Protocol

## Overview

**Creative North Star: "Light Protocol"**

Cubium feels like a dedicated competition work surface: warm paper, clear ink, precise measurements and restrained cobalt controls. The timer carries the visual weight; supporting information stays compact and readable. Fine rules organize the surface without a surrounding dashboard of cards.

Locally bundled Golos Text and its Cubium Golos Numeric derivative share a consistent voice across copy and measurements; IBM Plex Mono distinguishes cube notation. State changes are immediate. The approved world uses no decorative imagery or runtime external assets; the live cube is functional domain visualization.

**Key Characteristics:**

- Warm light surface and high-contrast ink.
- Cubium Golos Numeric measurements with lining, tabular numerals and a dominant timer.
- Fine separators, compact labels and generous control targets.
- Cobalt selection and focus; named, readable timing states.
- Immediate concentration and immediate return to the work surface.

## Colors

The palette combines warm neutral surfaces with cool ink and one cobalt accent. Frontmatter is the normative color inventory; the matching CSS custom properties live in `frontend/src/app/styles.css`.

### Primary

- **Protocol Cobalt** (`accent`): active navigation, keyboard focus, selection, pressed actions and the best statistic.
- **Soft Cobalt** (`accent-soft`): hover wash for controls. It does not replace the stronger focus outline.

### Neutral

- **Warm Paper** (`surface`): page background and language field.
- **Dark Ink** (`ink`): primary copy and idle or stopped measurements.
- **Slate Copy** (`muted`): labels, captions, instructions and footer text.
- **Fine Rule** (`line`): section dividers and editor boundaries.
- **Control Stroke** (`control-border`): interactive field and button boundaries, stronger than decorative dividers.
- **Raised Paper** (`surface-raised`): note fields, help and dialogs; light text on cobalt selections.

### State colors

- **Readiness Green** (`ready`): Ready digits and instruction.
- **Hold Amber** (`holding`): Holding digits and retry notices.
- **Delete Red** (`danger`): destructive confirmation text.

**The Named State Rule.** Pair timing-state color with a written instruction; color alone never identifies Holding or Ready.

## Typography

**Display Font:** Cubium Golos Numeric with system sans fallbacks.
**Body Font:** Golos Text with system sans fallbacks.
**Notation Font:** IBM Plex Mono with UI monospace and Consolas fallbacks.

Time, result captions, statistics and recent results use lining, tabular numerals in Cubium Golos Numeric, with kerning disabled (`font-kerning: none`). Copy uses conventional casing and compact rem sizes, respecting the browser's base font size. Time and notation use normal tracking; the compact brand retains its existing tight tracking. This interface has no decorative display headline.

Golos Text ships in regular (400), medium (500) and semibold (600); IBM Plex Mono ships in regular (400). The WOFF2 files and original OFL licenses live in `frontend/public/fonts`, with `font-display: swap` defined in `frontend/src/app/fonts.css`. Cubium Golos Numeric ships in regular (400) and medium (500). The main HTML preloads Golos regular, Cubium Golos Numeric medium and Plex Mono regular. Only WOFF2 is shipped; the variable TTF used to create the numeric derivative is not an application asset. There are no external font CDN requests or font dependencies. Sources: [googlefonts/golos-text](https://github.com/googlefonts/golos-text) and [IBM/plex](https://github.com/IBM/plex).

The numeric derivative preserves and centers the original Golos outlines while equalizing the `tnum` advance widths. This repairs unequal upstream tabular advances (for example, zero 620 and two 580 at Regular). The renamed, numeric-only faces remain under the original Golos SIL OFL. Provenance and reproducible generation are documented in `frontend/public/fonts/README.md` and `frontend/scripts/build-numeric-fonts.py`; optional font-generation tools are not application or build dependencies.

### Hierarchy

- **Display:** medium weight (500), normal tracking and unit line height. Its desktop base size is the frontmatter clamp. The actual readout takes the smaller of that size and `calc(100cqi / var(--time-characters) * 1.6)` so long results stay on one line.
- **Scramble:** responsive notation with generous line height and ligatures disabled; it wraps between moves, keeping cube notation intact. Historical notation in dialogs uses a smaller fixed size (18px).
- **Body:** action labels, timing instructions and editor copy (0.9375rem, 400); timing instructions have line height (1.5).
- **Label:** section labels, statistic names, result captions, counts and footer copy (0.8125rem). The defined medium-weight label role applies to section labels; auxiliary copy uses inherited weight.
- **Title:** recent-history heading (0.9375rem, 600). Dialog titles use a larger heading (1.25rem); help headings use (1rem).
- **Statistic / History:** compact Cubium Golos Numeric measurements (1.25rem, 500 / 1.125rem, 400) with lining, tabular numerals.

**The Measurement Rule.** Keep numeric results in Cubium Golos Numeric with lining, tabular numerals and no kerning; use IBM Plex Mono for cube notation and fit long values within their container without wrapping.

## Layout

The current Timer surface has a bounded page width (1480px) with responsive side padding (`clamp(16px, 3.5vw, 48px)`). Its header starts at a compact minimum height (64px). Small gaps and editor spacing follow the extracted frontmatter values rather than a new spacing scale.

On ordinary desktop screens, the readout's bounding box sits at the center of the initial viewport. A three-column workspace reserves its middle column (56%) for the time, places compact statistics to the left and the cube to the right. Measured header, scramble and readout heights determine the top space; captions and actions remain below the digit anchor. The measured statistics height centers the sidebar alongside the digits without moving them. The resting page scrolls normally when reading history. Workspace bottom padding (48px) leaves generous space below the timer and its actions before history; statistics remain close at hand beside it.

At widths up to (760px) or heights up to (640px), the workspace uses flowing vertical spacing (32px) and statistics follow the timer/cube instead of occupying the sidebar. Small-screen statistics use three columns. Narrow screens also stack the cube below the timer, wrap the header and actions, hide the local-storage header caption and stack footer guidance. A measured copy-collision check independently selects flowing spacing when enlarged copy needs it. The page has no minimum body width.

These are implemented Timer composition rules, not a mandate for unimplemented future screens. The current surface contract is `.impeccable/surfaces/timer.md` and detailed behavior is in `docs/UI.md`.

## Elevation & Depth

The ordinary work surface is flat. Fine rules, stronger control strokes and the raised-paper fill distinguish regions; statistics are a strip, not separate elevated cards. The help region is layered above the strip without a shadow. Native modal dialogs are the sole lifted surface: their shadow (`0 24px 90px #18232e40`) and dim backdrop (`#18232e99`) communicate interruption.

**The Flat Work Surface Rule.** Use separators and tonal fill for routine information; reserve the existing shadow and backdrop for modal dialogs.

## Shapes

Controls and textarea fields have gently eased corners using the control radius. Dialogs use the larger dialog radius. The standard interactive stroke is one pixel; active navigation has a cobalt underline (2px). Main buttons and language selection provide a minimum target height (44px), and buttons also provide a minimum width (44px).

The Cubium mark, statistics help and cube enlargement affordance use inline stroke SVG, with `currentColor` and a light stroke (1.5). These functional symbols belong to the existing sparse icon vocabulary.

## Components

### Buttons

Quiet outlined actions use the control stroke, transparent fill and compact padding. Hover applies soft cobalt and a cobalt border. Pressed penalty/history actions use cobalt fill with raised-paper text; destructive confirmation changes the text to Delete Red. Disabled buttons reduce opacity (0.5). Keyboard focus uses a cobalt outline (2px) offset from the control (4px). There are no animated transitions.

### Inputs / Fields

The language selector uses the page surface, stronger control stroke and control radius. The note field uses raised paper, the same stroke and radius, and compact padding (10px). It resizes vertically inside a compact native dialog. Counts and validation remain written, legible copy; notes preserve line breaks.

### Navigation

Cubium, Timer and Results share a ruled header. The brand uses compact Golos Text (1.25rem, 600) and the cobalt cube-grid mark. The active page link uses cobalt text and an underline; the language control sits at the end. Compact headers wrap rather than forcing horizontal overflow.

### Statistics / Recent Results

Timer statistics form a quiet left column on desktop, with six label/value rows and right-aligned measurements. Flowing Timer layouts and the Results page retain a ruled statistics strip. Names are muted and Cubium Golos Numeric results use lining, tabular numerals with no kerning. Best receives the cobalt accent. Help is a compact raised-paper region with the stronger stroke. Recent results are real buttons in a wrapping horizontal list, preserving numeric formatting, explicit penalty notation and selection styling.

### Results analysis surface

The `/results` extension keeps the Light Protocol palette and Sports Stopwatch
fonts. Its hierarchy is title/filter row, selected-range statistics, wide chart,
then a flat paginated journal. Page titles use 2rem (1.75rem narrow), section
titles 1.125rem, results 1.125rem and support copy 0.8125rem. Controls retain the
44px floor. Shared navigation identifies the active page with cobalt text and
an underline; inactive links are muted.

The chart uses muted effective-time paths, cobalt ao5, dashed Ready Green ao12
and Delete Red DNF markers in a separate band. Labels and patterns supplement
color. Axis numerals and the exact-value inspector use the numeric font; source
scrambles in shared details use IBM Plex Mono. Chart geometry grows with text
size. Mobile filters stack and journal rows reflow without page-level horizontal
scroll. This page has neither a timer readout nor concentration mode.

### Dialogs

Native dialogs use raised paper, larger eased corners and the sole modal shadow. They fit within the viewport (`min(760px, calc(100vw - 32px))`), scroll within its height and keep a visible Close action. Their focus and dismissal behavior remain the implemented native-modal behavior, as documented in `docs/UI.md`.

Note and delete dialogs use the compact width `min(460px, calc(100vw - 32px))`.
They identify the solve and its localized creation time. Result-dialog pointer
tasks return to the neutral timer area; keyboard tasks return to their opener. A nested editor
returns to its parent details dialog until that dialog is dismissed.

### Timer / Concentration

The time is the signature measurement. Holding and Ready retain the full work surface and add written state instructions. Only Running activates concentration: the same readout becomes fixed at the viewport center and retains its desktop sizing. Other chrome stays mounted, invisible, inert and hidden from assistive technology. The instruction remains available to screen readers, and the timer itself remains silent (`aria-live="off"`).

There is no transition into concentration. Scrolling locks during Running and returns to its prior position and overflow style on stop or unmount. Stop keydown restores the work surface immediately. This presentation does not add a clock, frame loop, persistence state or timing semantics.

**The Immediate Concentration Rule.** Show only centered digits during Running and restore the complete work surface on stop keydown without animated movement.

## Do's and Don'ts

### Do:

- **Do** use the exact recorded palette and locally bundled Golos Text, Cubium Golos Numeric and IBM Plex Mono stacks.
- **Do** keep focus visible and main control targets at least 44px.
- **Do** express state and penalties in readable text alongside color.
- **Do** keep measurements tabular and fit long values without wrapping.
- **Do** use flowing layout when compact screens or enlarged copy require it.
- **Do** preserve the immediate Running concentration and stop behavior.

### Don't:

- **Don't** surround routine Timer information with dashboard cards.
- **Don't** introduce decorative imagery or runtime external font/CDN requests into this approved world.
- **Don't** add animated movement to concentration or a second timer frame loop.
- **Don't** use the fine divider token as the stronger interactive-control boundary.
- **Don't** turn development-only component examples or unused legacy styles into product rules.
