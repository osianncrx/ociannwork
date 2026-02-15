import { subDays } from 'date-fns'
import { useAppSelector } from '../../../../../store/hooks'
import { JumpToMenuProps } from '../../../../../types'
import { useTranslation } from 'react-i18next'

export const JumpToMenu = ({
  sectionLabel,
  chatContainerRef,
  scrollToBottom,
  onClose,
  onOpenDateModal,
}: JumpToMenuProps) => {
  const { t } = useTranslation()
  const { selectedChatMessages: chatSections } = useAppSelector((store) => store.chat)
  const jumpToBeginning = () => {
    chatContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    onClose?.()
  }

  const jumpToLastWeek = () => {
    const lastWeekSection = chatSections.find(
      (section) =>
        section.label === 'Last week' ||
        section.label.includes('Earlier') ||
        new Date(section.messages[0]?.created_at) < subDays(new Date(), 7),
    )

    if (lastWeekSection) {
      jumpToSection(lastWeekSection.label)
    }
    onClose?.()
  }

  const jumpToToday = () => {
    scrollToBottom()
    onClose?.()
  }

  const jumpToSection = (label: string) => {
    const element = document.querySelector(`[data-section-id="${label}"]`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    onClose?.()
  }

  return (
    <ul>
      <li onClick={jumpToBeginning}>{t('very_beginning')}</li>
      <li onClick={jumpToLastWeek}>{t('last_week')}</li>
      <li onClick={jumpToToday}>{t('today')}</li>
      <li onClick={() => jumpToSection(sectionLabel)}>{t('this_period')}</li>
      <li onClick={onOpenDateModal} className="calendar-section">
        {t('specific_date')}
      </li>
    </ul>
  )
}
