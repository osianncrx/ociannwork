import { useState } from 'react'
import { useReporteAdmin, useAttendanceUsers } from '../../../api/attendance/useAttendanceQueries'
import DateRangeFilter from '../shared/DateRangeFilter'
import AttendanceTable from '../shared/AttendanceTable'
import type { ReporteRegistro } from '../../../api/attendance/useAttendanceQueries'

const getDefaults = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return { inicio: `${y}-${m}-01`, fin: now.toISOString().split('T')[0] }
}

const ReporteAdmin = () => {
  const defaults = getDefaults()
  const [fechaInicio, setFechaInicio] = useState(defaults.inicio)
  const [fechaFin, setFechaFin] = useState(defaults.fin)
  const [idUsuario, setIdUsuario] = useState<number | undefined>()

  const { data, isLoading } = useReporteAdmin({ fechaInicio, fechaFin, idUsuario })
  const { data: usersData } = useAttendanceUsers()

  const columns = [
    {
      key: 'Nombre',
      header: 'Empleado',
      render: (r: ReporteRegistro) => `${r.Nombre} ${r.Apellidos}`,
    },
    { key: 'Fecha', header: 'Fecha' },
    { key: 'HorasTrabajadasDia', header: 'Horas' },
    { key: 'TiempoDescanso', header: 'Descanso' },
    {
      key: 'HorasProyectosEspeciales',
      header: 'Proyectos',
      render: (r: ReporteRegistro) => r.HorasProyectosEspeciales ? `${r.HorasProyectosEspeciales}h` : '-',
    },
    {
      key: 'TotalExtras',
      header: 'Extras',
      render: (r: ReporteRegistro) => r.TotalExtras ? `${r.TotalExtras}h` : '-',
    },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Reporte General</h2>

      <div className="att-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <DateRangeFilter
            onFilter={(inicio, fin) => { setFechaInicio(inicio); setFechaFin(fin) }}
            loading={isLoading}
          />
          <div>
            <label className="att-label">Empleado</label>
            <select
              className="att-select"
              value={idUsuario || ''}
              onChange={(e) => setIdUsuario(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Todos</option>
              {usersData?.usuarios?.map((u) => (
                <option key={u.id} value={u.id}>{u.name} {u.apellidos}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

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

export default ReporteAdmin
