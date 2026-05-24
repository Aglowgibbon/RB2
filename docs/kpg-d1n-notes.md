# KPG-D1N Notes

RB2's KPG-D1N workflow fetches live RepeaterBook county pages through the local
Vite server middleware at `/api/kpg/*`. The browser calls RB2, and RB2 performs
the RepeaterBook requests server-side.

The KPG-D1N output is a tab-separated internal clipboard format using the same
headers copied from the KPG-D1N zone/channel grid:

```text
ZoneChChTableAnalogConventionalRxFrequency
ZoneChChTableAnalogConventionalTxFrequency
ZoneChChTableAnalogConventionalTxMode
ZoneChChTableAnalogConventionalTxPower
ZoneChChTableAnalogConventionalQtDqtDecode
ZoneChChTableAnalogConventionalQtDqtEncode
ZoneChChTableAnalogConventionalChannelSpacingAnalog
ZoneChChTableAnalogConventionalChannelName
ZoneChChTableAnalogConventionalScanAdd
ZoneChChTableAnalogConventionalScanListNo
ZoneChChTableAnalogConventionalEmergencyProfileNo
ZoneChChTableAnalogConventionalKeyAssignment
ZoneChChTableAnalogConventionalVoiceAnnouncement
```

Defaults match the original KPG tool:

- VHF uses RepeaterBook band `4`; UHF uses band `16`.
- VHF split defaults to `0.600 MHz`; UHF split defaults to `5.000 MHz`.
- Only analog/FM search results are requested.
- Operational repeaters are included by default.
- County name is used as the KPG zone name.
- Channel name format is `frequency/City_Name`.
- QT/DQT decode is `65535`; encode tones are converted to KPG tone values.
- Odd split rows are included by default and resolved from the RepeaterBook
  detail page uplink value.

Review the preview rows before pasting into KPG-D1N. DCS tones are emitted as
text and should be verified in KPG-D1N.
