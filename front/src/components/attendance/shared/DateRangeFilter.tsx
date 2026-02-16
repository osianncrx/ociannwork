import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'

interface DateRangeFilterProps {
  onFilter: (fechaInicio: string, fechaFin: string) => void
  loading?: boolean
}

const getDefaultDates = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return {
    inicio: `${y}-${m}-01`,
    fin: now.toISOString().split('T')[0],
  }
}

const DateRangeFilter = ({ onFilter, loading }: DateRangeFilterProps) => {
  const defaults = getDefaultDates()
  const [inicio, setInicio] = useState(defaults.inicio)
  const [fin, setFin] = useState(defaults.fin)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFilter(inicio, fin)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div>
        <label className="att-label">Desde</label>
        <input type="date" className="att-input" value={inicio} onChange={(e) => setInicio(e.target.value)} />
      </div>
      <div>
        <label className="att-label">Hasta</label>
        <input type="date" className="att-input" value={fin} onChange={(e) => setFin(e.target.value)} />
      </div>
      <button type="submit" className="att-btn att-btn--primary" disabled={loading}>
        {loading ? <span className="att-spinner" /> : <FiSearch />}
        Filtrar
      </button>
    </form>
  )
}

export default DateRangeFilter
