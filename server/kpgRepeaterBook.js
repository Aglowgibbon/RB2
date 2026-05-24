const KPG_HEADERS = [
  'ZoneChChTableAnalogConventionalRxFrequency',
  'ZoneChChTableAnalogConventionalTxFrequency',
  'ZoneChChTableAnalogConventionalTxMode',
  'ZoneChChTableAnalogConventionalTxPower',
  'ZoneChChTableAnalogConventionalQtDqtDecode',
  'ZoneChChTableAnalogConventionalQtDqtEncode',
  'ZoneChChTableAnalogConventionalChannelSpacingAnalog',
  'ZoneChChTableAnalogConventionalChannelName',
  'ZoneChChTableAnalogConventionalScanAdd',
  'ZoneChChTableAnalogConventionalScanListNo',
  'ZoneChChTableAnalogConventionalEmergencyProfileNo',
  'ZoneChChTableAnalogConventionalKeyAssignment',
  'ZoneChChTableAnalogConventionalVoiceAnnouncement',
]

const READABLE_HEADERS = [
  'County',
  'Zone',
  'System',
  'Band',
  'RX Frequency',
  'TX Frequency',
  'Offset',
  'QT/DQT Decode',
  'QT/DQT Encode',
  'KPG Encode Code',
  'Channel Spacing',
  'Channel Name',
  'Location',
  'Call',
  'Use',
  'Status',
  'RepeaterBook Tone',
  'RepeaterBook ID',
  'Source URL',
  'Notes',
]

const BANDS = {
  vhf: {
    key: 'vhf',
    label: 'VHF / 2m',
    repeaterBookId: '4',
    min: 144,
    max: 148,
    defaultSplitMhz: 0.6,
  },
  uhf: {
    key: 'uhf',
    label: 'UHF / 70cm',
    repeaterBookId: '16',
    min: 420,
    max: 450,
    defaultSplitMhz: 5,
  },
}

const DEFAULT_OPTIONS = {
  stateId: '48',
  band: 'vhf',
  operationalOnly: true,
  openOnly: false,
  txPower: 'High',
  spacing: 'Narrow',
  includeSimplex: false,
  includeNonStandard: true,
  includeTones: true,
  includeHeader: true,
  maxNameLength: 0,
}

