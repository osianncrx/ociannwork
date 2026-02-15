import { useState } from 'react'
import { SvgIcon } from '../../../../../shared/icons'
import { SimpleModal } from '../../../../../shared/modal'
import JumpToDateModal from '../../modals/JumpToDate'
import { JumpToMenu } from './JumpToMenu'
import { DateLabelProps } from '../../../../../types'
import { useTranslation } from 'react-i18next'
import { useScrollActive } from '../../hooks'
import { useAppSelector } from '../../../../../store/hooks'

const DateLabel = ({ section, containerRef, forceScrollToBottom }: DateLabelProps) => {
  const [showDateModal, setShowDateModal] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { selectedChatMessages } = useAppSelector((store) => store.chat)
  const toggleDropdown = () => {
    if (!isScrollActive) {
      return
    }
    setDropdownOpen((prev) => !prev)
  }
  const isScrollActive = useScrollActive(containerRef, [selectedChatMessages])

  const { t } = useTranslation()
  return (
    <>
      <div className="date-badge" onClick={toggleDropdown}>
        <span>{section?.label}</span>
        <SvgIcon iconId="drop-down-menu" className="common-svg-hw-btn" />
      </div>
      <SimpleModal
        isOpen={dropdownOpen}
        onClose={toggleDropdown}
        title={t('select_a_date_to_jump_to')}
        size="md"
        modalClassName="jump-to-date"
      >
        <JumpToMenu
          onOpenDateModal={() => {
            setShowDateModal(true)
            setDropdownOpen(false)
          }}
          onClose={() => setDropdownOpen(false)}
          sectionLabel={section.label}
          chatContainerRef={containerRef}
          scrollToBottom={forceScrollToBottom}
        />
      </SimpleModal>

      <JumpToDateModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        forceScrollToBottom={forceScrollToBottom}
      />
    </>
  )
}

export default DateLabel
