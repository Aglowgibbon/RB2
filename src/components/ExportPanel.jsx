function ExportPanel({ selectedCount, onExport }) {
  return (
    <section className="panel export-panel" aria-labelledby="export-title">
      <div>
        <h2 id="export-title">Export Builder</h2>
        <p>
          Download the selected repeaters using the radio settings chosen
          earlier in the workflow.
        </p>
      </div>
      <div className="export-controls">
        <div className="control-group download-group">
          <div className="control-group-heading">
            <h3>Download</h3>
            <p>{selectedCount} selected channel{selectedCount === 1 ? '' : 's'}</p>
          </div>
          <div className="export-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => onExport('apxXml')}
              disabled={selectedCount === 0}
            >
              APX CPS XML
            </button>
          </div>
          <div className="secondary-export-actions">
            <p>Additional download</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onExport('generic')}
              disabled={selectedCount === 0}
            >
              Generic CSV
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ExportPanel
