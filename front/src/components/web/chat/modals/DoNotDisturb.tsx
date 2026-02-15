import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mutations } from '../../../../api'
import { SolidButton } from '../../../../shared/button'
import { SimpleModal } from '../../../../shared/modal'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { updateDndState } from '../../../../store/slices/teamSlice'
import { DoNotDisturbModalProps } from '../../../../types'

const DoNotDisturbModal = ({ isOpen, toggle, toggleModal }: DoNotDisturbModalProps) => {
  const { t } = useTranslation()
  const { mutate: doNotDisturb, isPending } = mutations.useDoNotDisturb()
  const [selectedDuration, setSelectedDuration] = useState<'1h' | '8h' | '1w' | 'forever'>('1h')
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((s) => s.auth)
  const { team, userTeamData } = useAppSelector((s) => s.team)

  const durationOptions = [
    { value: '1h', label: t('1 hour') },
    { value: '8h', label: t('8 hours') },
    { value: '1w', label: t('1 week') },
    { value: 'forever', label: t('Forever') },
  ]

  const computeMutedUntil = (): string | null => {
    const now = new Date()
    switch (selectedDuration) {
      case '1h':
        return new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString()
      case '8h':
        return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString()
      case '1w':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      case 'forever':
        return new Date('2100-01-01T00:00:00Z').toISOString()
      default:
        return null
    }
  }

  const handleDND = () => {
    doNotDisturb(
      {
        duration: selectedDuration,
        value: true,
      },
      {
        onSuccess: () => {
          const mutedUntil = computeMutedUntil()
          if (user?.id) {
            dispatch(
              updateDndState({
                userId: user.id,
                teamId: team?.id || userTeamData?.team_id || '',
                do_not_disturb: true,
                do_not_disturb_until: mutedUntil,
              }),
            )
          }
          toggleModal()
          toggle()
        },
      },
    )
  }

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={toggleModal}
      title={t('Do Not Disturb')}
      subtitle={t('Select how long you want to Do Not Disturb')}
      size="sm"
    >
      <div className="mute-options">
        {durationOptions.map((option) => (
          <div key={option.value} className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="dndDuration"
              id={option.value}
              value={option.value}
              checked={selectedDuration === option.value}
              onChange={(e) => setSelectedDuration(e.target.value as '1h' | '8h' | '1w' | 'forever')}
            />
            <label className="form-check-label" htmlFor={option.value}>
              {option.label}
            </label>
          </div>
        ))}
      </div>

      <div className="d-flex gap-2 mt-4">
        <SolidButton title={t('Cancel')} color="light" onClick={toggleModal} className="flex-grow-1" />
        <SolidButton title={t('DND')} loading={isPending} color="primary" onClick={handleDND} className="flex-grow-1" />
      </div>
    </SimpleModal>
  )
}

export default DoNotDisturbModal
