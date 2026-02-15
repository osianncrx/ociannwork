import { addDays, addHours, addMinutes, format, isToday, isTomorrow, isValid, parse } from 'date-fns'
import { FC, useEffect, useState } from 'react'
import { mutations } from '../../../../../api'
import { ChatType } from '../../../../../constants'
import { SolidButton } from '../../../../../shared/button'
import { TextInput } from '../../../../../shared/form-fields'
import UserChannelSelector from '../../../../../shared/form-fields/UserChannelInput'
import { SvgIcon } from '../../../../../shared/icons'
import { OptionType, OptionTypeWithData } from '../../../../../types'
import { toaster } from '../../../../../utils/custom-functions'
import AlarmTimePicker from './AlarmTimePicker'
import CustomDatePicker from './CustomDatePicker'
import QuickTimeOptions from './QuickTimeOptions'
import RepeatSelector from './RepeatSelector'
import TimePreview from './TimePreview'

const CreateReminder: FC<{ onBack: () => void }> = ({ onBack }) => {
  const [reminderFor, setReminderFor] = useState<OptionTypeWithData | null>(null)
  const [reminderAbout, setReminderAbout] = useState('')
  const [selectedTime, setSelectedTime] = useState('1')
  const [selectedTimeUnit, setSelectedTimeUnit] = useState('minutes')
  const [showCustomTime, setShowCustomTime] = useState(false)
  const [customDate, setCustomDate] = useState<Date | null>(null)
  const [selectedHour, setSelectedHour] = useState<OptionType | null>({ value: '12', label: '12' })
  const [selectedMinute, setSelectedMinute] = useState<OptionType | null>({ value: '00', label: '00' })
  const [selectedPeriod, setSelectedPeriod] = useState<OptionType | null>({ value: 'PM', label: 'PM' })
  const [repeatOption, setRepeatOption] = useState<OptionType | null>({
    value: 'Do not repeat',
    label: 'Do not repeat',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { mutateAsync: setReminder } = mutations.useSetReminder()
  useEffect(() => {
    const now = new Date()
    const tomorrow = addDays(now, 1)

    setCustomDate(tomorrow)

    const hour12 = now.getHours() % 12 || 12
    const minute = now.getMinutes()
    const period = now.getHours() >= 12 ? 'PM' : 'AM'

    setSelectedHour({ value: hour12.toString(), label: hour12.toString().padStart(2, '0') })
    setSelectedMinute({ value: minute.toString().padStart(2, '0'), label: minute.toString().padStart(2, '0') })
    setSelectedPeriod({ value: period, label: period })
  }, [])

  const calculateReminderTime = (): Date => {
    const now = new Date()

    if (showCustomTime && customDate) {
      try {
        // Parse the alarm-style time
        const parsedTime = parseAlarmTime()

        if (!parsedTime) {
          throw new Error('Invalid time format')
        }

        // Combine date and time
        const reminderDate = new Date(customDate)
        reminderDate.setHours(parsedTime.getHours())
        reminderDate.setMinutes(parsedTime.getMinutes())
        reminderDate.setSeconds(0)
        reminderDate.setMilliseconds(0)

        return reminderDate
      } catch (error) {
        console.error('Error parsing custom time:', error)
      }
    }

    const timeValue = parseInt(selectedTime)

    if (selectedTimeUnit === 'minutes') {
      return addMinutes(now, timeValue)
    } else if (selectedTimeUnit === 'hour') {
      return addHours(now, timeValue)
    }

    return now
  }

  const handleTimeSelection = (value: string, unit: string) => {
    setSelectedTime(value)
    setSelectedTimeUnit(unit)
    setShowCustomTime(false)
  }

  const toggleCustomTime = () => {
    setShowCustomTime(!showCustomTime)
    if (!showCustomTime) {
      setSelectedTime('')
      setSelectedTimeUnit('')
      const tomorrow = addDays(new Date(), 1)
      setCustomDate(tomorrow)

      // Initialize alarm picker with current time
      const now = new Date()
      const hour12 = now.getHours() % 12 || 12
      const minute = now.getMinutes()
      const period = now.getHours() >= 12 ? 'PM' : 'AM'

      setSelectedHour({ value: hour12.toString(), label: hour12.toString().padStart(2, '0') })
      setSelectedMinute({ value: minute.toString().padStart(2, '0'), label: minute.toString().padStart(2, '0') })
      setSelectedPeriod({ value: period, label: period })
    }
  }

  const parseAlarmTime = (): Date | null => {
    if (!selectedHour?.value || !selectedMinute?.value || !selectedPeriod?.value) return null

    const now = new Date()
    let hour = parseInt(selectedHour.value.toString())
    const minute = parseInt(selectedMinute.value.toString())

    // Convert 12-hour to 24-hour format
    if (selectedPeriod.value === 'AM') {
      if (hour === 12) hour = 0
    } else {
      if (hour !== 12) hour += 12
    }

    const parsedTime = new Date(now)
    parsedTime.setHours(hour)
    parsedTime.setMinutes(minute)
    parsedTime.setSeconds(0)
    parsedTime.setMilliseconds(0)

    return parsedTime
  }

  const parseCustomTime = (timeString: string): Date | null => {
    // If we're using alarm-style picker, use parseAlarmTime instead
    if (showCustomTime && selectedHour && selectedMinute && selectedPeriod) {
      return parseAlarmTime()
    }

    if (!timeString.trim()) return null

    const now = new Date()
    let parsedTime: Date | null = null

    // Try parsing different time formats
    const formats = [
      'h:mmaaa',
      'h:mm aaa',
      'h:mmaaa',
      'H:mm',
      'h aaa',
      'h aa',
      'H',
    ]

    for (const formatStr of formats) {
      try {
        const testTime = parse(timeString.toLowerCase(), formatStr, now)
        if (isValid(testTime)) {
          parsedTime = testTime
          break
        }
      } catch (error) {
        continue
      }
    }

    return parsedTime
  }

  const isTimeInPast = (selectedDate: Date, timeString?: string): boolean => {
    if (!selectedDate) return false

    let parsedTime: Date | null = null

    // If using alarm-style picker
    if (showCustomTime && selectedHour && selectedMinute && selectedPeriod) {
      parsedTime = parseAlarmTime()
    } else if (timeString?.trim()) {
      parsedTime = parseCustomTime(timeString)
    }

    if (!parsedTime) return false

    // Combine selected date with parsed time
    const reminderDateTime = new Date(selectedDate)
    reminderDateTime.setHours(parsedTime.getHours())
    reminderDateTime.setMinutes(parsedTime.getMinutes())
    reminderDateTime.setSeconds(0)
    reminderDateTime.setMilliseconds(0)

    const now = new Date()
    return reminderDateTime <= now
  }

  const handleSubmit = async () => {
    if (!reminderFor) {
      toaster('error', 'Please select who to remind')
      return
    }

    if (!reminderAbout.trim()) {
      toaster('error', 'Please enter what to remind about')
      return
    }

    if (showCustomTime && customDate) {
      if (isTimeInPast(customDate)) {
        toaster('error', 'Please select a future time for the reminder')
        return
      }

      const parsedTime = parseAlarmTime()
      if (!parsedTime) {
        toaster('error', 'Please select a valid time')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const remindAt = calculateReminderTime()
      const { type, id } = reminderFor.data

      const payload = {
        remind_at: remindAt.toISOString(),
        note: reminderAbout.trim(),
        ...(type === ChatType.Channel ? { channel_id: parseInt(id) } : { recipient_id: parseInt(id) }),
      }

      await setReminder(payload)
      toaster('success', 'Reminder set successfully!')
      onBack()
    } catch (error: any) {
      toaster('error', error?.data?.message || 'Failed to set reminder. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPreviewTime = (): string => {
    if (showCustomTime && customDate) {
      try {
        const parsedTime = parseAlarmTime()
        if (!parsedTime) {
          return 'Invalid time format'
        }

        const reminderTime = calculateReminderTime()

        if (isTimeInPast(customDate)) {
          return 'Time cannot be in the past'
        }

        let dayLabel = ''

        if (isToday(reminderTime)) {
          dayLabel = 'Today'
        } else if (isTomorrow(reminderTime)) {
          dayLabel = 'Tomorrow'
        } else {
          dayLabel = format(reminderTime, 'EEEE, MMM d')
        }

        return `${dayLabel}, ${format(reminderTime, 'h:mm a')}`
      } catch (error) {
        console.error('Error generating preview time:', error)
        return 'Invalid time format'
      }
    }
    return ''
  }

  return (
    <div className="create-reminder-container">
      <div className="create-reminder-content custom-scrollbar">
        <div className="form-section">
          <div className="flex-between common-flex form-section-title">
            <label className="form-label">Reminder for (Channel or contacts)</label>
            <SvgIcon iconId="close-btn-icon" className="close-btn-icon" onClick={onBack} />
          </div>
          <UserChannelSelector
            name="groupMembers"
            placeholder="Select chats to remind..."
            isMulti={false}
            includeUsers={true}
            includeChannels={true}
            maxInitialItems={6}
            value={reminderFor}
            onSelectionChange={(selected) => setReminderFor(selected as OptionTypeWithData)}
          />
        </div>

        <div className="form-section">
          <TextInput
            label="Reminder about"
            layout="vertical"
            name="reminderAbout"
            placeholder="A task, meeting or some  thing else..."
            value={reminderAbout}
            onChange={(e) => setReminderAbout(e.target.value)}
            className="reminder-about-input"
          />
        </div>

        {/* Remind In Section */}
        <div className="form-section margin-b-0">
          <label className="form-label">Remind in</label>

          {/* Quick Time Options */}
          <QuickTimeOptions
            selectedTime={selectedTime}
            selectedTimeUnit={selectedTimeUnit}
            onTimeSelection={handleTimeSelection}
          />

          {/* Custom Time Toggle */}
          <button className={`custom-time-toggle ${showCustomTime ? 'active' : ''}`} onClick={toggleCustomTime}>
            <span>Select custom time and repeat</span>
            <SvgIcon iconId={showCustomTime ? 'drop-down-menu' : 'drop-down-menu'} className="common-svg-hw" />
          </button>

          {/* Custom Time Section */}
          {showCustomTime && (
            <div className="custom-time-section">
              <div className="custom-date-time-container">
                <CustomDatePicker customDate={customDate} onDateChange={setCustomDate} />

                <AlarmTimePicker
                  selectedHour={selectedHour}
                  selectedMinute={selectedMinute}
                  selectedPeriod={selectedPeriod}
                  onHourChange={setSelectedHour}
                  onMinuteChange={setSelectedMinute}
                  onPeriodChange={setSelectedPeriod}
                />
                <RepeatSelector repeatOption={repeatOption} onRepeatChange={setRepeatOption} />
              </div>

              <TimePreview previewText={getPreviewTime()} />
            </div>
          )}
        </div>
        <div className="form-actions margin-t-0">
          <SolidButton
            color="primary"
            className="w-100 set-reminder-btn"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Setting Reminder...' : 'Set Reminder'}
          </SolidButton>
        </div>
      </div>
    </div>
  )
}

export default CreateReminder
