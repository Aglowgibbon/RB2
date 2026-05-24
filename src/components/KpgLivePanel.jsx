import { useEffect, useMemo, useState } from 'react'

const US_STATES = [
  { id: '01', name: 'Alabama' },
  { id: '02', name: 'Alaska' },
  { id: '04', name: 'Arizona' },
  { id: '05', name: 'Arkansas' },
  { id: '06', name: 'California' },
  { id: '08', name: 'Colorado' },
  { id: '09', name: 'Connecticut' },
  { id: '10', name: 'Delaware' },
  { id: '11', name: 'District of Columbia' },
  { id: '12', name: 'Florida' },
  { id: '13', name: 'Georgia' },
  { id: '15', name: 'Hawaii' },
  { id: '16', name: 'Idaho' },
  { id: '17', name: 'Illinois' },
  { id: '18', name: 'Indiana' },
  { id: '19', name: 'Iowa' },
  { id: '20', name: 'Kansas' },
  { id: '21', name: 'Kentucky' },
  { id: '22', name: 'Louisiana' },
  { id: '23', name: 'Maine' },
  { id: '24', name: 'Maryland' },
  { id: '25', name: 'Massachusetts' },
  { id: '26', name: 'Michigan' },
  { id: '27', name: 'Minnesota' },
  { id: '28', name: 'Mississippi' },
  { id: '29', name: 'Missouri' },
  { id: '30', name: 'Montana' },
  { id: '31', name: 'Nebraska' },
  { id: '32', name: 'Nevada' },
  { id: '33', name: 'New Hampshire' },
  { id: '34', name: 'New Jersey' },
  { id: '35', name: 'New Mexico' },
  { id: '36', name: 'New York' },
  { id: '37', name: 'North Carolina' },
  { id: '38', name: 'North Dakota' },
  { id: '39', name: 'Ohio' },
  { id: '40', name: 'Oklahoma' },
  { id: '41', name: 'Oregon' },
  { id: '42', name: 'Pennsylvania' },
  { id: '44', name: 'Rhode Island' },
  { id: '45', name: 'South Carolina' },
  { id: '46', name: 'South Dakota' },
  { id: '47', name: 'Tennessee' },
  { id: '48', name: 'Texas' },
  { id: '49', name: 'Utah' },
  { id: '50', name: 'Vermont' },
  { id: '51', name: 'Virginia' },
  { id: '53', name: 'Washington' },
  { id: '54', name: 'West Virginia' },
  { id: '55', name: 'Wisconsin' },
  { id: '56', name: 'Wyoming' },
  { id: '66', name: 'Guam' },
  { id: '72', name: 'Puerto Rico' },
  { id: '78', name: 'Virgin Islands' },
]

const DEFAULT_SPLITS = { vhf: '0.6', uhf: '5' }
const DFW_COUNTY_IDS = new Set(['113', '251', '139', '439', '121', '497', '231', '085'])
const DEFAULT_STATUS = {
  kind: '',
  text: 'Loading counties from RepeaterBook.',
}

