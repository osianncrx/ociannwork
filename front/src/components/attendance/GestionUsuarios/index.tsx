import { useState } from 'react'
import { useAttendanceUsers } from '../../../api/attendance/useAttendanceQueries'
import { useCreateAttendanceUser, useUpdateAttendanceUser } from '../../../api/attendance/useAttendanceMutations'
import AttendanceTable from '../shared/AttendanceTable'
import ConfirmModal from '../shared/ConfirmModal'
import { FiX, FiEdit2 } from 'react-icons/fi'

const permisoLabels: Record<number, string> = {
  0: 'Usuario',
  1: 'Admin',
  2: 'Supervisor',
  3: 'SuperUsuario'
}

interface AttendanceUser {
  id: number
  name: string
  email: string
  apellidos: string
  puesto: string
  fecha_entrada: string
  id_persona: number
  tipo_permiso_marcas: number
  firsttime: boolean
  es_super_admin_marcas: boolean
}

export default function GestionUsuarios() {
  const { data, isLoading, refetch } = useAttendanceUsers()
  const createUser = useCreateAttendanceUser()
  const updateUser = useUpdateAttendanceUser()

  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AttendanceUser | null>(null)
  const [form, setForm] = useState({
    name: '',
    apellidos: '',
    email: '',
    puesto: '',
    id_persona: '',
    fecha_entrada: '',
    tipo_permiso_marcas: 0,
    password: ''
  })

  const usuarios = data?.usuarios || []

  const resetForm = () => {
    setForm({
      name: '',
      apellidos: '',
      email: '',
      puesto: '',
      id_persona: '',
      fecha_entrada: '',
      tipo_permiso_marcas: 0,
      password: ''
    })
    setEditingUser(null)
  }

  const openCreate = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (user: AttendanceUser) => {
    setEditingUser(user)
    setForm({
      name: user.name || '',
      apellidos: user.apellidos || '',
      email: user.email || '',
      puesto: user.puesto || '',
      id_persona: String(user.id_persona || ''),
      fecha_entrada: user.fecha_entrada || '',
      tipo_permiso_marcas: user.tipo_permiso_marcas || 0,
      password: ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editingUser) {
        await updateUser.mutateAsync({
          id: editingUser.id,
          name: form.name,
          apellidos: form.apellidos,
          email: form.email,
          puesto: form.puesto,
          id_persona: form.id_persona ? Number(form.id_persona) : undefined,
          fecha_entrada: form.fecha_entrada || undefined,
          tipo_permiso_marcas: form.tipo_permiso_marcas,
          password: form.password || undefined
        })
      } else {
        await createUser.mutateAsync({
          name: form.name,
          apellidos: form.apellidos,
          email: form.email,
          puesto: form.puesto,
          id_persona: form.id_persona ? Number(form.id_persona) : undefined,
          tipo_permiso_marcas: form.tipo_permiso_marcas,
          password: form.password
        })
      }
      setShowModal(false)
      resetForm()
      refetch()
    } catch (error) {
      console.error('Error saving user:', error)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Nombre',
      render: (user: AttendanceUser) => user.name || '-'
    },
    {
      key: 'apellidos',
      header: 'Apellidos',
      render: (user: AttendanceUser) => user.apellidos || '-'
    },
    {
      key: 'email',
      header: 'Email',
      render: (user: AttendanceUser) => user.email || '-'
    },
    {
      key: 'puesto',
      header: 'Puesto',
      render: (user: AttendanceUser) => user.puesto || '-'
    },
    {
      key: 'id_persona',
      header: 'Cédula',
      render: (user: AttendanceUser) => user.id_persona || '-'
    },
    {
      key: 'tipo_permiso_marcas',
      header: 'Permiso',
      render: (user: AttendanceUser) => (
        <span style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          background: 'rgba(99, 102, 241, 0.2)',
          color: '#a5b4fc',
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
          {permisoLabels[user.tipo_permiso_marcas] || 'Usuario'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'center' as const,
      render: (user: AttendanceUser) => (
        <button
          onClick={() => openEdit(user)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#e2e8f0',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            transition: 'all 0.2s',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <FiEdit2 size={16} />
          Editar
        </button>
      )
    }
  ]

  return (
    <div style={{
      padding: '2rem',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      color: '#e2e8f0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          margin: 0,
          background: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Gestión de Usuarios
        </h1>
        <button
          onClick={openCreate}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 600,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            transition: 'all 0.2s',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.4) 100%)'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(99, 102, 241, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          Nuevo Usuario
        </button>
      </div>

      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(20px)',
        borderRadius: '1rem',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <AttendanceTable
          columns={columns}
          data={usuarios}
          keyExtractor={(user) => user.id}
          emptyMessage="No hay usuarios registrados"
          loading={isLoading}
        />
      </div>

      {showModal && (
        <div
          onClick={() => {
            setShowModal(false)
            resetForm()
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '1rem',
              padding: '2rem',
              width: '100%',
              maxWidth: '600px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                margin: 0,
                color: '#e2e8f0'
              }}>
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.color = '#e2e8f0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#94a3b8'
                }}
              >
                <FiX size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#cbd5e1',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}>
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#e2e8f0',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#cbd5e1',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}>
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={form.apellidos}
                    onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#e2e8f0',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#cbd5e1',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#cbd5e1',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  Puesto
                </label>
                <input
                  type="text"
                  value={form.puesto}
                  onChange={(e) => setForm({ ...form, puesto: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#cbd5e1',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  Cédula (ID Persona)
                </label>
                <input
                  type="number"
                  value={form.id_persona}
                  onChange={(e) => setForm({ ...form, id_persona: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#cbd5e1',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  Fecha Entrada
                </label>
                <input
                  type="date"
                  value={form.fecha_entrada}
                  onChange={(e) => setForm({ ...form, fecha_entrada: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#cbd5e1',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  Tipo Permiso
                </label>
                <select
                  value={form.tipo_permiso_marcas}
                  onChange={(e) => setForm({ ...form, tipo_permiso_marcas: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <option value={0} style={{ background: '#1e293b', color: '#e2e8f0' }}>Usuario</option>
                  <option value={1} style={{ background: '#1e293b', color: '#e2e8f0' }}>Admin</option>
                  <option value={2} style={{ background: '#1e293b', color: '#e2e8f0' }}>Supervisor</option>
                  <option value={3} style={{ background: '#1e293b', color: '#e2e8f0' }}>SuperUsuario</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#cbd5e1',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  Password {editingUser ? '(dejar vacío para no cambiar)' : '*'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingUser}
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '2rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                disabled={createUser.isPending || updateUser.isPending}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(10px)',
                  opacity: (createUser.isPending || updateUser.isPending) ? 0.5 : 1,
                  pointerEvents: (createUser.isPending || updateUser.isPending) ? 'none' : 'auto'
                }}
                onMouseEnter={(e) => {
                  if (!createUser.isPending && !updateUser.isPending) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={createUser.isPending || updateUser.isPending}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s',
                  opacity: (createUser.isPending || updateUser.isPending) ? 0.5 : 1,
                  pointerEvents: (createUser.isPending || updateUser.isPending) ? 'none' : 'auto'
                }}
                onMouseEnter={(e) => {
                  if (!createUser.isPending && !updateUser.isPending) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.4) 100%)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
                }}
              >
                {createUser.isPending || updateUser.isPending ? 'Guardando...' : editingUser ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
