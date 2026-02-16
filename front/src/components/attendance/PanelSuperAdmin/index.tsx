import { useState } from 'react'
import { useEmpresas, useEmpresaStats, useTeamsLogs } from '../../../api/attendance/useAttendanceQueries'
import { useCreateCompany, useUpdateCompany, useTestTeamsWebhook, useSendTeamsReport } from '../../../api/attendance/useAttendanceMutations'
import AttendanceTable from '../shared/AttendanceTable'
import ConfirmModal from '../shared/ConfirmModal'
import TimeCard from '../shared/TimeCard'
import { FiPlus, FiEdit2, FiSend, FiX, FiToggleLeft, FiToggleRight, FiHome } from 'react-icons/fi'

const PanelSuperAdmin = () => {
  const { data: empresasData, isLoading, refetch } = useEmpresas()
  const { data: logsData, isLoading: loadingLogs } = useTeamsLogs()
  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany()
  const testWebhook = useTestTeamsWebhook()
  const sendReport = useSendTeamsReport()

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', teams_webhook_url: '' })
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)

  const glassmorphismCard = {
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  }

  const glassmorphismButton = {
    background: 'rgba(59, 130, 246, 0.2)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  }

  const glassmorphismInput = {
    background: 'rgba(30, 41, 59, 0.5)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '8px',
    padding: '0.75rem',
    color: '#f1f5f9',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  }

  const CompanyCard = ({ empresa }: { empresa: { id: number; name: string; slug: string; activo_marcas: boolean } }) => {
    const { data: statsData, isLoading: loadingStats } = useEmpresaStats(empresa.id, !!empresa.id)

    const toggleActivo = async () => {
      try {
        await updateCompany.mutateAsync({
          id: empresa.id,
          activo_marcas: !empresa.activo_marcas,
        } as Parameters<typeof updateCompany.mutateAsync>[0])
        refetch()
      } catch {
        // Error handled by useApiPost
      }
    }

    return (
      <div style={{
        ...glassmorphismCard,
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <FiHome style={{ fontSize: '1.25rem', color: '#64748b' }} />
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9' }}>{empresa.name}</h3>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              Slug: <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{empresa.slug || 'N/A'}</span>
            </p>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Estado:</span>
              <span style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                background: empresa.activo_marcas ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: empresa.activo_marcas ? '#10b981' : '#ef4444',
                border: `1px solid ${empresa.activo_marcas ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}>
                {empresa.activo_marcas ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={toggleActivo}
              style={{
                ...glassmorphismButton,
                background: empresa.activo_marcas ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${empresa.activo_marcas ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                padding: '0.5rem',
              }}
              disabled={updateCompany.isPending}
            >
              {empresa.activo_marcas ? <FiToggleRight style={{ fontSize: '1.25rem' }} /> : <FiToggleLeft style={{ fontSize: '1.25rem' }} />}
            </button>
            <button
              onClick={() => {
                setForm({ name: empresa.name, slug: empresa.slug || '', teams_webhook_url: '' })
                setEditingId(empresa.id)
                setShowModal(true)
              }}
              style={{
                ...glassmorphismButton,
                padding: '0.5rem',
              }}
            >
              <FiEdit2 />
            </button>
            <button
              onClick={() => setSelectedCompanyId(selectedCompanyId === empresa.id ? null : empresa.id)}
              style={{
                ...glassmorphismButton,
                padding: '0.5rem',
                background: selectedCompanyId === empresa.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(148, 163, 184, 0.1)',
                border: selectedCompanyId === empresa.id ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
              }}
            >
              <FiSend />
            </button>
          </div>
        </div>

        {loadingStats ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>Cargando estadísticas...</div>
        ) : statsData?.stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <TimeCard
              icon="👥"
              value={String(statsData.stats.totalEmpleados)}
              label="Total Empleados"
              color="#3b82f6"
            />
            <TimeCard
              icon="✅"
              value={String(statsData.stats.trabajandoHoy)}
              label="Trabajando Hoy"
              color="#10b981"
            />
            <TimeCard
              icon="⏱️"
              value={statsData.stats.horasPromedioHoy.toFixed(1)}
              label="Horas Promedio"
              color="#f59e0b"
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>No hay estadísticas disponibles</div>
        )}

        {selectedCompanyId === empresa.id && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={async () => {
                  try {
                    await testWebhook.mutateAsync({})
                  } catch {
                    // Error handled
                  }
                }}
                style={{
                  ...glassmorphismButton,
                  fontSize: '0.75rem',
                  padding: '0.5rem 0.75rem',
                }}
                disabled={testWebhook.isPending}
              >
                {testWebhook.isPending ? '...' : <><FiSend /> Test Webhook</>}
              </button>
              <button
                onClick={async () => {
                  try {
                    await sendReport.mutateAsync({})
                  } catch {
                    // Error handled
                  }
                }}
                style={{
                  ...glassmorphismButton,
                  fontSize: '0.75rem',
                  padding: '0.5rem 0.75rem',
                }}
                disabled={sendReport.isPending}
              >
                {sendReport.isPending ? '...' : <><FiSend /> Enviar Reporte</>}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const openCreate = () => {
    setForm({ name: '', slug: '', teams_webhook_url: '' })
    setEditingId(null)
    setShowModal(true)
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    try {
      if (editingId) {
        const payload: Record<string, unknown> = { id: editingId, name: form.name, slug: form.slug }
        if (form.teams_webhook_url) payload.teams_webhook_url = form.teams_webhook_url
        await updateCompany.mutateAsync(payload as Parameters<typeof updateCompany.mutateAsync>[0])
      } else {
        await createCompany.mutateAsync(form)
      }
      setShowModal(false)
      refetch()
    } catch {
      // Error handled by useApiPost
    }
  }

  const logColumns = [
    {
      key: 'tipoEvento',
      header: 'Evento',
      render: (r: { tipoEvento: string }) => <span style={{ color: '#e2e8f0' }}>{r.tipoEvento}</span>,
    },
    {
      key: 'mensaje',
      header: 'Mensaje',
      render: (r: { mensaje: string }) => <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>{r.mensaje}</span>,
    },
    {
      key: 'exitoso',
      header: 'Estado',
      render: (r: { exitoso: boolean }) => (
        <span style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          background: r.exitoso ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          color: r.exitoso ? '#10b981' : '#ef4444',
          border: `1px solid ${r.exitoso ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        }}>
          {r.exitoso ? 'Exitoso' : 'Fallido'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (r: { createdAt: string }) => (
        <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          {new Date(r.createdAt).toLocaleString('es-CR')}
        </span>
      ),
    },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#f1f5f9',
            margin: 0,
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          }}>
            Panel Super Admin
          </h2>
          <button
            onClick={openCreate}
            style={{
              ...glassmorphismButton,
              background: 'rgba(59, 130, 246, 0.3)',
              border: '1px solid rgba(59, 130, 246, 0.5)',
            }}
          >
            <FiPlus /> Nueva Empresa
          </button>
        </div>

        {/* Companies Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#e2e8f0',
            marginBottom: '1rem',
          }}>
            Empresas (Teams)
          </h3>
          {isLoading ? (
            <div style={{
              ...glassmorphismCard,
              textAlign: 'center',
              padding: '3rem',
              color: '#94a3b8',
            }}>
              Cargando empresas...
            </div>
          ) : empresasData?.empresas && empresasData.empresas.length > 0 ? (
            <div>
              {empresasData.empresas.map((empresa) => (
                <CompanyCard key={empresa.id} empresa={empresa} />
              ))}
            </div>
          ) : (
            <div style={{
              ...glassmorphismCard,
              textAlign: 'center',
              padding: '3rem',
              color: '#94a3b8',
            }}>
              No hay empresas registradas
            </div>
          )}
        </div>

        {/* Teams Logs Section */}
        <div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#e2e8f0',
            marginBottom: '1rem',
          }}>
            Logs de Notificaciones Teams
          </h3>
          <div style={glassmorphismCard}>
            <AttendanceTable
              columns={logColumns}
              data={(logsData?.logs || []).slice(0, 50)}
              keyExtractor={(r) => r.id}
              emptyMessage="No hay logs disponibles"
              loading={loadingLogs}
            />
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
            }}
            onClick={() => setShowModal(false)}
          >
            <div
              style={{
                ...glassmorphismCard,
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#f1f5f9',
                }}>
                  {editingId ? 'Editar Empresa' : 'Nueva Empresa'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <FiX />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#cbd5e1',
                  }}>
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    style={glassmorphismInput}
                    placeholder="Nombre de la empresa"
                  />
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#cbd5e1',
                  }}>
                    Slug (URL-friendly)
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    style={glassmorphismInput}
                    placeholder="mi-empresa"
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#cbd5e1',
                  }}>
                    Webhook URL de MS Teams
                  </label>
                  <input
                    type="url"
                    value={form.teams_webhook_url}
                    onChange={(e) => setForm({ ...form, teams_webhook_url: e.target.value })}
                    style={glassmorphismInput}
                    placeholder="https://..."
                  />
                </div>
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      ...glassmorphismButton,
                      background: 'rgba(148, 163, 184, 0.1)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createCompany.isPending || updateCompany.isPending}
                    style={{
                      ...glassmorphismButton,
                      background: 'rgba(59, 130, 246, 0.3)',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      opacity: (createCompany.isPending || updateCompany.isPending) ? 0.6 : 1,
                    }}
                  >
                    {(createCompany.isPending || updateCompany.isPending) && '...'}
                    {editingId ? 'Guardar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PanelSuperAdmin
