# RB2 Project Scope

RB2 is an open-source amateur radio programming helper. The workflow starts with
radio brand selection so manufacturer-specific import paths can diverge. The
Motorola APX workflow imports one or more RepeaterBook-style CSV files, guides
the user through Import, APX Settings, Repeaters, Zones, and Export steps,
reviews conventional amateur repeater records, organizes channels with quick
grouping or drag-and-drop zone assignment, and exports user-reviewable CSV or
XML files. The Kenwood KPG-D1N workflow fetches live RepeaterBook county pages
through RB2's same-origin Vite server middleware and exports KPG-D1N internal
clipboard TSV files.

The current GUI starts with a Brand step. Motorola then uses these steps:

- Import: select one or more RepeaterBook-style CSV files.
- APX Settings: choose APX-specific settings, including mobile
  or portable radio type, model-sensitive options, top display behavior, APX
  names, and target APX bands. The user must select at least one APX target band
  before continuing.
- Repeaters: select channels, review the default radio channel names that will
  be exported, enable channel-name edit mode for custom names, and enable
  imported-data edit mode to correct frequency, tone, mode, callsign, location,
  or P25 NAC data. When APX target bands are selected, this step shows only
  repeaters inside those bands.
- Zones: create, rename, delete, and organize zones. Unassigned channels stay on
  the left, while user-created and auto-generated zones appear on the right.
  Users can move all unassigned channels into a zone, reorder zones, reorder
  channels within a zone, and use quick grouping by state, county, city, amateur
  band, or mode.
- Export: download APX CPS XML or Generic CSV using the settings chosen in the
  APX Settings step.

Kenwood currently uses a KPG-D1N step after Brand selection.

The KPG-D1N live panel keeps the existing KPG behavior: state and county
selection, VHF or UHF band selection, operational/open filters, simplex and odd
split options, tone encoding, KPG header-row control, preview rows, copy to
clipboard, and TSV download. KPG zones use county names and KPG channel names use
the `frequency/City_Name` format.

RB2 does not:

- Generate, decode, edit, or write native Motorola codeplug files.
- Communicate directly with radios.
- Bypass Motorola CPS or any vendor programming software.
- Include API keys or credentials.

The MVP is intentionally limited to lawful amateur radio conventional repeater
data and export workflows that a user can inspect before importing anywhere
else. APX CPS imports/exports XML, so RB2's CPS-oriented APX output is XML.
Those APX CPS XML exports are reviewable intermediate files and are not native
Motorola codeplugs. KPG-D1N TSV exports are also reviewable intermediate files
for paste/import workflows in KPG-D1N.

RB2 is licensed under the GNU GPLv3. See the repository `LICENSE` file.
