import { useTodasSolicitudes } from '../../../api/attendance/useAttendanceQueries'
import { useApproveMark, useRejectMark } from '../../../api/attendance/useAttendanceMutations'
import AttendanceTable from '../shared/AttendanceTable'

const AceptarMarcas = () => {
  const { data, isLoading, refetch } = useTodasSolicitudes()
  const approveMark = useApproveMark()
  const rejectMark = useRejectMark()

  const handleApprove = async (id: number) => {
    await approveMark.mutateAsync({ id })
    refetch()
  }

  const handleReject = async (id: number) => {
    await rejectMark.mutateAsync({ id })
    refetch()
  }

  const columns = [
    {
      key: 'nombreCompleto',
      header: 'Empleado',
      render: (r: Record<string, unknown>) => (
        <div>
          <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{String(r.nombreCompleto || '')}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{String(r.correo || '')}</div>
        </div>
      ),
    },
    { key: 'tipoTexto', header: 'Tipo' },
    {
      key: 'Hora',
      header: 'Fecha/Hora',
      render: (r: Record<string, unknown>) => new Date(String(r.Hora)).toLocaleString('es-CR'),
    },
    {
      key: 'esSolicitudNueva',
      header: 'Solicitud',
      render: (r: Record<string, unknown>) => r.esSolicitudNueva
        ? <span style={{ color: '#3b82f6' }}>Nueva marca</span>
        : <span style={{ color: '#f59e0b' }}>Edicion</span>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (r: Record<string, unknown>) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="att-btn att-btn--success att-btn--sm"
            onClick={() => handleApprove(r.id as number)}
            disabled={approveMark.isPending}
          >
            Aprobar
          </button>
          <button
            className="att-btn att-btn--danger att-btn--sm"
            onClick={() => handleReject(r.id as number)}
            disabled={rejectMark.isPending}
          >
            Rechazar
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Solicitudes de Marcas</h2>
      <div className="att-card">
        <AttendanceTable
          columns={columns}
          data={data?.solicitudes || []}
          keyExtractor={(r) => (r as Record<string, unknown>).id as number}
          emptyMessage="No hay solicitudes pendientes"
          loading={isLoading}
        />
      </div>
    </div>
  )
}

export default AceptarMarcas
