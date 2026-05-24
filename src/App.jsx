import { useMemo, useState } from 'react'
import { parseCsv } from './core/csvUtils'
import { getDisplayChannelName } from './core/channelNames'
import { normalizeRepeater } from './core/normalizeRepeater'
import { APX_NAME_MAX_LENGTH, sanitizeApxName } from './modules/apx/apxConstraints'
import { exportApxCsv } from './modules/apx/exportApxCsv'
import { repeaterMatchesApxBands } from './modules/apx/apxBands'
import { exportApxCpsXml } from './modules/apx/exportApxCpsXml'
import { exportGenericCsv } from './modules/generic/exportGenericCsv'
import BrandPanel from './components/BrandPanel'
import ImportPanel from './components/ImportPanel'
import RadioPanel from './components/RadioPanel'
import RepeaterTable from './components/RepeaterTable'
import ZoneBuilder from './components/ZoneBuilder'
import ExportPanel from './components/ExportPanel'
import KpgLivePanel from './components/KpgLivePanel'
import rb2Logo from './assets/rb2-logo.png'
import './styles.css'

const DEFAULT_ZONE = 'Unassigned'
const BRAND_STEP = { id: 'brand', label: 'Brand' }
const MOTOROLA_WORKFLOW_STEPS = [
  BRAND_STEP,
  { id: 'import', label: 'Import' },
  { id: 'radio', label: 'APX Settings' },
  { id: 'repeaters', label: 'Repeaters' },
  { id: 'zones', label: 'Zones' },
  { id: 'export', label: 'Export' },
]
const KENWOOD_WORKFLOW_STEPS = [
  BRAND_STEP,
  { id: 'kpg', label: 'KPG-D1N' },
]

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function App() {
  const [repeaters, setRepeaters] = useState([])
  const [zoneOrder, setZoneOrder] = useState([DEFAULT_ZONE])
  const [importName, setImportName] = useState('')
  const [message, setMessage] = useState(
    'Import a RepeaterBook CSV for the selected Motorola workflow.',
  )
  const [activeStep, setActiveStep] = useState('brand')
  const [radioBrand, setRadioBrand] = useState('')
  const [exportModule, setExportModule] = useState('apx')
  const [apxOptions, setApxOptions] = useState({
    personalityName: 'RB2',
    systemName: 'RB2 Cnv Sys',
    radioType: 'mobile',
    portableModel: 'srx2200',
    portableTopChannelName: 'callsign',
    enabledBands: [],
  })
  const bandFilteredRepeaters = useMemo(
    () =>
      getBandFilteredRepeaters(repeaters, exportModule, apxOptions.enabledBands),
    [apxOptions.enabledBands, exportModule, repeaters],
  )

  const zones = useMemo(() => {
    const zoneSet = new Set(
      bandFilteredRepeaters.map((repeater) => repeater.zone).filter(Boolean),
    )
    zoneOrder.forEach((zone) => zoneSet.add(zone))
    const orderedZones = zoneOrder.filter((zone) => zoneSet.has(zone))
    const unorderedZones = [...zoneSet].filter((zone) => !zoneOrder.includes(zone))
    return [...orderedZones, ...unorderedZones]
  }, [bandFilteredRepeaters, zoneOrder])

  const selectedRepeaters = useMemo(
    () =>
      zones.flatMap((zone) =>
        bandFilteredRepeaters.filter(
          (repeater) =>
            repeater.selected &&
            (repeater.zone || DEFAULT_ZONE) === zone,
        ),
      ),
    [bandFilteredRepeaters, zones],
  )

  const zoneSummaries = useMemo(() => {
    const summaries = new Map()

    bandFilteredRepeaters.forEach((repeater) => {
      const zone = repeater.zone || DEFAULT_ZONE
      const current = summaries.get(zone) || { name: zone, total: 0, selected: 0 }
      current.total += 1
      if (repeater.selected) current.selected += 1
      summaries.set(zone, current)
    })

    zoneOrder.forEach((zone) => {
      if (!summaries.has(zone)) {
        summaries.set(zone, { name: zone, total: 0, selected: 0 })
      }
    })

    return zones
      .map((zone) => summaries.get(zone))
      .filter(Boolean)
  }, [bandFilteredRepeaters, zoneOrder, zones])

  function handleFilesLoaded(files, readError) {
    if (readError) {
      setRepeaters([])
      setZoneOrder([DEFAULT_ZONE])
      setImportName('')
      setMessage(readError.message)
      setActiveStep('import')
      return
    }

    try {
      const normalized = files.flatMap((file, fileIndex) => {
        const rows = parseCsv(file.text)
        return rows.map((row, rowIndex) =>
          normalizeRepeater(row, {
            fallbackId: `file-${fileIndex + 1}-repeater-${rowIndex + 1}`,
            defaultZone: DEFAULT_ZONE,
          }),
        )
      })
      const fileCount = files.length
      const importLabel =
        fileCount === 1 ? files[0].name : `rb2-${fileCount}-csv-files`

      setRepeaters(normalized)
      setZoneOrder([DEFAULT_ZONE])
      setImportName(importLabel)
      setMessage(
        `Loaded ${normalized.length} repeater record${normalized.length === 1 ? '' : 's'} from ${fileCount} CSV file${fileCount === 1 ? '' : 's'}.`,
      )
      if (normalized.length > 0) setActiveStep('radio')
    } catch (error) {
      setRepeaters([])
      setZoneOrder([DEFAULT_ZONE])
      setImportName('')
      setMessage(error.message)
      setActiveStep('import')
    }
  }

  function updateRepeater(id, updates) {
    setRepeaters((current) =>
      current.map((repeater) =>
        repeater.id === id ? applyRepeaterUpdates(repeater, updates) : repeater,
      ),
    )
  }

  function setAllSelected(selected, visibleIds = null) {
    const visibleSet = visibleIds ? new Set(visibleIds) : null
    setRepeaters((current) =>
      current.map((repeater) =>
        !visibleSet || visibleSet.has(repeater.id)
          ? { ...repeater, selected }
          : repeater,
      ),
    )
  }

  function addZonesToOrder(zoneNames) {
    setZoneOrder((current) => {
      const next = [...current]
      zoneNames.forEach((zoneName) => {
        const cleanZone = truncateZoneName(zoneName)
        if (
          cleanZone &&
          !next.some((zone) => zone.toLowerCase() === cleanZone.toLowerCase())
        ) {
          next.push(cleanZone)
        }
      })
      return next
    })
  }

  function autoAssignSelectedZones(strategy, visibleIds = null) {
    const visibleSet = visibleIds ? new Set(visibleIds) : null
    setRepeaters((current) => {
      const next = current.map((repeater) =>
        repeater.selected && (!visibleSet || visibleSet.has(repeater.id))
          ? { ...repeater, zone: buildZoneName(repeater, strategy) }
          : repeater,
      )
      addZonesToOrder(next.map((repeater) => repeater.zone))
      return next
    })
  }

  function addCustomZone(zoneName) {
    const cleanZone = truncateZoneName(zoneName)
    if (!cleanZone) return

    addZonesToOrder([cleanZone])
  }

  function moveRepeaterToZone(repeaterId, zoneName) {
    const cleanZone = truncateZoneName(zoneName)
    addZonesToOrder([cleanZone])
    setRepeaters((current) => moveRepeaterToZoneEnd(current, repeaterId, cleanZone))
  }

  function moveRepeaterToPosition(repeaterId, targetRepeaterId, zoneName) {
    const cleanZone = truncateZoneName(zoneName)
    addZonesToOrder([cleanZone])
    setRepeaters((current) =>
      moveRepeaterBeforeTarget(current, repeaterId, targetRepeaterId, cleanZone),
    )
  }

  function moveAllUnassignedToZone(zoneName, visibleIds = null) {
    const cleanZone = truncateZoneName(zoneName)
    if (!cleanZone || cleanZone === DEFAULT_ZONE) return

    const visibleSet = visibleIds ? new Set(visibleIds) : null
    addZonesToOrder([cleanZone])
    setRepeaters((current) =>
      current.map((repeater) =>
        (repeater.zone || DEFAULT_ZONE) === DEFAULT_ZONE &&
        (!visibleSet || visibleSet.has(repeater.id))
          ? { ...repeater, zone: cleanZone }
          : repeater,
      ),
    )
  }

  function moveRepeaterWithinZone(repeaterId, direction) {
    setRepeaters((current) => reorderRepeaterWithinZone(current, repeaterId, direction))
  }

  function moveZone(zoneName, direction) {
    const cleanZone = truncateZoneName(zoneName)
    if (cleanZone === DEFAULT_ZONE) return

    setZoneOrder((current) => reorderZone(current, cleanZone, direction, zones))
  }

  function renameZone(oldZoneName, newZoneName) {
    const oldZone = truncateZoneName(oldZoneName)
    const newZone = truncateZoneName(newZoneName)
    if (!newZone || oldZone === DEFAULT_ZONE || oldZone === newZone) return

    setZoneOrder((current) => {
      const withoutOldZone = current.filter(
        (zone) => zone.toLowerCase() !== oldZone.toLowerCase(),
      )

      return withoutOldZone.some(
        (zone) => zone.toLowerCase() === newZone.toLowerCase(),
      )
        ? withoutOldZone
        : [...withoutOldZone, newZone]
    })
    setRepeaters((current) =>
      current.map((repeater) =>
        repeater.zone === oldZone ? { ...repeater, zone: newZone } : repeater,
      ),
    )
  }

  function deleteZone(zoneName) {
    const cleanZone = truncateZoneName(zoneName)
    if (cleanZone === DEFAULT_ZONE) return

    setZoneOrder((current) => current.filter((zone) => zone !== cleanZone))
    setRepeaters((current) =>
      current.map((repeater) =>
        repeater.zone === cleanZone
          ? { ...repeater, zone: DEFAULT_ZONE }
          : repeater,
      ),
    )
  }

  function clearSelectedZones(visibleIds = null) {
    const visibleSet = visibleIds ? new Set(visibleIds) : null
    setRepeaters((current) =>
      current.map((repeater) =>
        repeater.selected && (!visibleSet || visibleSet.has(repeater.id))
          ? { ...repeater, zone: DEFAULT_ZONE }
          : repeater,
      ),
    )
  }

  function handleExport(type) {
    if (selectedRepeaters.length === 0) {
      setMessage('Select at least one repeater before exporting.')
      return
    }

    const baseName = importName.replace(/\.[^.]+$/, '') || 'rb2-repeaters'
    const timestamp = new Date().toISOString().slice(0, 10)

    if (type === 'apx') {
      downloadCsv(`${baseName}-apx-${timestamp}.csv`, exportApxCsv(selectedRepeaters))
      setMessage('Created APX review CSV. Use APX CPS XML for CPS import/export workflows.')
      return
    }

    if (type === 'apxXml') {
      const xmlExport = exportApxCpsXml(selectedRepeaters, apxOptions)
      if (xmlExport.channelCount === 0) {
        setMessage(xmlExport.message)
        return
      }
      downloadCsv(`${baseName}-apx-cps-${timestamp}.xml`, xmlExport.content)
      setMessage(xmlExport.message)
      return
    }

    downloadCsv(
      `${baseName}-generic-${timestamp}.csv`,
      exportGenericCsv(selectedRepeaters),
    )
  }

  const workflowSteps = getWorkflowSteps(radioBrand)
  const activeStepIndex = workflowSteps.findIndex((step) => step.id === activeStep)
  const currentStepIndex = activeStepIndex === -1 ? 0 : activeStepIndex
  const canLeaveImport = repeaters.length > 0
  const canLeaveRadio =
    exportModule !== 'apx' || apxOptions.enabledBands.length > 0
  const canMoveNext =
    activeStep === 'brand'
      ? Boolean(radioBrand)
      : activeStep === 'import'
      ? canLeaveImport
      : activeStep === 'radio'
        ? canLeaveRadio
        : currentStepIndex < workflowSteps.length - 1
  const previousStep = workflowSteps[currentStepIndex - 1]
  const nextStep = workflowSteps[currentStepIndex + 1]

  function handleBrandSelect(brand) {
    setRadioBrand(brand)

    if (brand === 'motorola') {
      setExportModule('apx')
      setMessage('Import a RepeaterBook CSV for the Motorola APX workflow.')
      setActiveStep('import')
      return
    }

    if (brand === 'kenwood') {
      setActiveStep('kpg')
    }
  }

  function goToStep(stepId) {
    if (stepId === 'brand') {
      setActiveStep(stepId)
      return
    }

    if (stepId === 'kpg' && radioBrand !== 'kenwood') return
    if (radioBrand !== 'motorola') return
    if (stepId !== 'import' && repeaters.length === 0) return
    setActiveStep(stepId)
  }

  function goToPreviousStep() {
    if (previousStep) setActiveStep(previousStep.id)
  }

  function goToNextStep() {
    if (!canMoveNext || !nextStep) return
    setActiveStep(nextStep.id)
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="masthead-inner">
          <img
            className="brand-logo"
            src={rb2Logo}
            alt="RB2 Amateur Radio Codeplug Imports"
          />
          <div className="masthead-copy">
            <h1>RepeaterBook to Radio Codeplug Import Files</h1>
            <p className="lede">
              Import repeaters, build zones, and export to an importable file
              compatible with your radio's programming software.
            </p>
          </div>
        </div>
      </header>

      <section className="workspace" aria-label="RB2 repeater workflow">
        <nav className="workflow-nav" aria-label="Workflow steps">
          {workflowSteps.map((step, index) => {
            const isActive = step.id === activeStep
            const isAvailable = isStepAvailable(step.id, radioBrand, repeaters)

            return (
              <button
                key={step.id}
                className={isActive ? 'step-tab active' : 'step-tab'}
                type="button"
                disabled={!isAvailable}
                onClick={() => goToStep(step.id)}
              >
                <span>{index + 1}</span>
                {step.label}
              </button>
            )
          })}
        </nav>

        {radioBrand === 'motorola' ? (
          <div className="status-strip" aria-live="polite">
            <span>{repeaters.length} repeaters loaded</span>
            <span>{selectedRepeaters.length} selected</span>
            <span>{zones.length} zones</span>
          </div>
        ) : null}

        {activeStep === 'brand' ? (
          <BrandPanel
            selectedBrand={radioBrand}
            onSelectBrand={handleBrandSelect}
          />
        ) : null}

        {activeStep === 'import' ? (
          <ImportPanel onFilesLoaded={handleFilesLoaded} message={message} />
        ) : null}

        {activeStep === 'kpg' ? <KpgLivePanel /> : null}

        {activeStep === 'repeaters' ? (
          <RepeaterTable
            repeaters={bandFilteredRepeaters}
            totalRepeaters={repeaters.length}
            onUpdateRepeater={updateRepeater}
            onSelectAll={setAllSelected}
          />
        ) : null}

        {activeStep === 'radio' ? (
          <RadioPanel
            apxOptions={apxOptions}
            onApxOptionsChange={setApxOptions}
            requiresBandSelection={!canLeaveRadio}
          />
        ) : null}

        {activeStep === 'zones' ? (
          <ZoneBuilder
            selectedCount={selectedRepeaters.length}
            zones={zones}
            zoneSummaries={zoneSummaries}
            repeaters={bandFilteredRepeaters}
            onAutoAssignZones={autoAssignSelectedZones}
            onCreateZone={addCustomZone}
            onMoveRepeaterToZone={moveRepeaterToZone}
            onMoveRepeaterToPosition={moveRepeaterToPosition}
            onMoveAllUnassignedToZone={moveAllUnassignedToZone}
            onMoveRepeaterWithinZone={moveRepeaterWithinZone}
            onMoveZone={moveZone}
            onRenameZone={renameZone}
            onDeleteZone={deleteZone}
            onClearZones={clearSelectedZones}
          />
        ) : null}

        {activeStep === 'export' ? (
          <ExportPanel
            selectedCount={selectedRepeaters.length}
            onExport={handleExport}
          />
        ) : null}

        {previousStep || nextStep ? (
          <div className="step-actions">
            {previousStep ? (
              <button
                className="secondary-button"
                type="button"
                onClick={goToPreviousStep}
              >
                Back
              </button>
            ) : null}
            {nextStep ? (
              <button
                type="button"
                disabled={!canMoveNext}
                onClick={goToNextStep}
              >
                Next: {nextStep.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <footer className="app-footer">
        <p>
          RB2 is an amateur radio programming helper for user-reviewable import files; data can be exported from{' '}
          <a
            href="https://www.repeaterbook.com/"
            target="_blank"
            rel="noreferrer"
          >
            RepeaterBook
          </a>
          ; RB2 does not create native Motorola codeplugs, connect to radios,
          or bypass CPS; licensed under{' '}
          <a
            href="https://www.gnu.org/licenses/gpl-3.0.en.html"
            target="_blank"
            rel="noreferrer"
          >
            GNU GPLv3
          </a>
          .
        </p>
      </footer>
    </main>
  )
}

function buildZoneName(repeater, strategy) {
  const source = repeater.source || {}
  const zoneByStrategy = {
    city: readSourceField(source, ['Nearest City', 'City', 'Location']) || 'City',
    county: readSourceField(source, ['County']) || 'County',
    state: readSourceField(source, ['State', 'Province']) || 'State',
    band: getBandZoneName(repeater.rxFrequency),
    mode: repeater.mode || 'Mode',
  }

  return truncateZoneName(zoneByStrategy[strategy] || DEFAULT_ZONE)
}

function getWorkflowSteps(radioBrand) {
  if (radioBrand === 'motorola') return MOTOROLA_WORKFLOW_STEPS
  if (radioBrand === 'kenwood') return KENWOOD_WORKFLOW_STEPS
  return [BRAND_STEP]
}

function isStepAvailable(stepId, radioBrand, repeaters) {
  if (stepId === 'brand') return true
  if (stepId === 'kpg') return radioBrand === 'kenwood'
  if (radioBrand !== 'motorola') return false
  if (stepId === 'import') return true
  return repeaters.length > 0
}

function readSourceField(source, aliases) {
  const normalizedEntries = Object.entries(source).reduce((fields, [key, value]) => {
    fields[normalizeSourceKey(key)] = value
    return fields
  }, {})

  for (const alias of aliases) {
    const value = normalizedEntries[normalizeSourceKey(alias)]
    if (value) return String(value).trim()
  }

  return ''
}

function getBandFilteredRepeaters(repeaters, exportModule, enabledBands) {
  if (exportModule !== 'apx' || !enabledBands.length) return repeaters

  return repeaters.filter((repeater) =>
    repeaterMatchesApxBands(repeater, enabledBands),
  )
}

function applyRepeaterUpdates(repeater, updates) {
  const next = { ...repeater, ...updates }

  if (
    !next.channelNameCustom &&
    ['callsign', 'rxFrequency'].some((field) =>
      Object.prototype.hasOwnProperty.call(updates, field),
    )
  ) {
    next.channelName = getDisplayChannelName(next)
  }

  return next
}

function moveRepeaterToZoneEnd(repeaters, repeaterId, zoneName) {
  const movingRepeater = repeaters.find((repeater) => repeater.id === repeaterId)
  if (!movingRepeater) return repeaters

  const movedRepeater = { ...movingRepeater, zone: zoneName }
  const remaining = repeaters.filter((repeater) => repeater.id !== repeaterId)
  const lastTargetIndex = remaining.reduce(
    (lastIndex, repeater, index) =>
      (repeater.zone || DEFAULT_ZONE) === zoneName ? index : lastIndex,
    -1,
  )
  const insertIndex = lastTargetIndex === -1 ? remaining.length : lastTargetIndex + 1

  return [
    ...remaining.slice(0, insertIndex),
    movedRepeater,
    ...remaining.slice(insertIndex),
  ]
}

function moveRepeaterBeforeTarget(repeaters, repeaterId, targetRepeaterId, zoneName) {
  if (repeaterId === targetRepeaterId) return repeaters

  const movingRepeater = repeaters.find((repeater) => repeater.id === repeaterId)
  if (!movingRepeater) return repeaters

  const movedRepeater = { ...movingRepeater, zone: zoneName }
  const remaining = repeaters.filter((repeater) => repeater.id !== repeaterId)
  const targetIndex = remaining.findIndex(
    (repeater) => repeater.id === targetRepeaterId,
  )

  if (targetIndex === -1) {
    return moveRepeaterToZoneEnd(repeaters, repeaterId, zoneName)
  }

  return [
    ...remaining.slice(0, targetIndex),
    movedRepeater,
    ...remaining.slice(targetIndex),
  ]
}

function reorderRepeaterWithinZone(repeaters, repeaterId, direction) {
  const zone = repeaters.find((repeater) => repeater.id === repeaterId)?.zone || DEFAULT_ZONE
  const zoneRepeaters = repeaters.filter(
    (repeater) => (repeater.zone || DEFAULT_ZONE) === zone,
  )
  const zoneIndex = zoneRepeaters.findIndex((repeater) => repeater.id === repeaterId)
  const swapIndex = direction === 'up' ? zoneIndex - 1 : zoneIndex + 1

  if (zoneIndex < 0 || swapIndex < 0 || swapIndex >= zoneRepeaters.length) {
    return repeaters
  }

  const reorderedZone = [...zoneRepeaters]
  ;[reorderedZone[zoneIndex], reorderedZone[swapIndex]] = [
    reorderedZone[swapIndex],
    reorderedZone[zoneIndex],
  ]

  let nextZoneIndex = 0
  return repeaters.map((repeater) =>
    (repeater.zone || DEFAULT_ZONE) === zone
      ? reorderedZone[nextZoneIndex++]
      : repeater,
  )
}

function reorderZone(currentOrder, zoneName, direction, visibleZones) {
  const next = [...currentOrder]
  visibleZones.forEach((zone) => {
    if (!next.includes(zone)) next.push(zone)
  })

  const fromIndex = next.indexOf(zoneName)
  const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1

  if (
    fromIndex <= 0 ||
    toIndex <= 0 ||
    toIndex >= next.length ||
    next[toIndex] === DEFAULT_ZONE
  ) {
    return currentOrder
  }

  ;[next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]]
  return next
}

function getBandZoneName(frequencyMhz) {
  const frequency = Number(frequencyMhz)
  if (frequency >= 144 && frequency <= 148) return '2m'
  if (frequency >= 222 && frequency <= 225) return '1.25m'
  if (frequency >= 420 && frequency <= 450) return '70cm'
  if (frequency >= 902 && frequency <= 928) return '33cm'
  if (frequency >= 1240 && frequency <= 1300) return '23cm'
  return 'Other'
}

function truncateZoneName(value) {
  return sanitizeApxName(value || DEFAULT_ZONE, APX_NAME_MAX_LENGTH) || DEFAULT_ZONE
}

function normalizeSourceKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

export default App
