# UI specification

## Design direction

The application should feel like a dedicated speedcubing tool rather than an administrative dashboard.

Primary characteristics:

- minimal;
- low visual noise;
- large timer;
- keyboard-first;
- warm light surface (Light Protocol);
- information-dense but not cluttered.

Avoid generic dashboard cards surrounding every element.

## Main Timer page

### Implemented Timer MVP

The default `/` page uses the Light Protocol design: warm white, ink text and
cobalt selection/focus (tokens in [DESIGN.md](../DESIGN.md)). Scramble text sits
above the dominant timer, with the existing 2D cube on its right. Result actions,
a horizontal six-value statistics strip, the latest 20 solves (newest first in
presentation only) and keyboard guidance follow. Navigation contains Cubium,
Timer and Results. State is communicated with text and color.

On desktop the digits' bounding box is centered in the initial viewport, rather
than in the remaining space beside the cube. Status and result actions never
shift that anchor. The timer scrolls with the ordinary page when reading lower
content; it is not an overlay covering history. At widths up to 760px or heights
up to 640px the ordinary interface flows vertically. A ResizeObserver also
chooses flowing layout when header, scramble and enlarged text leave insufficient
space above the digits. Long times fit their container without wrapping.

### Typography: Sports Stopwatch

The approved typography refinement retains Light Protocol and the existing
composition. Locally bundled Golos Text is used for interface copy (400),
controls and timer/statistic values (500), and section titles (600). Numeric
results use lining tabular figures in the renamed Cubium Golos Numeric derivatives.
Their equal advances correct unequal upstream tnum glyph widths without changing
the digit shapes. Kerning is off for measurements. The timer keeps its existing
size, fitting rule and centered anchor, with normal tracking. Current and historical scramble
notation uses IBM Plex Mono Regular (400), normal tracking and no ligatures.

Primary copy has a 16px base, controls/instructions use 15px, supporting labels
use 13px, statistics use 20px and recent times use 18px. Copy sizes use rem to
respect the browser's default text size. Latin and Cyrillic assets ship with the
app; fonts load from the same origin without a CDN or new dependency. Preloads,
swap and system fallbacks keep text available on a delayed or failed font request.
Sources, exact asset hashes and SIL OFL licenses are in `frontend/public/fonts`.

### Concentration while running

Only `timer.status === 'running'` activates concentration. Holding and Ready keep
the complete interface visible. Running shows only the digits on the same light
surface, fixed at the viewport center with the same desktop size. Chrome remains
mounted but has `visibility: hidden`, `inert` and `aria-hidden`; its controls
cannot receive focus. The state instruction becomes visually hidden and remains
available to assistive technology. `role="timer"` and `aria-live="off"` remain.

The presentation hook locks scrolling while retaining the workspace's dimensions,
previous overflow style and scroll position. It focuses the neutral timer section
without scrolling. Stop keydown immediately restores the interface, independently
of keyup, saving and next-scramble generation. The existing key controller still
owns release/repeat behavior. Cleanup restores scrolling on stop and unmount.
There is no Fullscreen API, animated movement, second frame loop, application
state, clock or persistence change.

### Existing MVP behavior

`TimerPage` composes `TimerDisplay`, `StatisticsPanel`, `CubeVisualization` and
`ResultActions`. Statistics use coordinator values and domain formatting: numeric
time, DNF, or an em dash. Scramble/cube input comes only from currentScramble.
Fresh opening/reload restores history and statistics but starts the central timer
at 0.000, without selecting a historical result. A completion during this page
session selects its own result. The idle readout retains that independently tracked result. Deleting it
shows 0.000 even when older history remains, and hides the result caption and
action buttons. There is no first-solve hint under the timer. Compact actions identify their target
by its formatted result. +2 and DNF buttons toggle to NONE when
already selected, or select that single penalty otherwise.

The compact native note dialog loads the current note, preserves text exactly,
supports save/cancel/Escape and initially focuses its textarea.
Delete uses a compact confirmation dialog identifying the selected result and its
creation time, with initial focus on Cancel and a red destructive action. Actions disable
while timing or persistence is unresolved. Notes use the domain's 300 UTF-16 code unit
limit, a used/maximum counter and accessible validation without trimming text.
Native modal dialogs trap focus and make the background inert. Space inside the
textarea never controls timing. Failed writes retain the draft and expose Retry
inside the modal. Space on an explicitly focused button retains native activation.

Startup waits for history before showing statistics. History, scramble and
persistence failures have separate Retry controls through the coordinator.
Failed writes remain in memory and visibly warn to retry before closing the page;
failed next generation leaves saved history intact. No component reads IndexedDB
directly. The isolated `/cube-preview.html` remains a development-only entry.

Russian is the initial MVP language. A labelled RU/EN selector changes all timer
labels and messages, while notation, numeric results, +2, DNF and ao abbreviations
stay unchanged. The choice survives reload (see [ARCHITECTURE.md](ARCHITECTURE.md)).

The inline cube is a labelled button opening the same `CubeVisualization` in a
larger native modal dialog. Close, Escape and clicks outside the cube dialog's
bounds dismiss it and move focus to the main timer workspace, so the next Space
starts a hold instead of reopening the cube. The language selector also returns
focus there after a pointer selection; keyboard selection retains focus and native
arrow/Space behavior. The workspace has tabIndex=-1 (programmatically focusable,
without adding a Tab stop). Buttons remain reachable and operable through Tab.
History, note and delete dialogs use the shared interaction-focus helper:
pointer opening returns focus to the neutral timer workspace on close; keyboard
opening restores the opener if it still exists, otherwise the timer. Nested
note/delete dialogs return pointer focus to their parent details dialog until
that view is closed. Escape dismisses only the topmost dialog. Deleted openers
cannot retain focus. Language pointer selection uses the same neutral helper.
The timer readout and footer replace the Space instruction with a localized
return-to-timer hint while an interactive control is focused. Clicking the
readout focuses its neutral section; clicks on its buttons and fields preserve
native control behavior. No global blur or interactive Space override is used.

