interface StatusBadgeProps {
  estado: string
  size?: 'sm' | 'md'
}

const statusMap: Record<string, { label: string; className: string }> = {
  TRABAJANDO: { label: 'Trabajando', className: 'att-status-badge--working' },
  DESCANSANDO: { label: 'En descanso', className: 'att-status-badge--break' },
  TERMINADO: { label: 'Terminado', className: 'att-status-badge--done' },
  SIN_REGISTRO: { label: 'Sin registro', className: 'att-status-badge--none' },
}

const StatusBadge = ({ estado, size = 'md' }: StatusBadgeProps) => {
  const info = statusMap[estado] || statusMap.SIN_REGISTRO
  const sizeStyle = size === 'sm' ? { fontSize: '0.7rem', padding: '0.2rem 0.5rem' } : {}

  return (
    <span className={`att-status-badge ${info.className}`} style={sizeStyle}>
      {info.label}
    </span>
  )
}

export default StatusBadge
