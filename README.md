# RB2

RB2 is an open-source amateur radio programming helper for converting
RepeaterBook repeater data into user-reviewable export files.

The APX workflow imports RepeaterBook-style CSV files in the browser. The
KPG-D1N workflow fetches live RepeaterBook county pages through RB2's same-origin
Vite server middleware so the browser does not call RepeaterBook directly.

## What RB2 Does

- Starts with a radio brand selection so manufacturer workflows can diverge.
- Imports one or more RepeaterBook-style CSV files for Motorola APX.
- Fetches live RepeaterBook counties for Kenwood KPG-D1N exports.
- Guides Motorola APX users through Import, APX Settings, Repeaters, Zones, and
  Export steps.
- Filters repeater data by selected APX target bands.
- Lets users review, select, rename, and correct repeater channel data.
- Builds zones with quick grouping, drag-and-drop organization, and manual
  ordering.
- Exports Motorola APX CPS XML files for the currently supported radio module.
- Exports KPG-D1N internal clipboard TSV files from live county selections.
- Provides Generic CSV as a review/interchange export.

Motorola APX and Kenwood KPG-D1N are the currently supported export targets.
Future Motorola-focused modules are planned for TRBO and ASTRO workflows.

APX CPS imports and exports XML files, not CSV. RB2's APX CPS XML export creates
reviewable conventional system, personality, frequency option, and zone/channel
assignment records for CPS import. It is still not a native codeplug.

See `docs/apx-cps-notes.md` for APX-specific behavior, naming limits, band
filtering, P25 NAC handling, and current scan-list limitations. See
`docs/kpg-d1n-notes.md` for KPG-D1N TSV behavior.

## Important Scope

RB2 does not generate Motorola codeplugs directly. It does not create, decode,
edit, or write native Motorola codeplug files. It does not communicate directly
with radios and does not bypass Motorola CPS.

RB2 only generates user-reviewable CSV, XML, and TSV files.

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

KPG-D1N live fetching uses RB2's Vite server middleware. A static `dist` folder
served without that middleware can still load the UI, but it cannot fetch live
RepeaterBook county data.

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

See `docs/project-scope.md` for project boundaries,
`docs/apx-cps-notes.md` for APX CPS XML notes, and
`docs/kpg-d1n-notes.md` for KPG-D1N notes.