function KpgLivePanel() {
  const [options, setOptions] = useState({
    stateId: '48',
    band: 'vhf',
    splitMhz: DEFAULT_SPLITS.vhf,
    operationalOnly: true,
    openOnly: false,
    txPower: 'High',
    spacing: 'Narrow',
    includeSimplex: false,
    includeNonStandard: true,
    includeTones: true,
    includeHeader: true,
    maxNameLength: '0',
  })
  const [counties, setCounties] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [countyFilter, setCountyFilter] = useState('')
  const [status, setStatus] = useState(DEFAULT_STATUS)
  const [isLoadingCounties, setIsLoadingCounties] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [payload, setPayload] = useState(null)

  const visibleCounties = useMemo(() => {
    const needle = countyFilter.trim().toLowerCase()
    if (!needle) return counties

    return counties.filter(
      (county) =>
        county.name.toLowerCase().includes(needle) || county.id.includes(needle),
    )
  }, [counties, countyFilter])

  const selectedCounties = useMemo(() => {
    const countiesById = new Map(counties.map((county) => [county.id, county]))
    return [...selectedIds]
      .map((id) => countiesById.get(id))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [counties, selectedIds])

  useEffect(() => {
    let cancelled = false

    async function loadCounties() {
      setIsLoadingCounties(true)
      setCounties([])
      setSelectedIds(new Set())
      setPayload(null)
      setStatus({ kind: '', text: 'Loading counties from RepeaterBook.' })

      try {
        const response = await fetch(
          `/api/kpg/counties?state_id=${encodeURIComponent(options.stateId)}`,
        )
        const countyPayload = await response.json()
        if (!response.ok) {
          throw new Error(countyPayload.error || 'County load failed.')
        }
        if (cancelled) return

        setCounties(countyPayload.counties || [])
        setStatus({
          kind: 'good',
          text: `Loaded ${(countyPayload.counties || []).length} counties.`,
        })
      } catch (error) {
        if (cancelled) return
        setStatus({
          kind: 'bad',
          text: error.message || String(error),
        })
      } finally {
        if (!cancelled) setIsLoadingCounties(false)
      }
    }

    loadCounties()

    return () => {
      cancelled = true
    }
  }, [options.stateId])

  function updateOption(name, value) {
    setOptions((current) => {
      if (name === 'band') {
        return {
          ...current,
          band: value,
          splitMhz: DEFAULT_SPLITS[value] || current.splitMhz,
        }
      }

      return {
        ...current,
        [name]: value,
      }
    })
  }

  function toggleOption(name) {
    setOptions((current) => ({
      ...current,
      [name]: !current[name],
    }))
  }

  function toggleCounty(countyId, selected) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (selected) next.add(countyId)
      else next.delete(countyId)
      return next
    })
  }

  function selectVisibleCounties() {
    setSelectedIds((current) => {
      const next = new Set(current)
      visibleCounties.forEach((county) => next.add(county.id))
      return next
    })
  }

  function clearSelectedCounties() {
    setSelectedIds(new Set())
  }

  function selectDfwPreset() {
    setSelectedIds(() => {
      const next = new Set()
      counties.forEach((county) => {
        if (DFW_COUNTY_IDS.has(county.id)) next.add(county.id)
      })
      return next
    })
  }

  async function generateKpgExport() {
    if (selectedCounties.length === 0) {
      setStatus({ kind: 'bad', text: 'Select at least one county.' })
      return
    }

    setIsGenerating(true)
    setStatus({
      kind: '',
      text: `Fetching ${selectedCounties.length} county page${selectedCounties.length === 1 ? '' : 's'} from RepeaterBook.`,
    })

    try {
      const response = await fetch('/api/kpg/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...options,
          splitMhz: Number(options.splitMhz),
          maxNameLength: Number(options.maxNameLength),
          counties: selectedCounties,
        }),
      })
      const resultPayload = await response.json()
      if (!response.ok) {
        throw new Error(resultPayload.error || 'KPG generation failed.')
      }

      const totalRepeaters = resultPayload.results.reduce(
        (sum, result) => sum + result.count,
        0,
      )
      setPayload(resultPayload)
      setStatus({
        kind: 'good',
        text: `Generated ${totalRepeaters} KPG channel${totalRepeaters === 1 ? '' : 's'}.`,
      })
    } catch (error) {
      setStatus({ kind: 'bad', text: error.message || String(error) })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section className="panel kpg-live-panel" aria-labelledby="kpg-live-title">
      <div className="panel-heading">
        <div>
          <h2 id="kpg-live-title">KPG-D1N Live RepeaterBook</h2>
          <p>Fetch county repeaters and generate KPG-D1N paste data.</p>
        </div>
        <div className="kpg-selected-count">
          {selectedCounties.length} selected
        </div>
      </div>

      <div className="kpg-workspace">
        <div className="kpg-controls">
          <div className="control-group kpg-selector-group">
            <div className="control-group-heading">
              <h3>Selection</h3>
              <p>State, band, and counties.</p>
            </div>
            <div className="kpg-control-grid">
              <label className="field-control">
                <span>State</span>
                <select
                  value={options.stateId}
                  onChange={(event) => updateOption('stateId', event.target.value)}
                  disabled={isLoadingCounties || isGenerating}
                >
                  {US_STATES.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Band</span>
                <select
                  value={options.band}
                  onChange={(event) => updateOption('band', event.target.value)}
                  disabled={isGenerating}
                >
                  <option value="vhf">VHF / 2m</option>
                  <option value="uhf">UHF / 70cm</option>
                </select>
              </label>
              <label className="field-control">
                <span>Split MHz</span>
                <input
                  min="0.001"
                  step="0.001"
                  type="number"
                  value={options.splitMhz}
                  onChange={(event) => updateOption('splitMhz', event.target.value)}
                  disabled={isGenerating}
                />
              </label>
            </div>

            <div className="county-tools">
              <label className="field-control">
                <span>County filter</span>
                <input
                  type="search"
                  value={countyFilter}
                  onChange={(event) => setCountyFilter(event.target.value)}
                  disabled={isLoadingCounties}
                />
              </label>
              <div className="kpg-button-row">
                {options.stateId === '48' ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={selectDfwPreset}
                    disabled={isLoadingCounties || counties.length === 0}
                  >
                    DFW preset
                  </button>
                ) : null}
                <button
                  className="secondary-button"
                  type="button"
                  onClick={selectVisibleCounties}
                  disabled={isLoadingCounties || visibleCounties.length === 0}
                >
                  Select visible
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={clearSelectedCounties}
                  disabled={selectedIds.size === 0}
                >
                  Clear
                </button>
              </div>

              <div className="county-list" data-testid="kpg-county-list">
                {visibleCounties.length === 0 ? (
                  <div className="county-row empty-county-row">
                    {isLoadingCounties ? 'Loading counties.' : 'No counties found.'}
                  </div>
                ) : (
                  visibleCounties.map((county) => (
                    <label key={county.id} className="county-row">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(county.id)}
                        onChange={(event) =>
                          toggleCounty(county.id, event.target.checked)
                        }
                      />
                      <span>{county.name}</span>
                      <small>{county.id}</small>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="control-group kpg-options-group">
            <div className="control-group-heading">
              <h3>KPG Options</h3>
              <p>KPG-D1N analog paste defaults.</p>
            </div>
            <div className="kpg-control-grid">
              <label className="field-control">
                <span>TX power</span>
                <select
                  value={options.txPower}
                  onChange={(event) => updateOption('txPower', event.target.value)}
                  disabled={isGenerating}
                >
                  <option value="High">High</option>
                  <option value="Low">Low</option>
                </select>
              </label>
              <label className="field-control">
                <span>Spacing</span>
                <select
                  value={options.spacing}
                  onChange={(event) => updateOption('spacing', event.target.value)}
                  disabled={isGenerating}
                >
                  <option value="Narrow">Narrow</option>
                  <option value="Wide">Wide</option>
                </select>
              </label>
              <label className="field-control">
                <span>Name length</span>
                <select
                  value={options.maxNameLength}
                  onChange={(event) =>
                    updateOption('maxNameLength', event.target.value)
                  }
                  disabled={isGenerating}
                >
                  <option value="0">No limit</option>
                  <option value="16">16 chars</option>
                  <option value="20">20 chars</option>
                  <option value="24">24 chars</option>
                  <option value="32">32 chars</option>
                </select>
              </label>
            </div>

            <div className="kpg-checkbox-grid">
              <label>
                <input
                  type="checkbox"
                  checked={options.operationalOnly}
                  onChange={() => toggleOption('operationalOnly')}
                  disabled={isGenerating}
                />
                Online only
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.openOnly}
                  onChange={() => toggleOption('openOnly')}
                  disabled={isGenerating}
                />
                Open use only
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.includeSimplex}
                  onChange={() => toggleOption('includeSimplex')}
                  disabled={isGenerating}
                />
                Include simplex
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.includeNonStandard}
                  onChange={() => toggleOption('includeNonStandard')}
                  disabled={isGenerating}
                />
                Include odd split
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.includeTones}
                  onChange={() => toggleOption('includeTones')}
                  disabled={isGenerating}
                />
                Encode tones
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.includeHeader}
                  onChange={() => toggleOption('includeHeader')}
                  disabled={isGenerating}
                />
                KPG header row
              </label>
            </div>

            <div className={`kpg-status ${status.kind}`.trim()}>{status.text}</div>
            <button
              className="primary-button"
              type="button"
              onClick={generateKpgExport}
              disabled={
                isLoadingCounties || isGenerating || selectedCounties.length === 0
              }
            >
              {isGenerating ? 'Generating...' : 'Generate KPG exports'}
            </button>
          </div>
        </div>

        <KpgResults payload={payload} />
      </div>
    </section>
  )
}

