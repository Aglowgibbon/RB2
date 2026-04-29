import { APX_NAME_MAX_LENGTH } from '../modules/apx/apxConstraints'
import { APX_BANDS } from '../modules/apx/apxBands'

function ExportPanel({
  selectedCount,
  apxOptions,
  onApxOptionsChange,
  onExport,
}) {
  function updateApxOption(name, value) {
    onApxOptionsChange((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function toggleApxBand(bandId) {
    onApxOptionsChange((current) => {
      const enabledBands = new Set(current.enabledBands)
      if (enabledBands.has(bandId)) {
        enabledBands.delete(bandId)
      } else {
        enabledBands.add(bandId)
      }

      return {
        ...current,
        enabledBands: [...enabledBands],
      }
    })
  }

  return (
    <section className="panel export-panel" aria-labelledby="export-title">
      <div>
        <h2 id="export-title">Export</h2>
        <p>
          Generic CSV is for review and non-CPS workflows. APX CPS uses XML, and
          RB2 does not generate native Motorola codeplug files.
        </p>
        <p className="constraint-note">
          APX XML uses RB2's built-in conventional analog template.
        </p>
      </div>
      <div className="export-controls">
        <label className="field-control">
          <span>APX personality base</span>
          <input
            maxLength={APX_NAME_MAX_LENGTH}
            value={apxOptions.personalityName}
            onChange={(event) =>
              updateApxOption('personalityName', event.target.value)
            }
          />
        </label>
        <label className="field-control">
          <span>APX radio type</span>
          <select
            value={apxOptions.radioType}
            onChange={(event) => updateApxOption('radioType', event.target.value)}
          >
            <option value="mobile">Mobile</option>
            <option value="portable">Portable</option>
          </select>
        </label>
        {apxOptions.radioType === 'portable' ? (
          <>
            <label className="field-control">
              <span>Portable model</span>
              <select
                value={apxOptions.portableModel}
                onChange={(event) =>
                  updateApxOption('portableModel', event.target.value)
                }
              >
                <option value="srx2200">SRX 2200</option>
                <option value="apx8000">APX 8000</option>
              </select>
            </label>
            <label className="field-control">
              <span>Top channel name</span>
              <select
                value={apxOptions.portableTopChannelName}
                onChange={(event) =>
                  updateApxOption('portableTopChannelName', event.target.value)
                }
              >
                <option value="callsign">Callsign</option>
                <option value="rxFrequency">RX frequency</option>
              </select>
            </label>
          </>
        ) : null}
        <fieldset className="band-control">
          <legend>APX bands</legend>
          <div>
            {APX_BANDS.map((band) => (
              <label key={band.id}>
                <input
                  checked={apxOptions.enabledBands.includes(band.id)}
                  type="checkbox"
                  onChange={() => toggleApxBand(band.id)}
                />
                <span>{band.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="export-actions">
        <button
          type="button"
          onClick={() => onExport('generic')}
          disabled={selectedCount === 0}
        >
          Generic CSV
        </button>
        <button
          type="button"
          onClick={() => onExport('apxXml')}
          disabled={selectedCount === 0}
        >
          APX CPS XML
        </button>
        <button
          type="button"
          onClick={() => onExport('apx')}
          disabled={selectedCount === 0}
        >
          APX review CSV
        </button>
        </div>
      </div>
    </section>
  )
}

export default ExportPanel
