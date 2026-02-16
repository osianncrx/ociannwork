import { useState } from 'react'
import { useEstadoPorFecha } from '../../../api/attendance/useAttendanceQueries'
import StatusBadge from '../shared/StatusBadge'
import AttendanceTable from '../shared/AttendanceTable'

const today = new Date().toISOString().split('T')[0]

const EstadoPorFecha = () => {
  const [fecha, setFecha] = useState(today)
  const { data, isLoading } = useEstadoPorFecha(fecha, undefined, !!fecha)

  const columns = [
    {
      key: 'nombre',
      header: 'Empleado',
      render: (row: { nombre: string; apellidos: string }) => `${row.nombre} ${row.apellidos}`,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row: { estado: string }) => <StatusBadge estado={row.estado} size="sm" />,
    },
    { key: 'ultimaHora', header: 'Ultima Hora' },
    {
      key: 'marcas',
      header: 'Detalle Marcas',
      render: (row: { marcas: { hora: string; tipoTexto: string }[] }) => (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {row.marcas.map((m, i) => (
            <span key={i} style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
            }}>
              {m.tipoTexto} {m.hora}
            </span>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Estado por Fecha</h2>

      <div className="att-card">
        <div style={{ marginBottom: '1rem' }}>
          <label className="att-label">Seleccionar fecha</label>
          <input
            type="date"
            className="att-input"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={{ maxWidth: '250px' }}
          />
        </div>

        <AttendanceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(r) => r.idUsuario}
          emptyMessage="No hay registros para esta fecha"
          loading={isLoading}
        />
      </div>
    </div>
  )
}

export default EstadoPorFecha
