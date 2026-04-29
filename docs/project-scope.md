# RB2 Project Scope

RB2 is an open-source amateur radio programming helper. The browser-only MVP
imports one or more RepeaterBook-style CSV files, guides the user through
Import, Radio, Repeaters, Zones, and Export steps, lets the user choose the
target radio/export module before reviewing conventional amateur repeater
records, organize channels with quick grouping or drag-and-drop zone assignment,
and export user-reviewable CSV or XML files.

The current GUI has five primary steps:

- Import: select one or more RepeaterBook-style CSV files.
- Radio: choose the export module and APX-specific settings, including mobile
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
  Radio step.

RB2 does not:

- Generate, decode, edit, or write native Motorola codeplug files.
- Communicate directly with radios.
- Bypass Motorola CPS or any vendor programming software.
- Include API keys, credentials, or backend services.

The MVP is intentionally limited to lawful amateur radio conventional repeater
data and export workflows that a user can inspect before importing anywhere
else. APX CPS imports/exports XML, so RB2's CPS-oriented APX output is XML.
Those APX CPS XML exports are reviewable intermediate files and are not native
Motorola codeplugs.

RB2 is licensed under the GNU GPLv3. See the repository `LICENSE` file.
