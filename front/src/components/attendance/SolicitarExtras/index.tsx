import { useState } from 'react'
import { useRequestOvertime } from '../../../api/attendance/useAttendanceMutations'

const SolicitarExtras = () => {
  const [totalextras, setTotalextras] = useState(1)
  const [motivo, setMotivo] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [success, setSuccess] = useState(false)

  const requestOvertime = useRequestOvertime()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motivo.trim()) return

    try {
      await requestOvertime.mutateAsync({ totalextras, motivo, fecha })
      setSuccess(true)
      setMotivo('')
      setTotalextras(1)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      // Error handled by useApiPost
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Solicitar Horas Extras</h2>

      <div className="att-card" style={{ maxWidth: '600px' }}>
        {success && (
          <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#10b981', fontSize: '0.85rem' }}>
            Solicitud enviada exitosamente. Un administrador revisara tu solicitud.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="att-label">Fecha</label>
            <input
              type="date"
              className="att-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="att-label">Cantidad de horas extras</label>
            <input
              type="number"
              className="att-input"
              min={1}
              max={12}
              value={totalextras}
              onChange={(e) => setTotalextras(Number(e.target.value))}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="att-label">Motivo</label>
            <textarea
              className="att-input"
              rows={4}
              placeholder="Describe el motivo de las horas extras..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            className="att-btn att-btn--primary"
            disabled={requestOvertime.isPending || !motivo.trim()}
          >
            {requestOvertime.isPending && <span className="att-spinner" />}
            Enviar Solicitud
          </button>
        </form>
      </div>
    </div>
  )
}

export default SolicitarExtras
