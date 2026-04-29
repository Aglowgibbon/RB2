export const APX_BANDS = [
  {
    id: 'vhf',
    label: 'VHF',
    minMhz: 136,
    maxMhz: 174,
  },
  {
    id: 'uhf1',
    label: 'UHF 1',
    minMhz: 380,
    maxMhz: 470,
  },
  {
    id: 'uhf2',
    label: 'UHF 2',
    minMhz: 450,
    maxMhz: 520,
  },
  {
    id: '700800',
    label: '700/800 MHz',
    minMhz: 764,
    maxMhz: 870,
  },
  {
    id: '900',
    label: '900 MHz',
    minMhz: 896,
    maxMhz: 941,
  },
]

export const DEFAULT_APX_BANDS = []

export function getBandForFrequency(frequencyMhz) {
  const frequency = Number(frequencyMhz)
  if (!frequency) return null
  return (
    APX_BANDS.find(
      (band) => frequency >= band.minMhz && frequency <= band.maxMhz,
    ) || null
  )
}

export function repeaterMatchesApxBands(repeater, selectedBandIds) {
  if (!selectedBandIds.length) return false

  const enabledBands = new Set(selectedBandIds)
  const rxBand = getBandForFrequency(repeater.rxFrequency)
  const txBand = getBandForFrequency(repeater.txFrequency || repeater.rxFrequency)

  return Boolean(
    rxBand &&
      txBand &&
      enabledBands.has(rxBand.id) &&
      enabledBands.has(txBand.id),
  )
}
