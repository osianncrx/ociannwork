import { format, isSameDay, isToday, isYesterday, parseISO, subDays } from 'date-fns'
import DatePicker from 'react-datepicker'
import { SimpleModal } from '../../../../shared/modal'
import { useAppSelector } from '../../../../store/hooks'
import { DateJumpModalProps } from '../../../../types'

const JumpToDateModal = ({ isOpen, onClose, forceScrollToBottom }: DateJumpModalProps) => {
  const { selectedChatMessages } = useAppSelector((store) => store.chat)
  const jumpToDate = (date: Date) => {
    const targetSection = selectedChatMessages?.find((section) => {
      return section.messages.some((message: { created_at: string }) => isSameDay(parseISO(message.created_at), date))
    })

    if (targetSection) {
      const element = document.querySelector(`[data-section-id="${targetSection.label}"]`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      if (isToday(date)) {
        forceScrollToBottom()
      } else if (isYesterday(date)) {
        const yesterdaySection = selectedChatMessages?.find((s) => s.label === 'Yesterday')
        if (yesterdaySection) {
          const element = document.querySelector(`[data-section-id="${yesterdaySection.label}"]`)
          element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      } else if (date > subDays(new Date(), 7)) {
        const lastWeekSection = selectedChatMessages?.find(
          (section) =>
            section.label === 'Last week' ||
            section.label.includes('Earlier') ||
            new Date(section.messages[0]?.created_at) < subDays(new Date(), 7),
        )
        if (lastWeekSection) {
          const element = document.querySelector(`[data-section-id="${lastWeekSection.label}"]`)
          element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      } else {
        const monthSection = selectedChatMessages?.find((s) => s.label === format(date, 'MMMM yyyy'))
        if (monthSection) {
          const element = document.querySelector(`[data-section-id="${monthSection.label}"]`)
          element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }
    onClose()
  }

  return (
    <SimpleModal className="calender-modal" isOpen={isOpen} onClose={onClose} title="Select a date to jump to" size="md">
      <div className="calendar-container">
        <DatePicker
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          inline
          onChange={(date: Date | null) => {
            if (date) jumpToDate(date)
          }}
          minDate={new Date(2000, 0, 1)}
          maxDate={new Date()}
          calendarClassName="custom-calendar"
        />
      </div>
    </SimpleModal>
  )
}

export default JumpToDateModal
