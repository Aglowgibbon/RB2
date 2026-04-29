const DEFAULT_CHANNEL_NAME = 'Repeater'

export function buildDefaultChannelName(repeater) {
  const callsign = String(repeater.callsign || '').trim()
  const rxFrequency = formatDisplayFrequency(repeater.rxFrequency)
  const name = [callsign, rxFrequency].filter(Boolean).join(' ').trim()

  return name || DEFAULT_CHANNEL_NAME
}

export function getDisplayChannelName(repeater) {
  return repeater.channelNameCustom
    ? repeater.channelName || buildDefaultChannelName(repeater)
    : buildDefaultChannelName(repeater)
}

function formatDisplayFrequency(value) {
  const frequency = Number(value)
  if (!frequency) return ''
  return frequency.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}
