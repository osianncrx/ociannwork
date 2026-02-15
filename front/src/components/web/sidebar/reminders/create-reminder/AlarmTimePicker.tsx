import { FC } from 'react'
import { SearchableSelectInput } from '../../../../../shared/form-fields'
import { AlarmTimePickerProps, OptionType } from '../../../../../types'

const AlarmTimePicker: FC<AlarmTimePickerProps> = ({
  selectedHour,
  selectedMinute,
  selectedPeriod,
  onHourChange,
  onMinuteChange,
  onPeriodChange,
}) => {
  const hourOptions: OptionType[] = Array.from({ length: 12 }, (_, i) => {
    const hour = i === 0 ? 12 : i
    return { value: hour.toString(), label: hour.toString().padStart(2, '0') }
  })

  const minuteOptions: OptionType[] = Array.from({ length: 60 }, (_, i) => ({
    value: i.toString().padStart(2, '0'),
    label: i.toString().padStart(2, '0'),
  }))

  const periodOptions: OptionType[] = [
    { value: 'AM', label: 'AM' },
    { value: 'PM', label: 'PM' },
  ]

  return (
    <div className="time-picker-container">
      <label className="custom-time-label">Select Time</label>
      <div className="alarm-time-picker">
        <div className="time-picker-group">
          <div>
            <SearchableSelectInput
              name="hour"
              placeholder="Hour"
              options={hourOptions}
              value={selectedHour}
              onOptionChange={(selected: OptionType | OptionType[] | null) =>
                onHourChange(selected as OptionType | null)
              }
              isMulti={false}
              isClearable={false}
              noWrapper={true}
              className="time-select-input"
            />
          </div>
          <div>
            <SearchableSelectInput
              name="minute"
              placeholder="Min"
              options={minuteOptions}
              value={selectedMinute}
              onOptionChange={(selected: OptionType | OptionType[] | null) =>
                onMinuteChange(selected as OptionType | null)
              }
              isMulti={false}
              isClearable={false}
              noWrapper={true}
              className="time-select-input"
            />
          </div>
          <div>
            <SearchableSelectInput
              name="period"
              placeholder="AM/PM"
              options={periodOptions}
              value={selectedPeriod}
              onOptionChange={(selected: OptionType | OptionType[] | null) =>
                onPeriodChange(selected as OptionType | null)
              }
              isMulti={false}
              isClearable={false}
              noWrapper={true}
              className="time-select-input"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlarmTimePicker
