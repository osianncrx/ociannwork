interface ProjectCardProps {
  nombre: string
  descripcion?: string | null
  activo: boolean
  horaEntrada?: string | null
  onAction?: () => void
  actionLabel?: string
  actionVariant?: string
}

export default function ProjectCard({
  nombre, descripcion, activo, horaEntrada,
  onAction, actionLabel, actionVariant = 'att-btn-primary',
}: ProjectCardProps) {
  return (
    <div className="att-card" style={{ borderColor: activo ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: activo ? '#e2e8f0' : '#64748b' }}>{nombre}</h4>
          {descripcion && <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{descripcion}</p>}
          {horaEntrada && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#3b82f6' }}>
              Entrada: {new Date(horaEntrada).toLocaleTimeString('es-CR')}
            </p>
          )}
        </div>
        {onAction && (
          <button className={`att-btn ${actionVariant}`} onClick={onAction} style={{ flexShrink: 0 }}>
            {actionLabel || 'Accion'}
          </button>
        )}
      </div>
    </div>
  )
}
