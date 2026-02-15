import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mutations } from '../../../../api'
import { SolidButton } from '../../../../shared/button'
import { SimpleModal } from '../../../../shared/modal'
import { MuteChatModalProps } from '../../../../types'

const MuteChatModal = ({ isOpen, toggle, targetId, targetType, onMuteSuccess }: MuteChatModalProps) => {
  const { t } = useTranslation()
  const { mutate: muteChatMutate, isPending } = mutations.useMuteChat()
  const [selectedDuration, setSelectedDuration] = useState<'1h' | '8h' | '1w' | 'forever'>('1h')

  const durationOptions = [
    { value: '1h', label: t('1 hour') },
    { value: '8h', label: t('8 hours') },
    { value: '1w', label: t('1 week') },
    { value: 'forever', label: t('Forever') },
  ]

  const handleMute = () => {
    muteChatMutate(
      {
        target_id: targetId,
        target_type: targetType,
        duration: selectedDuration,
        value: true,
      },
      {
        onSuccess: () => {
          // const now = new Date()
          // let mutedUntil: string

          // if (selectedDuration === '1h') {
          //   mutedUntil = new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString()
          // } else if (selectedDuration === '8h') {
          //   mutedUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString()
          // } else if (selectedDuration === '1w') {
          //   mutedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
          // } else {
          //   mutedUntil = new Date('2100-01-01T00:00:00Z').toISOString()
          // }

          // dispatch(
          //   muteChat({
          //     target_id: targetId,
          //     target_type: targetType,
          //     muted_until: mutedUntil,
          //     duration: selectedDuration,
          //   }),
          // )
          onMuteSuccess?.()
          toggle()
        },
      },
    )
  }

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={toggle}
      title={t('Mute Chat')}
      subtitle={t('Select how long you want to mute this chat')}
      size="sm"
    >
      <div className="mute-options">
        {durationOptions.map((option) => (
          <div key={option.value} className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="muteDuration"
              id={option.value}
              value={option.value}
              checked={selectedDuration === option.value}
              onChange={(e) => setSelectedDuration(e.target.value as any)}
            />
            <label className="form-check-label" htmlFor={option.value}>
              {option.label}
            </label>
          </div>
        ))}
      </div>

      <div className="d-flex gap-2 mt-4">
        <SolidButton title={t('Cancel')} color="light" onClick={toggle} className="flex-grow-1" />
        <SolidButton
          title={t('Mute')}
          loading={isPending}
          color="primary"
          onClick={handleMute}
          className="flex-grow-1"
        />
      </div>
    </SimpleModal>
  )
}

export default MuteChatModal
