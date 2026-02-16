import { useState, useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { setEstadoActual, setTiempos, setMarcasHoy, addMarca } from '../../../store/slices/attendanceSlice'
import { useJornada, useMarcasHoy } from '../../../api/attendance/useAttendanceQueries'
import { useInsertMarca } from '../../../api/attendance/useAttendanceMutations'
import { FiClock, FiUsers, FiCalendar, FiCheckSquare, FiPlusCircle, FiFileText, FiBarChart2, FiSettings, FiBriefcase, FiCreditCard, FiShield, FiEye } from 'react-icons/fi'
import type { AttendancePage } from './index'

const formatTime = (totalSeconds: number) => {
  const s = Math.abs(Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const estadoConfig: Record<string, { label: string; color: string; bg: string }> = {
  TRABAJANDO: { label: 'Trabajando', color: '#16a34a', bg: '#f0fdf4' },
  DESCANSANDO: { label: 'En descanso', color: '#d97706', bg: '#fffbeb' },
  TERMINADO: { label: 'Jornada terminada', color: '#4f46e5', bg: '#eef2ff' },
  SIN_REGISTRO: { label: 'Sin registro', color: '#64748b', bg: '#f8fafc' },
}

const tipoMarcaLabels: Record<number, string> = { 1: 'Entrada', 2: 'Descanso', 3: 'Salida' }
const tipoMarcaColors: Record<number, string> = { 1: '#16a34a', 2: '#d97706', 3: '#dc2626' }

interface Props {
  onNavigate: (page: AttendancePage) => void
}

const AttendanceDashboard = ({ onNavigate }: Props) => {
  const dispatch = useAppDispatch()
  const estado = useAppSelector((s) => s.attendance.estadoActual)
  const user = useAppSelector((s) => s.auth.user)
  const userRole = (user as Record<string, unknown>)?.tipo_permiso_marcas as number ?? 0
  const isSuperAdmin = (user as Record<string, unknown>)?.es_super_admin_marcas as boolean ?? false

  const [liveSeconds, setLiveSeconds] = useState(0)
  const [liveBreak, setLiveBreak] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)

  const { data: jornadaData, refetch: refetchJornada } = useJornada()
  const { data: marcasData, refetch: refetchMarcas } = useMarcasHoy()
  const insertMarca = useInsertMarca()

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

  useEffect(() => {
    if (marcasData?.marcas) dispatch(setMarcasHoy(marcasData.marcas))
  }, [marcasData, dispatch])

  useEffect(() => {
    if (estado !== 'TRABAJANDO' && estado !== 'DESCANSANDO') return
    const interval = setInterval(() => {
      if (estado === 'TRABAJANDO') setLiveSeconds((p) => p + 1)
      else if (estado === 'DESCANSANDO') setLiveBreak((p) => p + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [estado])

  const handleMark = useCallback(async (tipoMarca: number, label: string) => {
    const hora = new Date().toISOString()
    try {
      const result = await insertMarca.mutateAsync({ tipoMarca, hora })
      dispatch(addMarca({ idMarca: result.idMarca, TipoMarca: tipoMarca, Hora: hora }))
      refetchJornada()
      refetchMarcas()
      setFeedback(`${label} registrada`)
      setTimeout(() => setFeedback(null), 3000)
    } catch {
      setFeedback('Error al registrar marca')
      setTimeout(() => setFeedback(null), 3000)
    }
  }, [insertMarca, dispatch, refetchJornada, refetchMarcas])

  const cfg = estadoConfig[estado] || estadoConfig.SIN_REGISTRO
  const showEntry = estado === 'SIN_REGISTRO'
  const showBreak = estado === 'TRABAJANDO' || estado === 'DESCANSANDO'
  const showExit = estado === 'TRABAJANDO' || estado === 'DESCANSANDO'
  const isAdmin = userRole >= 1 || isSuperAdmin

  const now = new Date()
  const timeStr = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const dateStr = now.toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const navItems: { key: AttendancePage; label: string; icon: React.ReactNode; admin?: boolean; superOnly?: boolean }[] = [
    { key: 'employee-status', label: 'Estado Empleados', icon: <FiUsers />, admin: true },
    { key: 'employee-status-date', label: 'Estado por Fecha', icon: <FiCalendar />, admin: true },
    { key: 'accept-marks', label: 'Aprobar Marcas', icon: <FiCheckSquare />, admin: true },
    { key: 'accept-overtime', label: 'Aprobar Extras', icon: <FiCheckSquare />, admin: true },
    { key: 'request-overtime', label: 'Solicitar Extras', icon: <FiPlusCircle /> },
    { key: 'view-overtime', label: 'Mis Extras', icon: <FiEye /> },
    { key: 'my-report', label: 'Mi Reporte', icon: <FiFileText /> },
    { key: 'admin-report', label: 'Reporte General', icon: <FiBarChart2 />, admin: true },
    { key: 'manage-users', label: 'Gestión Usuarios', icon: <FiSettings />, admin: true },
    { key: 'manage-projects', label: 'Gestión Proyectos', icon: <FiBriefcase />, admin: true },
    { key: 'bank-accounts', label: 'Cuentas Bancarias', icon: <FiCreditCard /> },
    { key: 'super-admin', label: 'Super Admin', icon: <FiShield />, superOnly: true },
  ]

  const visibleNavItems = navItems.filter(item => {
    if (item.superOnly && !isSuperAdmin) return false
    if (item.admin && !isAdmin) return false
    return true
  })

  return (
    <div className="att-dash">
      {/* Status & Clock Section */}
      <div className="att-dash__top">
        <div className="att-dash__status-card">
          <div className="att-dash__clock-section">
            <div className="att-dash__time">{timeStr}</div>
            <div className="att-dash__date">{dateStr}</div>
          </div>
          <div className="att-dash__status-section">
            <div className="att-dash__status-badge" style={{ background: cfg.bg, color: cfg.color }}>
              <span className="att-dash__status-dot" style={{ background: cfg.color }} />
              {cfg.label}
            </div>
          </div>
        </div>

        {/* Mark Buttons */}
        <div className="att-dash__mark-buttons">
          {showEntry && (
            <button className="att-dash__mark-btn att-dash__mark-btn--entry" onClick={() => handleMark(1, 'Entrada')} disabled={insertMarca.isPending}>
              <span>▶</span> Marcar Entrada
            </button>
          )}
          {showBreak && (
            <button className="att-dash__mark-btn att-dash__mark-btn--break" onClick={() => handleMark(2, estado === 'DESCANSANDO' ? 'Fin Descanso' : 'Descanso')} disabled={insertMarca.isPending}>
              <span>☕</span> {estado === 'DESCANSANDO' ? 'Fin Descanso' : 'Iniciar Descanso'}
            </button>
          )}
          {showExit && (
            <button className="att-dash__mark-btn att-dash__mark-btn--exit" onClick={() => handleMark(3, 'Salida')} disabled={insertMarca.isPending}>
              <span>⏹</span> Marcar Salida
            </button>
          )}
          {estado === 'TERMINADO' && (
            <div className="att-dash__done-badge">Jornada completada</div>
          )}
        </div>

        {feedback && <div className="att-dash__feedback">{feedback}</div>}
      </div>

      {/* Time Stats */}
      <div className="att-dash__stats">
        <div className="att-dash__stat-card">
          <div className="att-dash__stat-icon" style={{ color: '#16a34a' }}>⏱️</div>
          <div className="att-dash__stat-value">{formatTime(liveSeconds)}</div>
          <div className="att-dash__stat-label">Horas trabajadas</div>
        </div>
        <div className="att-dash__stat-card">
          <div className="att-dash__stat-icon" style={{ color: '#d97706' }}>☕</div>
          <div className="att-dash__stat-value">{formatTime(liveBreak)}</div>
          <div className="att-dash__stat-label">Tiempo descanso</div>
        </div>
        <div className="att-dash__stat-card">
          <div className="att-dash__stat-icon" style={{ color: '#0891b2' }}>⏳</div>
          <div className="att-dash__stat-value">{formatTime(Math.max(0, 4200 - liveBreak))}</div>
          <div className="att-dash__stat-label">Descanso restante</div>
        </div>
      </div>

      {/* Today's Marks */}
      <div className="att-dash__section">
        <h3 className="att-dash__section-title"><FiClock style={{ marginRight: 6 }} /> Marcas de Hoy</h3>
        {marcasData?.marcas && marcasData.marcas.length > 0 ? (
          <div className="att-dash__marks-list">
            {marcasData.marcas.map((m: any) => (
              <div key={m.idMarca} className="att-dash__mark-item">
                <span className="att-dash__mark-type" style={{ color: tipoMarcaColors[m.TipoMarca] }}>
                  {tipoMarcaLabels[m.TipoMarca]}
                </span>
                <span className="att-dash__mark-time">
                  {new Date(m.Hora).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="att-dash__empty">No hay marcas registradas hoy</p>
        )}
      </div>

      {/* Quick Nav */}
      <div className="att-dash__section">
        <h3 className="att-dash__section-title">Accesos Rápidos</h3>
        <div className="att-dash__nav-grid">
          {visibleNavItems.map(item => (
            <button key={item.key} className="att-dash__nav-btn" onClick={() => onNavigate(item.key)}>
              <span className="att-dash__nav-icon">{item.icon}</span>
              <span className="att-dash__nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AttendanceDashboard
