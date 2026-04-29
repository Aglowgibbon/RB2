# RB2

RB2 is an open-source amateur radio programming helper for converting
RepeaterBook-style repeater CSV data into user-reviewable export files.

This MVP runs entirely in the browser. It has no backend, no API access, and no
credentials.

## What RB2 Does

- Imports one or more RepeaterBook-style CSV files.
- Guides the user through Import, Radio, Repeaters, Zones, and Export steps.
- Filters repeater data by selected APX target bands.
- Lets users review, select, rename, and correct repeater channel data.
- Builds zones with quick grouping, drag-and-drop organization, and manual
  ordering.
- Exports Motorola APX CPS XML files for the currently supported radio module.
- Provides Generic CSV as a review/interchange export.

Motorola APX is the first supported radio-programming export module. Future
Motorola-focused modules are planned for TRBO and ASTRO workflows.

APX CPS imports and exports XML files, not CSV. RB2's APX CPS XML export creates
reviewable conventional system, personality, frequency option, and zone/channel
assignment records for CPS import. It is still not a native codeplug.

See `docs/apx-cps-notes.md` for APX-specific behavior, naming limits, band
filtering, P25 NAC handling, and current scan-list limitations.

## Important Scope

RB2 does not generate Motorola codeplugs directly. It does not create, decode,
edit, or write native Motorola codeplug files. It does not communicate directly
with radios and does not bypass Motorola CPS.

RB2 only generates user-reviewable CSV and XML files.

RB2 is licensed under the GNU GPLv3. See `LICENSE`.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL Vite prints in your terminal, usually:

```text
http://localhost:5173/
```

Try the included sample file, or select multiple CSV files at once to combine
them into one review table:

```text
examples/sample-repeaterbook.csv
```

The sample uses the same style of headers as a RepeaterBook county export, such
as `Output Freq`, `Input Freq`, `Uplink Tone`, `Downlink Tone`, `Call`, `Modes`,
and `Digital Access`.

## Build

Create a production build:

```bash
npm run build
```

## Notes

See `docs/project-scope.md` for project boundaries and
`docs/apx-cps-notes.md` for APX CPS XML notes.