`SolveAnnouncement` provides a separate visually hidden, atomic polite live
region. It observes application notifications synchronously so batched stop and
release cannot hide completion. Each new pending save ID announces its formatted
result once, including an unsaved result; saving, retrying and key release do not
repeat it. Running clears the announcement and frame updates remain silent.
Changing the penalty of the result completed during this page session announces
“Result updated” with the same domain formatter (+2 or DNF), rather than another
completion. Restored history, older edits and notes stay silent. Language changes
do not reannounce an earlier result. No timer/application/storage contract changes.

The Statistics info button opens a compact nonmodal help region explaining mean,
the required sample sizes for ao5/12/50/100, insufficient-data dashes, and DNF
handling. It focuses the help for keyboard access; Close or Escape dismisses it
and returns to the neutral timer workspace. Timer shortcuts are suspended while
help is open, and its trigger is disabled during timing or unresolved writes.
All help and announcements use the existing RU/EN dictionary.

All main controls provide at least 44px targets and a cobalt focus outline.
The neutral timer section retains keyboard focus without a surrounding outline;
buttons, links and fields keep their visible focus indicators.
The page has no minimum body width, so 320px screens can reflow without horizontal
scrolling. History is explicitly labelled Last 20; state instructions use 15px text.
Recent results are buttons with hover/focus and pressed selection styles.
Selecting one opens a compact details dialog with the stored historical scramble
as selectable text and reusable result actions. Details and note/delete dialogs
show `createdAt` as semantic `time` with the original ISO value; Intl.DateTimeFormat
uses ru-RU/en-US short date and time in the user's local timezone. Formatted dates
are presentation only. The current scramble/cube never
changes because of selection. Successful deletion closes the selected editor;
failed writes remain retryable inside it. Native dialogs trap focus and make the
background inert; Tab/Shift+Tab explicitly wrap between the first and last enabled
control in the topmost dialog. Timer shortcuts are suspended while any dialog is open.

Desktop concept:

```text
┌───────────────────────────────────────────────────────────────┐
│ Cubium       Timer                         Language           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                   R U2 F' L2 D R2 ...                         │
│                                                               │
│                                                               │
│                         12.483              2D CUBE           │
│                                                               │
│                         Note  +2  DNF  Delete                  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ best      mean      ao5      ao12      ao50      ao100          │
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

Only the timer digits remain visible; the state instruction remains accessible
to screen readers. All other controls are inert until stop keydown.

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

Uses a compact native dialog, without a modal library.

Do not introduce a large complex modal.

While editing:

- timer keyboard shortcuts are disabled;
- Escape closes the editor;
- changes are persisted.

## Navigation

The implemented routes are `/` (Timer) and `/results` (Results), with a shared
header and RU/EN selector. Navigation uses React Router without reloading the
application. A running solve or open solve-details/editor task blocks internal
navigation until it ends. Leaving holding/ready cancels that incomplete hold.

## Results page

Results extends Light Protocol with a visible page title, count/date filters,
selected-range statistics, a wide SVG chart and the complete editable journal.
There are no dashboard cards. The existing local fonts, numeric figures,
44px controls and dialog behavior apply. Timer retains its latest 20 results.

The default is the last 100 solves, no date constraint, ao5 visible and ao12
hidden. Options are 100, 500 and all; dates filter first, then the count limit.
Both dates are inclusive local calendar days (ending at the next local midnight,
including DST). Invalid/reversed dates show an error rather than unrestricted
history. Filters, series visibility and journal page are URL query parameters.
Reset returns to defaults; refresh and Back/Forward restore URL selections.

Statistics and rolling averages use only the selected records, including
existing +2/DNF semantics. Early average points have insufficient data, not
context borrowed from outside the selected range. The X axis uses full-history
chronological ordinals (instant then ID); the Y axis begins at zero and includes
all values. Effective solve time is a muted line, ao5 cobalt and ao12 dashed
green. DNF markers occupy a labelled separate band and break numeric paths.
DNF/insufficient averages have no numeric point. Outliers are never hidden.

Hover/tap inspects exact values, local date/time, penalty and both averages;
click opens the shared solve-details dialog. The chart has one Tab stop with
Left/Right, Home/End and Enter controls and a textual inspector. Keyboard changes
are politely announced; mouse hover is silent. The journal provides the same
source information without relying on the chart or color perception.

The journal shows newest first, 50 records per page; pagination never changes
the chart or statistics. Editing uses the shared note/penalty/delete controls
and publishes graph, journal and statistics updates only after durable writes.
Failures retain data and provide Retry. Deleting an absent page's last result
clamps pagination. Keyboard dialogs return to their opener, pointer dialogs to
neutral main; deleted openers fall back there. Results has no timer shortcuts.

At small widths filters stack, statistics wrap, and journal rows reflow to time,
date and Details; full notes and ordinals remain available in the details/chart.
Loading, read errors, empty history, no matching filters and all-DNF selections
have distinct text and recovery actions. No sessions or new source fields exist.

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
