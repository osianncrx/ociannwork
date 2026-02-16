import { useAppSelector } from '../../../../store/hooks'
import { FiClock } from 'react-icons/fi'

const estadoLabels: Record<string, string> = {
  TRABAJANDO: 'Trabajando',
  DESCANSANDO: 'En descanso',
  TERMINADO: 'Jornada terminada',
  SIN_REGISTRO: 'Sin registro',
}

const estadoColors: Record<string, string> = {
  TRABAJANDO: '#22c55e',
  DESCANSANDO: '#f59e0b',
  TERMINADO: '#6366f1',
  SIN_REGISTRO: '#94a3b8',
}

const AttendanceNav = () => {
  const estado = useAppSelector((s) => s.attendance.estadoActual)

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <FiClock size={18} style={{ color: '#5579F8' }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Marcas OCIANN</h3>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px', borderRadius: 8,
        background: '#f8fafc', border: '1px solid #e2e8f0',
        marginBottom: 12
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: estadoColors[estado] || '#94a3b8',
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: estadoColors[estado] || '#64748b' }}>
          {estadoLabels[estado] || 'Sin registro'}
        </span>
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
        Usa el panel de la derecha para registrar marcas, ver reportes y gestionar el sistema de asistencia.
      </p>
    </div>
  )
}

export default AttendanceNav
