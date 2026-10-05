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

Desktop concept:

```text
┌───────────────────────────────────────────────────────────────┐
│ CubeTrainer       Timer    BLD    Algorithms          Profile │
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
