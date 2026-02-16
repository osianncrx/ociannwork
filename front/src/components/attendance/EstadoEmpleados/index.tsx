import { useState } from 'react'
import { useEstadoEmpleados } from '../../../api/attendance/useAttendanceQueries'
import StatusBadge from '../shared/StatusBadge'
import AttendanceTable from '../shared/AttendanceTable'
import type { EmpleadoEstado } from '../../../api/attendance/useAttendanceQueries'

const EstadoEmpleados = () => {
  const { data, isLoading } = useEstadoEmpleados()
  const [filter, setFilter] = useState('')

  const empleados = data?.empleados || []
  const resumen = data?.resumen || { trabajando: 0, descansando: 0, terminados: 0, sinRegistro: 0 }

  const filtered = filter
    ? empleados.filter((e) => {
        const name = `${e.Nombre} ${e.Apellidos}`.toLowerCase()
        return name.includes(filter.toLowerCase()) || e.estado === filter
      })
    : empleados

  const columns = [
    {
      key: 'nombre',
      header: 'Empleado',
      render: (row: EmpleadoEstado) => (
        <div>
          <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{row.Nombre} {row.Apellidos}</div>
          {row.puesto && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.puesto}</div>}
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row: EmpleadoEstado) => <StatusBadge estado={row.estado} size="sm" />,
    },
    { key: 'horaEntrada', header: 'Entrada', render: (row: EmpleadoEstado) => row.horaEntrada || '-' },
    { key: 'ultimaMarca', header: 'Ultima Marca', render: (row: EmpleadoEstado) => row.ultimaMarca || '-' },
    { key: 'horasTrabajadas', header: 'Horas Trabajadas' },
    { key: 'tiempoDescanso', header: 'Descanso' },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Estado de Empleados</h2>

      {/* Summary cards */}
      <div className="att-grid att-grid--4" style={{ marginBottom: '1.5rem' }}>
        <div className="att-time-card" onClick={() => setFilter('TRABAJANDO')} style={{ cursor: 'pointer' }}>
          <div className="att-time-card__value" style={{ color: '#10b981' }}>{resumen.trabajando}</div>
          <div className="att-time-card__label">Trabajando</div>
        </div>
        <div className="att-time-card" onClick={() => setFilter('DESCANSANDO')} style={{ cursor: 'pointer' }}>
          <div className="att-time-card__value" style={{ color: '#f59e0b' }}>{resumen.descansando}</div>
          <div className="att-time-card__label">En descanso</div>
        </div>
        <div className="att-time-card" onClick={() => setFilter('TERMINADO')} style={{ cursor: 'pointer' }}>
          <div className="att-time-card__value" style={{ color: '#6366f1' }}>{resumen.terminados}</div>
          <div className="att-time-card__label">Terminados</div>
        </div>
        <div className="att-time-card" onClick={() => setFilter('SIN_REGISTRO')} style={{ cursor: 'pointer' }}>
          <div className="att-time-card__value" style={{ color: '#64748b' }}>{resumen.sinRegistro}</div>
          <div className="att-time-card__label">Sin registro</div>
        </div>
      </div>

      {/* Filter */}
      <div className="att-card">
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="att-input"
            placeholder="Buscar empleado..."
            value={filter.match(/^[A-Z]/) ? '' : filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          {filter && (
            <button className="att-btn att-btn--outline att-btn--sm" onClick={() => setFilter('')}>
              Limpiar filtro
            </button>
          )}
          <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.8rem' }}>
            Auto-actualiza cada 60s | {data?.fecha || ''}
          </span>
        </div>

        <AttendanceTable
          columns={columns}
          data={filtered}
          keyExtractor={(r) => r.idUsuario}
          emptyMessage="No hay empleados registrados"
          loading={isLoading}
        />
      </div>
    </div>
  )
}

export default EstadoEmpleados
