# Product specification

## Product

Cubium is a web application for Rubik's Cube speedsolvers and people learning to solve the Rubik's Cube.

The long-term product combines:

- speedsolving timer;
- solve statistics;
- BLD training;
- letter schemes;
- memo practice;
- special BLD scrambles;
- Old Pochmann solving tools;
- CFOP algorithms;
- personal user profile and synchronization.

## Primary target users

### Beginner speedcuber

Needs:

- simple timer;
- scrambles;
- basic statistics;
- solve history.

### Intermediate / advanced speedcuber

Needs:

- fast timer workflow;
- larger statistics;
- sessions;
- notes;
- penalties;
- algorithm references.

### Blindfolded solver

Needs:

- custom letter schemes;
- selectable buffers;
- memo training;
- letter pairs;
- BLD scramble analysis;
- Old Pochmann tools.

## Main pages

Long-term application navigation:

```text
Timer
BLD
Letter Scheme
Letter Pairs
Algorithms
Profile
```

MVP implements only the Timer page.

Other routes may exist only as disabled or clearly marked placeholders if explicitly requested.

## Timer page

The Timer page is the application's default page.

When a user opens the application, they should immediately see the timer.

No separate dashboard should be required before using the timer.

### Layout

Main hierarchy:

```text
navigation

scramble

                timer                  cube visualization

timer actions

horizontal statistics

recent solves
```

The timer should visually dominate the page.

The Timer uses the Light Protocol appearance. On ordinary desktop screens its
digits occupy the viewport center. Compact screens prioritize flowing content
without overlaps. During a running solve only the centered timer is visible;
the complete interface returns immediately when a key stops the solve. This is
a presentation mode, with no change to timing, saving or keyboard semantics.

### Scramble

A 3x3 scramble appears directly above the timer.

A new scramble must be available after a completed solve.

The scramble should use standard cube notation.

### Cube visualization

A 2D visualization of the scrambled cube appears near the lower-right area of the timer interface.

It represents the cube state after applying the current scramble.

Use `cubing.js` where practical.

### Statistics

Statistics appear in a compact horizontal strip below the timer on desktop,
reflowing into rows on compact screens.

Initial statistics:

- best;
- mean;
- ao5;
- ao12;
- ao50;
- ao100.

Unavailable averages should display a neutral placeholder such as `—`.

### Result actions

After a solve, show compact actions:

- note;
- +2;
- DNF;
- delete.

After a +2 or DNF change is saved locally, all displayed statistics update.
Failed writes remain available for explicit retry.

### Recent solves

Display recent solve results below the timer.

The newest solve should be easy to identify.

Every recent result is selectable. Its details expose the exact historical
scramble, localized creation date/time, penalty, note and deletion controls without
changing the current scramble. Notes accept up to 300 UTF-16 code units in a
compact dialog; deletion requires a confirmation dialog. Deleting the displayed completed
result resets the timer to zero; editing older history leaves that result alone.

Reload restores history and statistics but starts the central timer at 0.000.
Only a new completion during the page session selects the central result.

The cube opens in an enlarged dialog. The MVP supports Russian (default) and
English with a locally remembered language choice; see [UI.md](UI.md).

## Results analysis

The requested `/results` extension exposes the full local journal with editing
and a solve chart, while Timer retains its latest 20. Count/date selection,
selected-range averages, DNF presentation and keyboard interaction are specified
in [UI.md](UI.md#results-page). It uses the existing collection, without sessions,
accounts, synchronization or changes to stored Solve records.

## Future BLD functionality

Do not implement this during the MVP unless explicitly requested.

### Letter scheme

The user can assign a letter to each relevant sticker.

The user may:

- build a custom letter scheme;
- choose a predefined scheme;
- save the scheme to their account.

### Buffers

Allow separate selection of:

- corner buffer;
- edge buffer.

### BLD scrambles

Future training tools may generate scrambles satisfying specific BLD constraints.

Examples:

- avoid specific buffer-related cases;
- edge-specific training;
- corner-specific training;
- parity training;
- target-count training.

Such scrambles are training scrambles and must not be represented as official competition scrambles.

### BLD analysis

For a scramble, the application may eventually display:

- corner memo;
- edge memo;
- corner targets;
- edge targets;
- parity;
- Old Pochmann solution sequence.

### Letter pairs

Generate useful letter pairs based on the configured letter scheme.

Rules for invalid BLD transitions must be derived from the cube model rather than encoded from an unverified assumption.

## Future CFOP functionality

Algorithms page may contain:

- OLL;
- PLL;
- later F2L cases.

For each case:

- case visualization;
- algorithm;
- multiple algorithm variants if available;
- user learning status.

Possible statuses:

```text
not_learning
learning
known
```

## Non-goals for initial versions

Initial development does not target:

- multiplayer;
- competitions;
- live leaderboards;
- social network features;
- smart cube Bluetooth integration;
- native mobile application.
