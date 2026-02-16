interface TimeCardProps {
  icon: string
  value: string
  label: string
  color?: string
}

const TimeCard = ({ icon, value, label, color }: TimeCardProps) => {
  return (
    <div className="att-time-card">
      <div className="att-time-card__icon" style={color ? { color } : undefined}>{icon}</div>
      <div className="att-time-card__value" style={color ? { color } : undefined}>{value}</div>
      <div className="att-time-card__label">{label}</div>
    </div>
  )
}

export default TimeCard
