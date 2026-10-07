# Local Timer typefaces

Cubium's Sports Stopwatch typography uses Golos Text for the interface, timer,
statistics and history, and IBM Plex Mono for cube notation. WOFF2 files are
served from the same origin as the application.
There is no font CDN, external font-service request or new application dependency.

- Golos Text Regular (400), Medium (500), SemiBold (600):
  [official webfonts](https://github.com/googlefonts/golos-text/tree/main/fonts/webfonts).
  Copyright 2019 The Golos Text Project Authors.
  See [golos-text-OFL.txt](golos-text-OFL.txt).
- IBM Plex Mono Regular (400):
  [official complete WOFF2](https://github.com/IBM/plex/tree/master/packages/plex-mono/fonts/complete/woff2).
  Copyright 2017 IBM Corp., reserved font name "Plex".
  See [ibm-plex-mono-OFL.txt](ibm-plex-mono-OFL.txt).
- Cubium Golos Numeric Regular (400) and Medium (500) are tiny numeric derivatives
  of [the official Golos Text variable source](https://github.com/google/fonts/blob/main/ofl/golostext/GolosText%5Bwght%5D.ttf),
  under the same Golos SIL OFL. Original outlines are retained and centered in
  equal advance widths for the `tnum` glyphs. The upstream feature maps all ten
  digits but its tabular glyphs have unequal advances (e.g. 620 for zero and 580
  for two at Regular). The derivatives are renamed, unhinted and subset to time,
  penalty and DNF characters. Text/notation faces above are unmodified.

To regenerate, download that source (SHA-256
`17BB58FB69AEC2DFB047A2EBF52534023E9B688C97A6B7AC795B0A72912C2063`) and run
`python scripts/build-numeric-fonts.py SOURCE.ttf public/fonts` from `frontend`.
The optional font-generation environment uses fonttools 4.66.1 and brotli 1.2.0;
neither is an application/build dependency. The browser regressions measure
actual numeric widths in the timer, statistics and history.

Downloaded on 2026-10-07. SHA-256 identifies the exact shipped files:

| File                               | SHA-256                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| golos-text-regular.woff2           | F2152554816111E3A9F6D628EA8C04EC621CA01F0A9688D98845FAE75CF5C44A |
| golos-text-medium.woff2            | 21CD58F9C4A0101753B52FA2E687A39119C9D6A19523A77C26BACF546A2C721C |
| golos-text-semibold.woff2          | 32005098E00D1F0DA853E533B3AC9C3FD775FD734F40951A81C6AB069AC4CAE9 |
| ibm-plex-mono-regular.woff2        | BA204497F16B6D334CEE9D1E963A831B73E3A56E1D6300A8489D18DF7214B350 |
| cubium-golos-numeric-regular.woff2 | AB68CA2D054D91AA361F31FF58EBDE9B82A336F72DA84060854D84B8BE8DC160 |
| cubium-golos-numeric-medium.woff2  | E6F674A60A2929964AD1F7C8B2B975B7BDD67EEC5ED243E88399961B2EAF8744 |

Only normal 400/500/600 styles are used. Main text, timer and notation faces are
preloaded; `font-display: swap` and system fallbacks keep text visible if loading
is delayed or fails. Golos Text includes Latin and Cyrillic; notation uses the
complete Plex Mono face. Tabular lining figures are explicitly enabled for data.
