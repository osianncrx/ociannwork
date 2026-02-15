import { FC } from 'react'
import { QuickTimeOptionsProps, TimeOption } from '../../../../../types'

const QuickTimeOptions: FC<QuickTimeOptionsProps> = ({ selectedTime, selectedTimeUnit, onTimeSelection }) => {
  const timeOptions: TimeOption[] = [
    { value: '1', label: '1', unit: 'minutes' },
    { value: '30', label: '30', unit: 'minutes' },
    { value: '1', label: '1', unit: 'hour' },
  ]

  return (
    <div className="time-options-grid">
      {timeOptions.map((option) => (
        <button
          key={`${option.value}-${option.unit}`}
          className={`time-option ${selectedTime === option.value && selectedTimeUnit === option.unit ? 'selected' : ''}`}
          onClick={() => onTimeSelection(option.value, option.unit)}
        >
          <span className="time-value">{option.label}</span>
          <span className="time-unit">{option.unit}</span>
        </button>
      ))}
    </div>
  )
}

export default QuickTimeOptions
