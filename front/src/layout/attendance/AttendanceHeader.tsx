import { useState, useEffect } from 'react'
import { useAppSelector } from '../../store/hooks'
import { FiMenu } from 'react-icons/fi'

interface HeaderProps {
  onToggleSidebar: () => void
  title?: string
}

const AttendanceHeader = ({ onToggleSidebar, title }: HeaderProps) => {
  const [time, setTime] = useState(new Date())
  const user = useAppSelector((state) => state.auth.user)
  const estado = useAppSelector((state) => state.attendance.estadoActual)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatClock = (date: Date) => {
    return date.toLocaleTimeString('es-CR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  const getStatusText = () => {
    switch (estado) {
      case 'TRABAJANDO': return 'Trabajando'
      case 'DESCANSANDO': return 'En descanso'
      case 'TERMINADO': return 'Jornada terminada'
      default: return 'Sin registro'
    }
  }

  const getStatusClass = () => {
    switch (estado) {
      case 'TRABAJANDO': return 'att-status-badge--working'
      case 'DESCANSANDO': return 'att-status-badge--break'
      case 'TERMINADO': return 'att-status-badge--done'
      default: return 'att-status-badge--none'
    }
  }

  const userName = (user as Record<string, unknown>)?.name as string || 'Usuario'
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <header className="attendance-header">
      <div className="attendance-header__left">
        <button className="attendance-header__toggle" onClick={onToggleSidebar}>
          <FiMenu />
        </button>
        {title && <h1 className="attendance-header__title">{title}</h1>}
        <span className={`att-status-badge ${getStatusClass()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="attendance-header__right">
        <div className="attendance-header__clock">{formatClock(time)}</div>
        <div className="attendance-header__user">
          <div>
            <div className="attendance-header__user-name">{userName}</div>
          </div>
          <div className="attendance-header__avatar">{initials}</div>
        </div>
      </div>
    </header>
  )
}

export default AttendanceHeader
