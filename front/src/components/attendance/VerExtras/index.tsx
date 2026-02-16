import { useMisExtras, useExtrasAceptadas } from '../../../api/attendance/useAttendanceQueries'
import AttendanceTable from '../shared/AttendanceTable'
import type { ExtraResponse } from '../../../api/attendance/useAttendanceQueries'

const estadoLabel = (aceptado: number) => {
  switch (aceptado) {
    case 1: return <span style={{ color: '#10b981', fontWeight: 600 }}>Aceptada</span>
    case 0: return <span style={{ color: '#ef4444', fontWeight: 600 }}>Rechazada</span>
    default: return <span style={{ color: '#f59e0b', fontWeight: 600 }}>Pendiente</span>
  }
}

const VerExtras = () => {
  const { data: misExtras, isLoading: loadingMine } = useMisExtras()
  const { data: aceptadas, isLoading: loadingAccepted } = useExtrasAceptadas()

  const columns = [
    { key: 'fecha', header: 'Fecha' },
    { key: 'totalextras', header: 'Horas', render: (r: ExtraResponse) => `${r.totalextras}h` },
    { key: 'motivo', header: 'Motivo' },
    { key: 'aceptado', header: 'Estado', render: (r: ExtraResponse) => estadoLabel(r.aceptado) },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Mis Horas Extras</h2>

      <div className="att-card" style={{ marginBottom: '1.5rem' }}>
        <div className="att-card__header">
          <h3 className="att-card__title">Todas mis solicitudes</h3>
        </div>
        <AttendanceTable
          columns={columns}
          data={misExtras?.extras || []}
          keyExtractor={(r) => r.id}
          emptyMessage="No has solicitado horas extras"
          loading={loadingMine}
        />
      </div>

      <div className="att-card">
        <div className="att-card__header">
          <h3 className="att-card__title">Extras aceptadas</h3>
        </div>
        <AttendanceTable
          columns={columns}
          data={aceptadas?.extras || []}
          keyExtractor={(r) => r.id}
          emptyMessage="No tienes extras aceptadas"
          loading={loadingAccepted}
        />
      </div>
    </div>
  )
}

export default VerExtras
