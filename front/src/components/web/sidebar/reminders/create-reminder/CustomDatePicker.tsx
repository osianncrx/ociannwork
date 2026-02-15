import { FC } from 'react'
import DatePicker from 'react-datepicker'
import { CustomDatePickerProps } from '../../../../../types'

const CustomDatePicker: FC<CustomDatePickerProps> = ({ customDate, onDateChange }) => {
  return (
    <div className="date-picker-container">
      <label className="custom-time-label">Select Date</label>
      <DatePicker
        selected={customDate}
        onChange={onDateChange}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        inline
        minDate={new Date()}
        maxDate={new Date(new Date().getFullYear() + 1, 11, 31)}
        calendarClassName="custom-reminder-calendar"
      />
    </div>
  )
}

export default CustomDatePicker
