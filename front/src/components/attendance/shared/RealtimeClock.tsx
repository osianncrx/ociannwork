import { useState, useEffect } from 'react'

interface RealtimeClockProps {
  className?: string
  showDate?: boolean
}

const RealtimeClock = ({ className = '', showDate = false }: RealtimeClockProps) => {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = now.toLocaleTimeString('es-CR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const dateStr = now.toLocaleDateString('es-CR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className={className}>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>
        {timeStr}
      </div>
      {showDate && (
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem', textTransform: 'capitalize' }}>
          {dateStr}
        </div>
      )}
    </div>
  )
}

export default RealtimeClock
