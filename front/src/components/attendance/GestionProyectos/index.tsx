import { useState } from 'react'
import { useProyectos } from '../../../api/attendance/useAttendanceQueries'
import { useCreateProject, useUpdateProject, useDeleteProject } from '../../../api/attendance/useAttendanceMutations'
import AttendanceTable from '../shared/AttendanceTable'
import ConfirmModal from '../shared/ConfirmModal'
import { FiX, FiEdit2, FiTrash2 } from 'react-icons/fi'

interface Proyecto {
  idProyecto: number
  nombre: string
  descripcion: string
  team_id: number
  activo: boolean
}

export default function GestionProyectos() {
  const { data, isLoading, refetch } = useProyectos()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Proyecto | null>(null)
  const [deletingProject, setDeletingProject] = useState<Proyecto | null>(null)
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    activo: true
  })

  const proyectos = data?.proyectos || []

  const resetForm = () => {
    setForm({
      nombre: '',
      descripcion: '',
      activo: true
    })
    setEditingProject(null)
  }

  const openCreate = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (project: Proyecto) => {
    setEditingProject(project)
    setForm({
      nombre: project.nombre || '',
      descripcion: project.descripcion || '',
      activo: project.activo ?? true
    })
    setShowModal(true)
  }

  const openDelete = (project: Proyecto) => {
    setDeletingProject(project)
    setShowDeleteModal(true)
  }

  const handleSave = async () => {
    try {
      if (editingProject) {
        await updateProject.mutateAsync({
          id: editingProject.idProyecto,
          nombre: form.nombre,
          descripcion: form.descripcion,
          activo: form.activo
        })
      } else {
        await createProject.mutateAsync({
          nombre: form.nombre,
          descripcion: form.descripcion
        })
      }
      setShowModal(false)
      resetForm()
      refetch()
    } catch (error) {
      console.error('Error saving project:', error)
    }
  }

  const handleDelete = async () => {
    if (!deletingProject) return
    try {
      await deleteProject.mutateAsync({ id: deletingProject.idProyecto })
      setShowDeleteModal(false)
      setDeletingProject(null)
      refetch()
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  const handleToggle = async (project: Proyecto) => {
    try {
      await updateProject.mutateAsync({
        id: project.idProyecto,
        activo: !project.activo
      })
      refetch()
    } catch (error) {
      console.error('Error toggling project:', error)
    }
  }

  const columns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (project: Proyecto) => (
        <strong style={{ color: '#e2e8f0' }}>{project.nombre || '-'}</strong>
      )
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      render: (project: Proyecto) => (
        <span style={{
          color: '#94a3b8',
          maxWidth: '400px',
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {project.descripcion || '-'}
        </span>
      )
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (project: Proyecto) => (
        <span style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          background: project.activo
            ? 'rgba(34, 197, 94, 0.2)'
            : 'rgba(239, 68, 68, 0.2)',
          color: project.activo ? '#86efac' : '#fca5a5',
          border: `1px solid ${project.activo ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          {project.activo ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'center' as const,
      render: (project: Proyecto) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={() => handleToggle(project)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#e2e8f0',
              cursor: 'pointer',
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
            {project.activo ? 'Desactivar' : 'Activar'}
          </button>
          <button
            onClick={() => openEdit(project)}
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
          <button
            onClick={() => openDelete(project)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#fca5a5',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
            }}
          >
            <FiTrash2 size={16} />
            Eliminar
          </button>
        </div>
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
          Gestión de Proyectos
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
          Nuevo Proyecto
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
          data={proyectos}
          keyExtractor={(project) => project.idProyecto}
          emptyMessage="No hay proyectos registrados"
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
                {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
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
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
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
                  Descripción
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={4}
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
                    resize: 'vertical',
                    fontFamily: 'inherit'
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

              {editingProject && (
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: '#cbd5e1',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                      style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        cursor: 'pointer',
                        accentColor: '#6366f1'
                      }}
                    />
                    <span>Activo</span>
                  </label>
                </div>
              )}
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
                disabled={createProject.isPending || updateProject.isPending}
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
                  opacity: (createProject.isPending || updateProject.isPending) ? 0.5 : 1,
                  pointerEvents: (createProject.isPending || updateProject.isPending) ? 'none' : 'auto'
                }}
                onMouseEnter={(e) => {
                  if (!createProject.isPending && !updateProject.isPending) {
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
                disabled={createProject.isPending || updateProject.isPending}
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
                  opacity: (createProject.isPending || updateProject.isPending) ? 0.5 : 1,
                  pointerEvents: (createProject.isPending || updateProject.isPending) ? 'none' : 'auto'
                }}
                onMouseEnter={(e) => {
                  if (!createProject.isPending && !updateProject.isPending) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.4) 100%)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
                }}
              >
                {createProject.isPending || updateProject.isPending ? 'Guardando...' : editingProject ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Eliminar Proyecto"
        message={deletingProject ? `¿Estás seguro de que deseas eliminar el proyecto "${deletingProject.nombre}"? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteModal(false)
          setDeletingProject(null)
        }}
        loading={deleteProject.isPending}
      />
    </div>
  )
}
