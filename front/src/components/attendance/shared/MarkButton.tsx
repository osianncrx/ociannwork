interface MarkButtonProps {
  tipo: 'entrada' | 'descanso' | 'salida' | 'entry' | 'break' | 'exit'
  label?: string
  icon?: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}

const tipoMap: Record<string, string> = {
  entry: 'entrada',
  break: 'descanso',
  exit: 'salida',
  entrada: 'entrada',
  descanso: 'descanso',
  salida: 'salida',
}

const defaultLabels: Record<string, string> = {
  entrada: 'Entrada',
  descanso: 'Descanso',
  salida: 'Salida',
}

const defaultIcons: Record<string, string> = {
  entrada: '🟢',
  descanso: '☕',
  salida: '🔴',
}

export default function MarkButton({ tipo, label, icon, onClick, disabled = false, loading = false }: MarkButtonProps) {
  const normalizedTipo = tipoMap[tipo] || tipo
  const displayLabel = label || defaultLabels[normalizedTipo] || tipo
  const displayIcon = icon || defaultIcons[normalizedTipo] || '⏰'

  return (
    <button
      className={`att-mark-btn ${normalizedTipo}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <span className="att-spinner" style={{ marginRight: '0.5rem' }} />}
      <div className="att-mark-icon">{displayIcon}</div>
      <div className="att-mark-label">{displayLabel}</div>
    </button>
  )
}
