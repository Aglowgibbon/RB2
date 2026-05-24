const RADIO_BRANDS = [
  {
    id: 'motorola',
    name: 'Motorola',
    target: 'APX CPS XML',
    description: 'Import RepeaterBook CSV files, review channels, build zones, and export APX CPS XML.',
  },
  {
    id: 'kenwood',
    name: 'Kenwood',
    target: 'KPG-D1N TSV',
    description: 'Fetch live RepeaterBook county data and generate KPG-D1N paste files.',
  },
]

function BrandPanel({ selectedBrand, onSelectBrand }) {
  return (
    <section className="panel brand-panel" aria-labelledby="brand-title">
      <div className="panel-heading">
        <div>
          <h2 id="brand-title">Radio Brand</h2>
          <p>Choose the radio manufacturer to start the matching import workflow.</p>
        </div>
      </div>

      <div className="brand-card-grid">
        {RADIO_BRANDS.map((brand) => {
          const isSelected = selectedBrand === brand.id

          return (
            <button
              key={brand.id}
              className={isSelected ? 'brand-card selected' : 'brand-card'}
              type="button"
              onClick={() => onSelectBrand(brand.id)}
            >
              <span className="brand-card-name">{brand.name}</span>
              <span className="brand-card-target">{brand.target}</span>
              <span className="brand-card-description">{brand.description}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default BrandPanel