function KpgResults({ payload }) {
  if (!payload) {
    return (
      <div className="kpg-results-empty">
        Generated KPG-D1N previews will appear here.
      </div>
    )
  }

  const total = payload.results.reduce((sum, result) => sum + result.count, 0)

  return (
    <div className="kpg-results" aria-live="polite">
      <div className="kpg-run-summary">
        <strong>{total}</strong> channel{total === 1 ? '' : 's'} across{' '}
        <strong>{payload.results.length}</strong> county
        {payload.results.length === 1 ? '' : 'ies'}.
      </div>
      {payload.results.map((result) => (
        <KpgResultCard key={result.county.id} result={result} />
      ))}
    </div>
  )
}

function KpgResultCard({ result }) {
  const [copyLabel, setCopyLabel] = useState('Copy TSV')

  async function copyTsv() {
    await copyText(result.kpgTsv)
    setCopyLabel('Copied')
    window.setTimeout(() => setCopyLabel('Copy TSV'), 1400)
  }

  return (
    <article className="kpg-result-card">
      <div className="kpg-result-head">
        <div>
          <h3>{result.county.name}</h3>
          <p>
            {result.count} channel{result.count === 1 ? '' : 's'}
          </p>
        </div>
        <div className="kpg-button-row">
          <button
            className="secondary-button"
            type="button"
            onClick={copyTsv}
            disabled={result.count === 0}
          >
            {copyLabel}
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText(
                result.kpgFileName,
                result.kpgTsv,
                'text/tab-separated-values;charset=utf-8',
              )
            }
            disabled={result.count === 0}
          >
            Download TSV
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              downloadText(
                result.readableFileName,
                result.readableCsv,
                'text/csv;charset=utf-8',
              )
            }
            disabled={result.count === 0}
          >
            Download CSV
          </button>
        </div>
      </div>

      {result.warnings.length > 0 ? (
        <ul className="kpg-warning-list">
          {result.warnings.slice(0, 8).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
          {result.warnings.length > 8 ? (
            <li>{result.warnings.length - 8} additional warnings.</li>
          ) : null}
        </ul>
      ) : null}

      <div className="kpg-preview-wrap">
        <table className="kpg-preview-table">
          <thead>
            <tr>
              <th scope="col">RX</th>
              <th scope="col">TX</th>
              <th scope="col">Offset</th>
              <th scope="col">Name</th>
              <th scope="col">Location</th>
              <th scope="col">Call</th>
              <th scope="col">Tone</th>
              <th scope="col">Use</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {result.preview.length === 0 ? (
              <tr>
                <td colSpan="9">No repeaters matched.</td>
              </tr>
            ) : (
              result.preview.map((repeater) => (
                <tr
                  key={`${repeater.rx}-${repeater.tx}-${repeater.channelName}`}
                >
                  <td>{repeater.rx}</td>
                  <td>{repeater.tx}</td>
                  <td>{repeater.offset}</td>
                  <td>{repeater.channelName}</td>
                  <td>{repeater.location}</td>
                  <td>{repeater.call}</td>
                  <td>{repeater.tone}</td>
                  <td>{repeater.use}</td>
                  <td>{repeater.notes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  )
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

export default KpgLivePanel
