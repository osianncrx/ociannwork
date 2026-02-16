import { useTodasExtras } from '../../../api/attendance/useAttendanceQueries'
import { useApproveOvertime } from '../../../api/attendance/useAttendanceMutations'
import AttendanceTable from '../shared/AttendanceTable'
import type { ExtraResponse } from '../../../api/attendance/useAttendanceQueries'

const AceptarExtras = () => {
  const { data, isLoading, refetch } = useTodasExtras()
  const approveOvertime = useApproveOvertime()

  const pendientes = (data?.extras || []).filter((e) => e.aceptado === 3)

  const handleAction = async (id: number, aceptado: number) => {
    await approveOvertime.mutateAsync({ id, aceptado })
    refetch()
  }

  const columns = [
    {
      key: 'usuario',
      header: 'Empleado',
      render: (r: ExtraResponse) => r.Usuario ? `${r.Usuario.name} ${r.Usuario.apellidos || ''}` : '-',
    },
    { key: 'fecha', header: 'Fecha' },
    {
      key: 'totalextras',
      header: 'Horas',
      render: (r: ExtraResponse) => `${r.totalextras}h`,
    },
    { key: 'motivo', header: 'Motivo' },
    {
      key: 'actions',
      header: 'Acciones',
      render: (r: ExtraResponse) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="att-btn att-btn--success att-btn--sm"
            onClick={() => handleAction(r.id, 1)}
            disabled={approveOvertime.isPending}
          >
            Aprobar
          </button>
          <button
            className="att-btn att-btn--danger att-btn--sm"
            onClick={() => handleAction(r.id, 0)}
            disabled={approveOvertime.isPending}
          >
            Rechazar
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Solicitudes de Horas Extras</h2>
      <div className="att-card">
        <AttendanceTable
          columns={columns}
          data={pendientes}
          keyExtractor={(r) => r.id}
          emptyMessage="No hay solicitudes pendientes"
          loading={isLoading}
        />
      </div>
    </div>
  )
}

export default AceptarExtras
