# UI specification

## Design direction

The application should feel like a dedicated speedcubing tool rather than an administrative dashboard.

Primary characteristics:

- minimal;
- low visual noise;
- large timer;
- keyboard-first;
- dark mode friendly;
- information-dense but not cluttered.

Avoid generic dashboard cards surrounding every element.

## Main Timer page

### Implemented Timer MVP

The default `/` page uses a quiet dark layout with scramble text above a dominant
timer, compact statistics on the left, the existing 2D cube on the right, and the
latest 20 solves below (newest first in presentation only). Navigation contains
Cubium and Timer. Desktop and laptop layouts use three columns; narrower
screens place the timer above statistics and cube. State is communicated with
both text (Idle/Holding/Ready/Running/Stopped) and color.

`TimerPage` composes `TimerDisplay`, `StatisticsPanel`, `CubeVisualization` and
`ResultActions`. Statistics use coordinator values and domain formatting: numeric
time, DNF, or an em dash. Scramble/cube input comes only from currentScramble.
The idle readout retains the independently tracked displayed result. Deleting it
shows 0.000 even when older history remains. Compact actions identify their target
by its formatted result. +2 and DNF buttons toggle to NONE when
already selected, or select that single penalty otherwise.

The inline note editor loads the current note, preserves text exactly, supports
save/cancel/Escape, focuses its textarea and returns focus to Note on close.
Delete uses an inline confirmation with initial focus on Cancel. Actions disable
while timing or persistence is unresolved. Notes use the domain's 300-character
limit, a used/maximum counter and accessible validation without trimming text.
Space on a focused button remains
native activation; click the timer area or move focus there to time again.

Startup waits for history before showing statistics. History, scramble and
persistence failures have separate Retry controls through the coordinator.
Failed writes remain in memory and visibly warn to retry before closing the page;
failed next generation leaves saved history intact. No component reads IndexedDB
directly. The isolated `/cube-preview.html` remains a development-only entry.

Russian is the initial MVP language. A labelled RU/EN selector changes all timer
labels and messages, while notation, numeric results, +2, DNF and ao abbreviations
stay unchanged. The choice survives reload (see [ARCHITECTURE.md](ARCHITECTURE.md)).

The inline cube is a labelled button opening the same `CubeVisualization` in a
larger native modal dialog. Close and Escape dismiss it and restore focus to the
opener. Recent results are buttons with hover/focus and pressed selection styles.
Selecting one opens a compact details dialog with the stored historical scramble
as selectable text and reusable result actions. The current scramble/cube never
changes because of selection. Successful deletion closes the selected editor;
failed writes remain retryable inside it. Native dialogs trap focus and make the
background inert; timer shortcuts are suspended while either dialog is open.

Desktop concept:

```text
┌───────────────────────────────────────────────────────────────┐
│ Cubium       Timer    BLD    Algorithms          Profile │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                   R U2 F' L2 D R2 ...                         │
│                                                               │
│                                                               │
│  BEST      11.203                                             │
│  MEAN      13.812                   ┌─────────────────────┐    │
│  AO5       12.944                   │                     │    │
│  AO12      13.215         12.483    │     2D CUBE         │    │
│  AO100     13.591                   │                     │    │
│                                      └─────────────────────┘    │
│                                                               │
│                         Note  +2  DNF  Delete                  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ Recent                                                        │
│                                                               │
│ 12.483   13.125   11.992   14.553+   DNF   12.931            │
└───────────────────────────────────────────────────────────────┘
```

This is conceptual, not a pixel-perfect mandate.

Codex may improve spacing and composition while preserving the information hierarchy.

## Timer

The timer is the strongest visual element.

Suggested characteristics:

```text
large font
tabular numerals
centered
minimal distractions
```

Prefer a font stack capable of consistent numeric widths.

## Timer states

### Idle

Neutral foreground.

### Holding

Visually indicate that Space is being held but the timer is not ready.

### Ready

Clear ready indication.

Do not rely exclusively on color; subtle text/icon/state changes are acceptable.

### Running

The timer remains readable.

Actions for the previous result should not interfere with stopping.

### Stopped

Show exact final time and result controls.

## Scramble

Position directly above timer.

Must remain readable on typical laptop displays.

Provide a way to generate another scramble eventually, but accidental scramble replacement should not occur while a solve is running.

## Statistics

Use compact labels:

```text
best
mean
ao5
ao12
ao50
ao100
```

Do not add graphing to MVP.

## Cube visualization

Desktop target:

- right of timer or lower-right;
- 2D;
- no control panel;
- no unnecessary animation.

## Recent results

Compact horizontal list on wide screens.

Allow wrapping or a vertical adaptation at smaller widths.

Suggested visual formatting:

```text
12.483
13.221+
DNF
```

Do not rely only on color to distinguish penalties.

## Result actions

Use actual `<button>` elements.

Actions:

```text
Note
+2
DNF
Delete
```

Buttons should remain visually secondary to timer.

## Note editor

Can be:

- small inline editor;
- popover;
- compact dialog.

Do not introduce a large complex modal.

While editing:

- timer keyboard shortcuts are disabled;
- Escape may close the editor;
- changes are persisted.

## Navigation

During MVP, Timer is the only required functional product route.

Do not waste significant implementation time creating unfinished pages.

## Styling

Use one coherent styling approach.

Preferred:

- CSS Modules; or
- plain scoped CSS architecture.

Do not add a heavy component framework merely for basic layout.

Avoid adding Material UI or similar unless explicitly requested.

## Accessibility

Use semantic HTML.

Provide:

- visible keyboard focus;
- appropriate aria labels where needed;
- sufficient contrast;
- keyboard reachable actions.