export async function handleKpgRepeaterBookRequest(req, res, next) {
  const requestUrl = new URL(req.url || '/', 'http://localhost')

  if (!requestUrl.pathname.startsWith('/api/kpg/')) {
    next()
    return
  }

  try {
    if (req.method === 'GET' && requestUrl.pathname === '/api/kpg/counties') {
      const stateId =
        normalizeStateId(requestUrl.searchParams.get('state_id')) ||
        DEFAULT_OPTIONS.stateId
      const counties = await getCounties(stateId)
      sendJson(res, 200, counties)
      return
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/kpg/generate') {
      const body = await readJsonBody(req)
      const payload = await generateKpgExport(body)
      sendJson(res, 200, payload)
      return
    }

    sendJson(res, 404, {
      ok: false,
      error: 'KPG RepeaterBook API route not found.',
    })
  } catch (error) {
    sendJson(res, error.status || 500, {
      ok: false,
      error: error.message || String(error),
    })
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

async function readJsonBody(req) {
  const chunks = []
  let total = 0

  for await (const chunk of req) {
    total += chunk.length
    if (total > 2_000_000) {
      const error = new Error('Request body is too large.')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }

  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : {}
}

async function getCounties(stateId) {
  const url = `https://www.repeaterbook.com/repeaters/county.php?state_id=${encodeURIComponent(stateId)}`
  const html = await fetchText(url)
  const counties = parseCounties(html)

  return {
    source: 'live',
    stateId,
    counties,
  }
}

async function generateKpgExport(body) {
  const options = normalizeOptions(body)
  const counties = normalizeCounties(body.counties)

  if (counties.length === 0) {
    const error = new Error('Select at least one county.')
    error.status = 400
    throw error
  }

  const detailCache = new Map()
  const results = []

  for (const county of counties) {
    const sourceUrl = repeaterBookCountyUrl({
      stateId: options.stateId,
      countyId: county.id,
      bandInfo: options.band,
      operationalOnly: options.operationalOnly,
    })
    const html = await fetchText(sourceUrl)
    const parsed = await parseRepeaterRows(
      html,
      county,
      options.band,
      options,
      sourceUrl,
      detailCache,
    )
    const baseName = `${safeFileName(county.name)}_${options.band.key.toUpperCase()}`
    const kpgFileName = `${baseName}_KPG.tsv`
    const readableFileName = `${baseName}_Readable.csv`

    results.push({
      county,
      sourceUrl,
      count: parsed.repeaters.length,
      warnings: parsed.warnings,
      kpgFileName,
      readableFileName,
      kpgTsv: toTsv(kpgRowsFor(parsed.repeaters, options)),
      readableCsv: toCsv(readableRowsFor(parsed.repeaters)),
      preview: parsed.repeaters.map((row) => ({
        rx: formatFrequency(row.rx),
        tx: formatFrequency(row.tx),
        offset: row.offset,
        channelName: row.channelName,
        location: row.location,
        call: row.call,
        tone: row.encodeTone,
        use: row.use,
        notes: row.notes,
      })),
    })
  }

  return {
    ok: true,
    band: options.band.label,
    generatedAt: new Date().toISOString(),
    options: {
      ...options,
      band: options.band.key,
      bandLabel: options.band.label,
      repeaterBookBandId: options.band.repeaterBookId,
    },
    results,
  }
}

function parseCounties(html) {
  const counties = []
  const seen = new Set()
  const pattern =
    /<input\b(?=[^>]*\bname=["']county_id\[\]["'])(?=[^>]*\bvalue=["']([^"']+)["'])[^>]*>[\s\S]*?<label[^>]*>\s*([\s\S]*?)\s*<\/label>/gi

  for (const match of html.matchAll(pattern)) {
    const id = match[1].trim()
    const name = stripHtml(match[2])
    if (!id || !name || seen.has(id)) continue
    seen.add(id)
    counties.push({ id, name })
  }

  counties.sort((a, b) => a.name.localeCompare(b.name))
  return counties
}

async function parseRepeaterRows(
  html,
  county,
  bandInfo,
  options,
  sourceUrl,
  detailCache,
) {
  const repeaters = []
  const warnings = []
  const rowPattern =
    /<tr\b[\s\S]*?<input\b(?=[^>]*\bexportCheckbox\b)(?<input>[^>]*)>[\s\S]*?<\/tr>/gi

  for (const match of html.matchAll(rowPattern)) {
    const row = match[0]
    const input = match.groups.input || ''
    const rptId =
      input.match(/\bdata-rpt-id=["']([^"']+)["']/i)?.[1] ||
      row.match(/details\.php\?state_id=\d+&amp;ID=(\d+)/i)?.[1] ||
      ''

    const operational =
      /title=["']Operational["']/i.test(row) ||
      /Repeater is operational/i.test(row)
    if (options.operationalOnly && !operational) continue

    const freqMatch = row.match(
      /<td\b[^>]*class=["'][^"']*\bfreq\b[^"']*["'][\s\S]*?<a[^>]*>\s*([\d.]+)\s*<\/a>/i,
    )
    if (!freqMatch) continue

    const rxText = freqMatch[1].trim()
    const rx = Number.parseFloat(rxText)
    if (!Number.isFinite(rx) || rx < bandInfo.min || rx >= bandInfo.max) {
      continue
    }

    const freqCell =
      row.match(
        /<td\b[^>]*class=["'][^"']*\bfreq\b[^"']*["'][\s\S]*?<\/td>/i,
      )?.[0] || ''
    const offset = normalizeOffset(
      freqCell.match(
        /<span\b[^>]*class=["'][^"']*\btext-muted\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
      )?.[1] || '',
    )
    const rawTone = stripHtml(
      row.match(/<!-- Tone -->\s*<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] || '',
    )
    const locationMatch = row.match(
      /<!-- Location \+ Landmark -->\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/i,
    )
    const location = stripHtml(
      locationMatch?.[1] || '',
    )
    const call = stripHtml(
      row.match(/<!-- Call -->\s*<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] || '',
    )
    const use = stripHtml(
      row.match(
        /<!-- Use -->[\s\S]*?<td[^>]*data-sort=["']?([^"'>\s]+)["']?[\s\S]*?<\/td>/i,
      )?.[1] ||
        row.match(/<!-- Use -->[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i)?.[1] ||
        '',
    )

    if (options.openOnly && use.toUpperCase() !== 'OPEN') continue

    const txResult = deriveTxFrequency(rx, offset, options)
    if (txResult.skip) {
      warnings.push(
        `${formatRxText(rxText, rx)} ${location || call || ''}: ${txResult.reason}`.trim(),
      )
      continue
    }

    if (txResult.needsDetail) {
      const detail = await resolveOddSplitFromDetails({
        stateId: options.stateId,
        rptId,
        detailCache,
      })

      if (detail?.uplink !== null && Number.isFinite(detail?.uplink)) {
        txResult.tx = detail.uplink
        txResult.notes = `Odd split resolved from RepeaterBook detail uplink ${formatFrequency(detail.uplink)}.`
        if (detail.offset) txResult.notes += ` Detail offset: ${detail.offset}.`
      } else {
        const detailProblem = detail?.error ? ` (${detail.error})` : ''
        warnings.push(
          `${formatRxText(rxText, rx)} ${location || call || ''}: could not resolve odd split uplink${detailProblem}`.trim(),
        )
        continue
      }
    }

    const channelName = limitName(
      `${formatNameFrequency(rxText, rx)}/${cityNameFromLocation(location)}`,
      options.maxNameLength,
    )
    const encodeTone = toneTextFromAccess(rawTone, options.includeTones)
    const encodeCode = kpgToneCode(rawTone, options.includeTones)
    const notes = []
    if (txResult.notes) notes.push(txResult.notes)
    if (
      Number.isFinite(txResult.tx) &&
      (txResult.tx < bandInfo.min || txResult.tx >= bandInfo.max)
    ) {
      notes.push('TX frequency is outside the selected RX band.')
    }
    if (String(encodeCode).startsWith('D')) {
      notes.push('DCS tone exported as text. Verify the DCS field in KPG-D1N.')
    }
    if (options.maxNameLength > 0 && channelName.length >= options.maxNameLength) {
      notes.push(`Channel name limited to ${options.maxNameLength} characters.`)
    }

    repeaters.push({
      county: county.name,
      zone: county.name,
      system: 1,
      band: bandInfo.label,
      rx,
      tx: txResult.tx,
      offset,
      decodeTone: 'None',
      encodeTone,
      encodeCode,
      spacing: options.spacing,
      channelName,
      location,
      call,
      use,
      status: operational ? 'Operational' : 'Not marked operational',
      rawTone,
      rptId,
      sourceUrl: rptId ? repeaterBookDetailUrl(options.stateId, rptId) : sourceUrl,
      notes: notes.join(' '),
    })
  }

  repeaters.sort(
    (a, b) =>
      a.rx - b.rx ||
      a.location.localeCompare(b.location) ||
      a.call.localeCompare(b.call),
  )
  return { repeaters, warnings }
}

function repeaterBookCountyUrl({
  stateId,
  countyId,
  bandInfo,
  operationalOnly,
}) {
  const url = new URL('https://www.repeaterbook.com/repeaters/county.php')
  url.searchParams.set('search', '1')
  url.searchParams.set('state_id', String(stateId))
  url.searchParams.append('county_id[]', String(countyId))
  url.searchParams.append('band[]', bandInfo.repeaterBookId)
  url.searchParams.set('freq', '')
  url.searchParams.set('call', '')
  url.searchParams.append('mode[]', '1')
  url.searchParams.set('status_id', operationalOnly ? '1' : '%')
  url.searchParams.set('use', '%')
  url.searchParams.set('order', '`freq`, `state_abbrev` ASC')
  return url.toString()
}

function repeaterBookDetailUrl(stateId, rptId) {
  const url = new URL('https://www.repeaterbook.com/repeaters/details.php')
  url.searchParams.set('state_id', String(stateId))
  url.searchParams.set('ID', String(rptId))
  return url.toString()
}

async function resolveOddSplitFromDetails({ stateId, rptId, detailCache }) {
  if (!rptId) return null
  const detailUrl = repeaterBookDetailUrl(stateId, rptId)
  if (detailCache.has(detailUrl)) return detailCache.get(detailUrl)

  const result = { detailUrl, uplink: null, offset: '' }
  try {
    const html = await fetchText(detailUrl)
    const uplinkText = getDetailsField(html, 'Uplink')
    const offsetText = getDetailsField(html, 'Offset')
    const uplink = Number.parseFloat(
      uplinkText.match(/\b(\d{2,4}\.\d+)\b/)?.[1] || '',
    )

    result.uplink = Number.isFinite(uplink) ? uplink : null
    result.offset = offsetText
  } catch (error) {
    result.error = error.message || String(error)
  }

  detailCache.set(detailUrl, result)
  return result
}

function getDetailsField(html, label) {
  const target = label.toLowerCase()
  const rowPattern = /<tr\b[\s\S]*?<\/tr>/gi

  for (const match of html.matchAll(rowPattern)) {
    const row = match[0]
    const th = row.match(/<th\b[^>]*>([\s\S]*?)<\/th>/i)?.[1]
    const td = row.match(/<td\b[^>]*>([\s\S]*?)<\/td>/i)?.[1]
    if (!th || !td) continue

    const name = stripHtml(th).toLowerCase()
    if (name.startsWith(target)) return stripHtml(td)
  }

  return ''
}

async function fetchText(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': 'RB2-KPG-D1N-RepeaterBook/1.0',
      },
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

function normalizeOptions(body) {
  const band = BANDS[body.band] || BANDS[DEFAULT_OPTIONS.band]
  const splitMhz = Number(body.splitMhz)
  const maxNameLength = Number(body.maxNameLength)

  return {
    stateId:
      normalizeStateId(body.stateId) ||
      normalizeStateId(DEFAULT_OPTIONS.stateId),
    band,
    operationalOnly: body.operationalOnly !== false,
    openOnly: body.openOnly === true,
    txPower: ['High', 'Low'].includes(body.txPower)
      ? body.txPower
      : DEFAULT_OPTIONS.txPower,
    spacing: ['Narrow', 'Wide'].includes(body.spacing)
      ? body.spacing
      : DEFAULT_OPTIONS.spacing,
    includeSimplex: body.includeSimplex === true,
    includeNonStandard: body.includeNonStandard !== false,
    includeTones: body.includeTones !== false,
    includeHeader: body.includeHeader !== false,
    splitMhz:
      Number.isFinite(splitMhz) && splitMhz > 0 && splitMhz < 20
        ? splitMhz
        : band.defaultSplitMhz,
    maxNameLength:
      Number.isFinite(maxNameLength) && maxNameLength > 0
        ? Math.min(Math.round(maxNameLength), 64)
        : 0,
  }
}

function normalizeStateId(value) {
  const stateId = String(value || '').trim()
  return /^\d{1,2}$/.test(stateId) ? stateId.padStart(2, '0') : ''
}

function normalizeCounties(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((county) => ({
      id: String(county.id ?? '').trim(),
      name: String(county.name ?? '').trim(),
    }))
    .filter((county) => /^\d{3}$/.test(county.id) && county.name)
}

function deriveTxFrequency(rx, offset, options) {
  if (offset === '+') return { tx: rx + options.splitMhz, notes: '' }
  if (offset === '-') return { tx: rx - options.splitMhz, notes: '' }

  if (offset === 'x' || offset === '') {
    if (!options.includeSimplex) {
      return { skip: true, reason: 'Skipped simplex/no-offset repeater' }
    }
    return { tx: rx, notes: 'Simplex/no offset. TX set equal to RX.' }
  }

  if (offset === 's' || offset) {
    if (!options.includeNonStandard) {
      return { skip: true, reason: `Skipped non-standard offset "${offset}"` }
    }
    return {
      needsDetail: true,
      reason: `Non-standard offset "${offset}" needs RepeaterBook detail uplink`,
    }
  }

  return { tx: rx, notes: '' }
}

function normalizeOffset(offsetText) {
  const value = stripHtml(offsetText)
    .replace(/[\u2212\u2013]/g, '-')
    .replace(/\u2014/g, '')
    .trim()
    .toLowerCase()

  if (!value) return ''
  if (value.includes('+')) return '+'
  if (value === '-' || value.includes('-')) return '-'
  if (value === 'x' || value.includes('simplex')) return 'x'
  if (value === 's' || value.includes('split')) return 's'
  return value
}

function toneTextFromAccess(toneText, includeTones) {
  if (!includeTones) return 'None'
  const tone = String(toneText ?? '').trim()
  if (!tone || tone === 'CSQ' || tone === '-' || tone === '\u2014') {
    return 'None'
  }

  const nums = [...tone.matchAll(/(?<!\d)(\d{2,3}\.\d)(?!\d)/g)]
  if (nums.length > 0) return nums.at(-1)[1]

  const dcs = tone.match(/\bD(?:CS)?\s*(\d{3,4})\b/i)
  if (dcs) return `D${dcs[1]}`

  return 'None'
}

function kpgToneCode(toneText, includeTones) {
  if (!includeTones) return 65535
  const tone = String(toneText ?? '').trim()
  if (!tone || tone === 'CSQ' || tone === '-' || tone === '\u2014') {
    return 65535
  }

  const nums = [...tone.matchAll(/(?<!\d)(\d{2,3})\.(\d)(?!\d)/g)]
  if (nums.length > 0) {
    const last = nums.at(-1)
    return Number(`${last[1]}${last[2]}`)
  }

  const dcs = tone.match(/\bD(?:CS)?\s*(\d{3,4})\b/i)
  if (dcs) return `D${dcs[1]}`

  return 65535
}

function kpgRowsFor(repeaters, options) {
  const rows = repeaters.map((row) => [
    formatFrequency(row.rx),
    formatFrequency(row.tx),
    'Analog',
    options.txPower,
    65535,
    row.encodeCode,
    options.spacing,
    row.channelName,
    'TRUE',
    0,
    255,
    'Common',
    255,
  ])

  return options.includeHeader ? [KPG_HEADERS, ...rows] : rows
}

function readableRowsFor(repeaters) {
  return [
    READABLE_HEADERS,
    ...repeaters.map((row) => [
      row.county,
      row.zone,
      row.system,
      row.band,
      formatFrequency(row.rx),
      formatFrequency(row.tx),
      row.offset,
      row.decodeTone,
      row.encodeTone,
      row.encodeCode,
      row.spacing,
      row.channelName,
      row.location,
      row.call,
      row.use,
      row.status,
      row.rawTone,
      row.rptId,
      row.sourceUrl,
      row.notes,
    ]),
  ]
}

function toCsv(rows) {
  return `${rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')}\r\n`
}

function toTsv(rows) {
  return `${rows.map((row) => row.map(tsvEscape).join('\t')).join('\r\n')}\r\n`
}

function csvEscape(value) {
  const text = String(value ?? '')
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function tsvEscape(value) {
  return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
}

function htmlDecode(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripHtml(value) {
  return htmlDecode(String(value ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function safeFileName(value) {
  return (
    String(value ?? 'export')
      .replace(/[^A-Za-z0-9._ -]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'export'
  )
}

function cityNameFromLocation(location) {
  const city = String(location ?? '').split(',')[0].trim() || 'Unknown'
  return city.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Unknown'
}

function formatRxText(text, rx) {
  const direct = String(text ?? '').trim()
  if (direct) return direct
  return Number(rx.toFixed(4)).toFixed(4)
}

function formatNameFrequency(text, rx) {
  const parsed = Number.parseFloat(String(text ?? ''))
  if (Number.isFinite(parsed)) return String(parsed)
  return String(Number(rx.toFixed(6)))
}

function formatFrequency(value) {
  return String(Number(Number(value).toFixed(6)))
}

function limitName(value, maxLength) {
  const name = String(value ?? '')
  const length = Number(maxLength)
  if (!Number.isFinite(length) || length <= 0 || name.length <= length) {
    return name
  }
  return name.slice(0, length)
}
