import { useState } from 'react'
import { useCuentasBancarias } from '../../../api/attendance/useAttendanceQueries'
import { useRegisterBankAccount } from '../../../api/attendance/useAttendanceMutations'
import AttendanceTable from '../shared/AttendanceTable'
import { FiPlus, FiX } from 'react-icons/fi'

const CuentasBancarias = () => {
  const { data: cuentasData, isLoading, refetch } = useCuentasBancarias()
  const registerAccount = useRegisterBankAccount()

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ cuenta: '', banca: '', tipoCuenta: '' })
  const [errors, setErrors] = useState<{ cuenta?: string; banca?: string; tipoCuenta?: string }>({})

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

  const glassmorphismSelect = {
    ...glassmorphismInput,
    cursor: 'pointer',
  }

  const validateForm = () => {
    const newErrors: { cuenta?: string; banca?: string; tipoCuenta?: string } = {}
    
    if (!form.cuenta.trim()) {
      newErrors.cuenta = 'El número de cuenta es requerido'
    }
    
    if (!form.banca.trim()) {
      newErrors.banca = 'El banco es requerido'
    }
    
    if (!form.tipoCuenta) {
      newErrors.tipoCuenta = 'El tipo de cuenta es requerido'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await registerAccount.mutateAsync({
        cuenta: form.cuenta.trim(),
        banca: form.banca.trim(),
        tipoCuenta: form.tipoCuenta,
      })
      setShowModal(false)
      setForm({ cuenta: '', banca: '', tipoCuenta: '' })
      setErrors({})
      refetch()
    } catch {
      // Error handled by useApiPost
    }
  }

  const columns = [
    {
      key: 'cuenta',
      header: 'Cuenta',
      render: (r: { cuenta: string }) => (
        <span style={{ fontFamily: 'monospace', color: '#e2e8f0', fontWeight: 500 }}>
          {r.cuenta}
        </span>
      ),
    },
    {
      key: 'banca',
      header: 'Banca',
      render: (r: { banca: string }) => (
        <span style={{ color: '#cbd5e1' }}>{r.banca}</span>
      ),
    },
    {
      key: 'tipoCuenta',
      header: 'Tipo',
      render: (r: { tipoCuenta: string }) => (
        <span style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          background: 'rgba(59, 130, 246, 0.2)',
          color: '#93c5fd',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}>
          {r.tipoCuenta}
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
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
            Cuentas Bancarias
          </h2>
          <button
            onClick={() => {
              setShowModal(true)
              setForm({ cuenta: '', banca: '', tipoCuenta: '' })
              setErrors({})
            }}
            style={{
              ...glassmorphismButton,
              background: 'rgba(59, 130, 246, 0.3)',
              border: '1px solid rgba(59, 130, 246, 0.5)',
            }}
          >
            <FiPlus /> Agregar Cuenta
          </button>
        </div>

        {/* Table */}
        <div style={glassmorphismCard}>
          <AttendanceTable
            columns={columns}
            data={cuentasData?.cuentas || []}
            keyExtractor={(r) => r.idCuenta}
            emptyMessage="No hay cuentas bancarias registradas"
            loading={isLoading}
          />
        </div>

        {/* Add Account Modal */}
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
            onClick={() => {
              setShowModal(false)
              setErrors({})
            }}
          >
            <div
              style={{
                ...glassmorphismCard,
                maxWidth: '500px',
                width: '100%',
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
                  Nueva Cuenta Bancaria
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setErrors({})
                  }}
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
                    Número de Cuenta *
                  </label>
                  <input
                    type="text"
                    value={form.cuenta}
                    onChange={(e) => {
                      setForm({ ...form, cuenta: e.target.value })
                      if (errors.cuenta) setErrors({ ...errors, cuenta: undefined })
                    }}
                    style={{
                      ...glassmorphismInput,
                      borderColor: errors.cuenta ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.2)',
                    }}
                    placeholder="1234-5678-9012"
                  />
                  {errors.cuenta && (
                    <span style={{
                      display: 'block',
                      marginTop: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#ef4444',
                    }}>
                      {errors.cuenta}
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#cbd5e1',
                  }}>
                    Banco/Banca *
                  </label>
                  <input
                    type="text"
                    value={form.banca}
                    onChange={(e) => {
                      setForm({ ...form, banca: e.target.value })
                      if (errors.banca) setErrors({ ...errors, banca: undefined })
                    }}
                    style={{
                      ...glassmorphismInput,
                      borderColor: errors.banca ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.2)',
                    }}
                    placeholder="Banco Nacional"
                  />
                  {errors.banca && (
                    <span style={{
                      display: 'block',
                      marginTop: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#ef4444',
                    }}>
                      {errors.banca}
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#cbd5e1',
                  }}>
                    Tipo de Cuenta *
                  </label>
                  <select
                    value={form.tipoCuenta}
                    onChange={(e) => {
                      setForm({ ...form, tipoCuenta: e.target.value })
                      if (errors.tipoCuenta) setErrors({ ...errors, tipoCuenta: undefined })
                    }}
                    style={{
                      ...glassmorphismSelect,
                      borderColor: errors.tipoCuenta ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    <option value="" style={{ background: '#1e293b', color: '#94a3b8' }}>
                      Seleccionar...
                    </option>
                    <option value="Ahorro" style={{ background: '#1e293b', color: '#f1f5f9' }}>
                      Ahorro
                    </option>
                    <option value="Corriente" style={{ background: '#1e293b', color: '#f1f5f9' }}>
                      Corriente
                    </option>
                  </select>
                  {errors.tipoCuenta && (
                    <span style={{
                      display: 'block',
                      marginTop: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#ef4444',
                    }}>
                      {errors.tipoCuenta}
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setErrors({})
                    }}
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
                    disabled={registerAccount.isPending}
                    style={{
                      ...glassmorphismButton,
                      background: 'rgba(59, 130, 246, 0.3)',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      opacity: registerAccount.isPending ? 0.6 : 1,
                    }}
                  >
                    {registerAccount.isPending && '...'}
                    Registrar
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

export default CuentasBancarias
