import { useState, useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { setEstadoActual, setTiempos, setMarcasHoy, addMarca } from '../../../store/slices/attendanceSlice'
import { useJornada, useMarcasHoy, useDescanso, useDiasSinSalida, useMisSolicitudes, useProyectos, useUmbralProyectos } from '../../../api/attendance/useAttendanceQueries'
import { useInsertMarca, useRequestMissingExit, useProjectMark } from '../../../api/attendance/useAttendanceMutations'
import RealtimeClock from '../shared/RealtimeClock'
import StatusBadge from '../shared/StatusBadge'
import MarkButton from '../shared/MarkButton'
import TimeCard from '../shared/TimeCard'
import ConfirmModal from '../shared/ConfirmModal'
import AttendanceTable from '../shared/AttendanceTable'
import { FiClock, FiCalendar } from 'react-icons/fi'

const formatTime = (totalSeconds: number) => {
  const s = Math.abs(Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const tipoMarcaLabels: Record<number, string> = { 1: 'Entrada', 2: 'Descanso', 3: 'Salida' }
const tipoMarcaColors: Record<number, string> = { 1: '#10b981', 2: '#f59e0b', 3: '#ef4444' }

const RegistroMarcas = () => {
  const dispatch = useAppDispatch()
  const estado = useAppSelector((s) => s.attendance.estadoActual)
  const segundosTrabajados = useAppSelector((s) => s.attendance.segundosTrabajados)
  const segundosDescanso = useAppSelector((s) => s.attendance.segundosDescanso)
  const segundosRestanteDescanso = useAppSelector((s) => s.attendance.segundosRestanteDescanso)

  const [liveSeconds, setLiveSeconds] = useState(0)
  const [liveBreak, setLiveBreak] = useState(0)
  const [exitModal, setExitModal] = useState<{ fecha: string; hora: string } | null>(null)
  const [projectModal, setProjectModal] = useState<{ idProyecto: number; tipo: 'entrada' | 'salida' } | null>(null)
  const [projectReport, setProjectReport] = useState('')

  // API hooks
  const { data: jornadaData, refetch: refetchJornada } = useJornada()
  const { data: marcasData, refetch: refetchMarcas } = useMarcasHoy()
  const { data: descansoData } = useDescanso()
  const { data: diasSinSalidaData } = useDiasSinSalida()
  const { data: solicitudesData } = useMisSolicitudes()
  const { data: proyectosData } = useProyectos()
  const { data: umbralData } = useUmbralProyectos()

  const insertMarca = useInsertMarca()
  const requestExit = useRequestMissingExit()
  const projectMark = useProjectMark()

  // Sync jornada data to Redux
  useEffect(() => {
    if (jornadaData) {
      dispatch(setEstadoActual(jornadaData.estado))
      dispatch(setTiempos({
        segundosTrabajados: jornadaData.segundosNetos,
        segundosDescanso: jornadaData.segundosDescanso,
        segundosRestanteDescanso: Math.max(0, 4200 - jornadaData.segundosDescanso),
      }))
      setLiveSeconds(jornadaData.segundosNetos)
      setLiveBreak(jornadaData.segundosDescanso)
    }
  }, [jornadaData, dispatch])

  // Sync marcas to Redux
  useEffect(() => {
    if (marcasData?.marcas) {
      dispatch(setMarcasHoy(marcasData.marcas))
    }
  }, [marcasData, dispatch])

  // Live counter
  useEffect(() => {
    if (estado !== 'TRABAJANDO' && estado !== 'DESCANSANDO') return
    const interval = setInterval(() => {
      if (estado === 'TRABAJANDO') {
        setLiveSeconds((p) => p + 1)
      } else if (estado === 'DESCANSANDO') {
        setLiveBreak((p) => p + 1)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [estado])

  const handleMark = useCallback(async (tipoMarca: number) => {
    const hora = new Date().toISOString()
    try {
      const result = await insertMarca.mutateAsync({ tipoMarca, hora })
      dispatch(addMarca({ idMarca: result.idMarca, TipoMarca: tipoMarca, Hora: hora }))
      refetchJornada()
      refetchMarcas()
    } catch {
      // Error handled by useApiPost
    }
  }, [insertMarca, dispatch, refetchJornada, refetchMarcas])

  const handleRequestExit = async () => {
    if (!exitModal) return
    try {
      await requestExit.mutateAsync(exitModal)
      setExitModal(null)
    } catch {
      // Error handled by useApiPost
    }
  }

  const handleProjectMark = async () => {
    if (!projectModal) return
    try {
      await projectMark.mutateAsync({
        idProyecto: projectModal.idProyecto,
        tipo: projectModal.tipo,
        ...(projectModal.tipo === 'salida' ? { reporte: projectReport } : {}),
      })
      setProjectModal(null)
      setProjectReport('')
    } catch {
      // Error handled by useApiPost
    }
  }

  const showEntry = estado === 'SIN_REGISTRO'
  const showBreak = estado === 'TRABAJANDO' || estado === 'DESCANSANDO'
  const showExit = estado === 'TRABAJANDO' || estado === 'DESCANSANDO'
  const showProjects = umbralData?.alcanzado

  const marcaColumns = [
    {
      key: 'TipoMarca',
      label: 'Tipo',
      render: (row: { TipoMarca: number }) => (
        <span style={{ color: tipoMarcaColors[row.TipoMarca], fontWeight: 600 }}>
          {tipoMarcaLabels[row.TipoMarca] || 'Otro'}
        </span>
      ),
    },
    {
      key: 'Hora',
      label: 'Hora',
      render: (row: { Hora: string }) => {
        try {
          return new Date(row.Hora).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        } catch {
          return row.Hora
        }
      },
    },
  ]

  return (
    <div>
      {/* Clock + Status */}
      <div className="att-card" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <RealtimeClock showDate />
        <div style={{ marginTop: '1rem' }}>
          <StatusBadge estado={estado} />
        </div>
      </div>

      {/* Mark Buttons */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {showEntry && (
          <MarkButton tipo="entrada" label="Entrada" icon="🟢" onClick={() => handleMark(1)} disabled={insertMarca.isPending} />
        )}
        {showBreak && (
          <MarkButton
            tipo="descanso"
            label={estado === 'DESCANSANDO' ? 'Fin Descanso' : 'Descanso'}
            icon="☕"
            onClick={() => handleMark(2)}
            disabled={insertMarca.isPending}
          />
        )}
        {showExit && (
          <MarkButton tipo="salida" label="Salida" icon="🔴" onClick={() => handleMark(3)} disabled={insertMarca.isPending} />
        )}
      </div>

      {/* Time Cards */}
      <div className="att-grid att-grid--3" style={{ marginBottom: '1.5rem' }}>
        <TimeCard icon="⏱️" value={formatTime(liveSeconds)} label="Horas trabajadas" color="#10b981" />
        <TimeCard icon="☕" value={formatTime(liveBreak)} label="Tiempo descanso" color="#f59e0b" />
        <TimeCard
          icon="⏳"
          value={formatTime(Math.max(0, segundosRestanteDescanso - (estado === 'DESCANSANDO' ? liveBreak - segundosDescanso : 0)))}
          label="Descanso restante"
          color="#06b6d4"
        />
      </div>

      <div className="att-grid att-grid--2" style={{ marginBottom: '1.5rem' }}>
        {/* Today's Marks */}
        <div className="att-card">
          <div className="att-card__header">
            <h3 className="att-card__title"><FiClock style={{ marginRight: '0.5rem' }} />Marcas de Hoy</h3>
          </div>
          <AttendanceTable
            columns={marcaColumns}
            data={marcasData?.marcas || []}
            emptyMessage="Sin marcas hoy"
            loading={!marcasData}
          />
        </div>

        {/* Missing Exit Days */}
        <div className="att-card">
          <div className="att-card__header">
            <h3 className="att-card__title"><FiCalendar style={{ marginRight: '0.5rem' }} />Dias sin Salida</h3>
          </div>
          {diasSinSalidaData?.dias && diasSinSalidaData.dias.length > 0 ? (
            <AttendanceTable
              columns={[
                { key: 'fecha', label: 'Fecha' },
                { key: 'entrada', label: 'Entrada' },
                {
                  key: 'action',
                  label: '',
                  render: (row: { fecha: string; tieneSolicitud: boolean }) =>
                    row.tieneSolicitud ? (
                      <span style={{ color: '#f59e0b', fontSize: '0.78rem' }}>Pendiente</span>
                    ) : (
                      <button
                        className="att-btn att-btn--outline att-btn--sm"
                        onClick={() => setExitModal({ fecha: row.fecha, hora: '17:00' })}
                      >
                        Solicitar
                      </button>
                    ),
                },
              ]}
              data={diasSinSalidaData.dias.slice(0, 10)}
              emptyMessage="Sin dias pendientes"
            />
          ) : (
            <div className="att-empty">
              <div className="att-empty__text">No hay dias sin salida</div>
            </div>
          )}
        </div>
      </div>

      {/* Pending Requests */}
      {solicitudesData?.solicitudes && solicitudesData.solicitudes.length > 0 && (
        <div className="att-card" style={{ marginBottom: '1.5rem' }}>
          <div className="att-card__header">
            <h3 className="att-card__title">Mis Solicitudes</h3>
          </div>
          <AttendanceTable
            columns={[
              { key: 'tipoSolicitud', label: 'Tipo' },
              { key: 'Hora', label: 'Fecha/Hora', render: (r: { Hora: string }) => new Date(r.Hora).toLocaleString('es-CR') },
              {
                key: 'aprobado',
                label: 'Estado',
                render: (r: { aprobado: number; eliminado: boolean }) =>
                  r.aprobado === 1 ? (
                    <span style={{ color: '#10b981' }}>Aprobada</span>
                  ) : r.eliminado ? (
                    <span style={{ color: '#ef4444' }}>Rechazada</span>
                  ) : (
                    <span style={{ color: '#f59e0b' }}>Pendiente</span>
                  ),
              },
            ]}
            data={solicitudesData.solicitudes.slice(0, 10)}
          />
        </div>
      )}

      {/* Special Projects */}
      {showProjects && proyectosData?.proyectos && (
        <div className="att-card">
          <div className="att-card__header">
            <h3 className="att-card__title">Proyectos Especiales</h3>
            <span style={{ color: '#10b981', fontSize: '0.78rem' }}>Umbral 9h alcanzado</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {proyectosData.proyectos.filter(p => p.activo).map((proyecto) => (
              <div key={proyecto.idProyecto} className="att-card" style={{ flex: '1 1 200px', minWidth: '200px' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>{proyecto.nombre}</h4>
                {proyecto.descripcion && (
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>{proyecto.descripcion}</p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="att-btn att-btn--success att-btn--sm"
                    onClick={() => setProjectModal({ idProyecto: proyecto.idProyecto, tipo: 'entrada' })}
                  >
                    Entrada
                  </button>
                  <button
                    className="att-btn att-btn--danger att-btn--sm"
                    onClick={() => setProjectModal({ idProyecto: proyecto.idProyecto, tipo: 'salida' })}
                  >
                    Salida
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Exit Modal */}
      <ConfirmModal
        isOpen={!!exitModal}
        title="Solicitar Salida Faltante"
        message={`Se solicitara una salida para el dia ${exitModal?.fecha} a las ${exitModal?.hora}. Un administrador debera aprobar esta solicitud.`}
        onConfirm={handleRequestExit}
        onCancel={() => setExitModal(null)}
        loading={requestExit.isPending}
      />

      {/* Project Mark Modal */}
      {projectModal && (
        <div className="att-modal-overlay" onClick={() => setProjectModal(null)}>
          <div className="att-modal" onClick={(e) => e.stopPropagation()}>
            <div className="att-modal__header">
              <h3 className="att-modal__title">
                {projectModal.tipo === 'entrada' ? 'Entrada a Proyecto' : 'Salida de Proyecto'}
              </h3>
            </div>
            {projectModal.tipo === 'salida' && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="att-label">Reporte de actividades</label>
                <textarea
                  className="att-input"
                  rows={4}
                  placeholder="Describe las actividades realizadas..."
                  value={projectReport}
                  onChange={(e) => setProjectReport(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}
            <div className="att-modal__footer">
              <button className="att-btn att-btn--outline" onClick={() => { setProjectModal(null); setProjectReport('') }}>
                Cancelar
              </button>
              <button
                className={`att-btn att-btn--${projectModal.tipo === 'entrada' ? 'success' : 'danger'}`}
                onClick={handleProjectMark}
                disabled={projectMark.isPending}
              >
                {projectMark.isPending && <span className="att-spinner" />}
                Confirmar {projectModal.tipo === 'entrada' ? 'Entrada' : 'Salida'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegistroMarcas
