import { useState } from 'react'
import { useMiReporte } from '../../../api/attendance/useAttendanceQueries'
import DateRangeFilter from '../shared/DateRangeFilter'
import AttendanceTable from '../shared/AttendanceTable'
import type { ReporteRegistro } from '../../../api/attendance/useAttendanceQueries'

const getDefaults = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return { inicio: `${y}-${m}-01`, fin: now.toISOString().split('T')[0] }
}

const MiReporte = () => {
  const defaults = getDefaults()
  const [fechaInicio, setFechaInicio] = useState(defaults.inicio)
  const [fechaFin, setFechaFin] = useState(defaults.fin)

  const { data, isLoading } = useMiReporte({ fechaInicio, fechaFin })

  const columns = [
    { key: 'Fecha', header: 'Fecha' },
    { key: 'HorasTrabajadasDia', header: 'Horas Trabajadas' },
    { key: 'TiempoDescanso', header: 'Descanso' },
    {
      key: 'HorasProyectosEspeciales',
      header: 'Horas Proyectos',
      render: (r: ReporteRegistro) => r.HorasProyectosEspeciales ? `${r.HorasProyectosEspeciales}h` : '-',
    },
    {
      key: 'TotalExtras',
      header: 'Extras',
      render: (r: ReporteRegistro) => r.TotalExtras ? `${r.TotalExtras}h` : '-',
    },
  ]

  const resumen = data?.resumen as Record<string, unknown> | undefined

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Mi Reporte</h2>

      <div className="att-card" style={{ marginBottom: '1.5rem' }}>
        <DateRangeFilter
          onFilter={(inicio, fin) => { setFechaInicio(inicio); setFechaFin(fin) }}
          loading={isLoading}
        />
      </div>

      {resumen && (
        <div className="att-grid att-grid--3" style={{ marginBottom: '1.5rem' }}>
          <div className="att-time-card">
            <div className="att-time-card__value" style={{ color: '#10b981' }}>{String(resumen.totalHoras || '0')}</div>
            <div className="att-time-card__label">Total Horas</div>
          </div>
          <div className="att-time-card">
            <div className="att-time-card__value" style={{ color: '#3b82f6' }}>{String(resumen.totalProyectos || '0')}</div>
            <div className="att-time-card__label">Horas Proyectos</div>
          </div>
          <div className="att-time-card">
            <div className="att-time-card__value" style={{ color: '#f59e0b' }}>{String(resumen.totalExtras || '0')}</div>
            <div className="att-time-card__label">Horas Extras</div>
          </div>
        </div>
      )}

      <div className="att-card">
        <AttendanceTable
          columns={columns}
          data={data?.registros || []}
          keyExtractor={(r) => `${r.Fecha}-${r.idUsuario}`}
          emptyMessage="No hay registros en este periodo"
          loading={isLoading}
        />
      </div>
    </div>
  )
}

export default MiReporte
