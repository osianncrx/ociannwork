import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { setEstadoActual, setTiempos } from '../../../store/slices/attendanceSlice'
import { setCurrentTab } from '../../../store/slices/screenSlice'
import { useJornada } from '../../../api/attendance/useAttendanceQueries'
import { useInsertMarca } from '../../../api/attendance/useAttendanceMutations'
import { FiClock, FiArrowRight, FiChevronUp, FiChevronDown } from 'react-icons/fi'

const formatTime = (totalSeconds: number) => {
  const s = Math.abs(Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const estadoConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  TRABAJANDO: { label: 'Trabajando', color: '#166534', bg: '#f0fdf4', dot: '#22c55e' },
  DESCANSANDO: { label: 'En descanso', color: '#92400e', bg: '#fffbeb', dot: '#f59e0b' },
  TERMINADO: { label: 'Jornada terminada', color: '#312e81', bg: '#eef2ff', dot: '#6366f1' },
  SIN_REGISTRO: { label: 'Sin registro', color: '#475569', bg: '#f1f5f9', dot: '#94a3b8' },
}

const AttendanceWidget = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const estado = useAppSelector((s) => s.attendance.estadoActual)
  const [liveSeconds, setLiveSeconds] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const { data: jornadaData, refetch: refetchJornada } = useJornada()
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
    }
  }, [jornadaData, dispatch])

  useEffect(() => {
    if (estado !== 'TRABAJANDO' && estado !== 'DESCANSANDO') return
    const interval = setInterval(() => {
      if (estado === 'TRABAJANDO') setLiveSeconds((p) => p + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [estado])

  const handleMark = useCallback(async (tipoMarca: number, label: string) => {
    const hora = new Date().toISOString()
    try {
      await insertMarca.mutateAsync({ tipoMarca, hora })
      refetchJornada()
      setFeedback(`${label} registrada`)
      setTimeout(() => setFeedback(null), 2500)
    } catch {
      setFeedback('Error al registrar')
      setTimeout(() => setFeedback(null), 2500)
    }
  }, [insertMarca, refetchJornada])

  const cfg = estadoConfig[estado] || estadoConfig.SIN_REGISTRO
  const showEntry = estado === 'SIN_REGISTRO'
  const showBreak = estado === 'TRABAJANDO' || estado === 'DESCANSANDO'
  const showExit = estado === 'TRABAJANDO' || estado === 'DESCANSANDO'

  return (
    <div className="att-widget">
      {/* Header - always visible */}
      <div className="att-widget__header" onClick={() => setCollapsed(!collapsed)}>
        <div className="att-widget__header-left">
          <FiClock className="att-widget__clock-icon" />
          <span className="att-widget__title">Marcas</span>
          <div className="att-widget__status-dot" style={{ background: cfg.dot }} />
          <span className="att-widget__status-label" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
        <div className="att-widget__header-right">
          {(estado === 'TRABAJANDO' || estado === 'TERMINADO') && (
            <span className="att-widget__timer">{formatTime(liveSeconds)}</span>
          )}
          {collapsed ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </div>
      </div>

      {/* Body - collapsible */}
      {!collapsed && (
        <div className="att-widget__body">
          {/* Action buttons */}
          <div className="att-widget__actions">
            {showEntry && (
              <button
                className="att-widget__btn att-widget__btn--entry"
                onClick={() => handleMark(1, 'Entrada')}
                disabled={insertMarca.isPending}
              >
                <span className="att-widget__btn-icon">▶</span>
                Entrada
              </button>
            )}
            {showBreak && (
              <button
                className="att-widget__btn att-widget__btn--break"
                onClick={() => handleMark(2, estado === 'DESCANSANDO' ? 'Fin Descanso' : 'Descanso')}
                disabled={insertMarca.isPending}
              >
                <span className="att-widget__btn-icon">☕</span>
                {estado === 'DESCANSANDO' ? 'Fin Descanso' : 'Descanso'}
              </button>
            )}
            {showExit && (
              <button
                className="att-widget__btn att-widget__btn--exit"
                onClick={() => handleMark(3, 'Salida')}
                disabled={insertMarca.isPending}
              >
                <span className="att-widget__btn-icon">⏹</span>
                Salida
              </button>
            )}
            {estado === 'TERMINADO' && (
              <div className="att-widget__done-msg">
                Jornada completada - {formatTime(liveSeconds)} trabajadas
              </div>
            )}
          </div>

          {/* Feedback message */}
          {feedback && (
            <div className="att-widget__feedback">{feedback}</div>
          )}

          {/* Link to full module */}
          <button
            className="att-widget__link"
            onClick={() => {
              dispatch(setCurrentTab('attendance'))
              navigate('?tab=attendance', { replace: true })
            }}
          >
            <FiArrowRight size={14} />
            Ir al módulo completo de Marcas
          </button>
        </div>
      )}
    </div>
  )
}

export default AttendanceWidget
