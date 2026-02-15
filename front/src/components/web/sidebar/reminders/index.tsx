import { format, isToday, isTomorrow } from 'date-fns'
import { useState } from 'react'
import { mutations, queries } from '../../../../api'
import { SolidButton } from '../../../../shared/button'
import { SvgIcon } from '../../../../shared/icons'
import { ConfirmModal } from '../../../../shared/modal'
import { Reminder } from '../../../../types'
import CreateReminder from './create-reminder'
import { useTranslation } from 'react-i18next'

const Reminders = () => {
  const [reminderState, setReminderState] = useState('reminder')
  const [showCompleted, setShowCompleted] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)
  const { data: reminders = [], isLoading } = queries.useGetReminders()
  const cancelReminderMutation = mutations.useCancelReminder()
  const { mutate: deleteReminderMutate, isPending } = mutations.useDeleteCompletedReminder()

  const { t } = useTranslation()

  const handleBackToReminder = () => {
    setReminderState('reminder')
  }

  const toggleShowCompleted = () => {
    setShowCompleted(!showCompleted)
  }

  const handleCancelReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder)
    setShowCancelModal(true)
  }

  const handleDeleteReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (selectedReminder) {
      try {
        await deleteReminderMutate({
          id: selectedReminder.id,
        })
        setShowDeleteModal(false)
        setSelectedReminder(null)
      } catch (error) {
        console.error('Failed to cancel reminder:', error)
      }
    }
  }

  const handleConfirmCancel = async () => {
    if (selectedReminder) {
      try {
        await cancelReminderMutation.mutateAsync({
          reminder_id: selectedReminder.id,
        })
        setShowCancelModal(false)
        setSelectedReminder(null)
      } catch (error) {
        console.error('Failed to cancel reminder:', error)
      }
    }
  }

  const handleCloseCancelModal = () => {
    setShowCancelModal(false)
    setSelectedReminder(null)
  }

  const formatReminderTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const time = format(date, 'hh:mmaaa').toUpperCase()
    if (isToday(date)) {
      return `${time} Today`
    } else if (isTomorrow(date)) {
      return `${time} Tomorrow`
    } else {
      return `${time} | ${format(date, 'dd MMM')}`
    }
  }

  const getReminderForDisplay = (reminder: Reminder) => {
    // Check if it's a channel reminder
    if (reminder.channel_id) {
      if (reminder.channel && reminder.channel.name) {
        return reminder.channel.name
      }
      return `Channel ${reminder.channel_id}`
    }

    // Check if it's a user reminder
    if (reminder.recipient_id) {
      if (reminder.recipient) {
        return reminder.recipient.name || reminder.recipient.username || `User ${reminder.recipient_id}`
      }
      return `User ${reminder.recipient_id}`
    }

    return 'Remind Me'
  }

  const now = new Date()
  const upcomingReminders = reminders?.filter((reminder) => !reminder?.is_sent && new Date(reminder?.remind_at) > now)
  const completedReminders = reminders?.filter((reminder) => reminder?.is_sent || new Date(reminder?.remind_at) <= now)

  if (isLoading) {
    return <div className="reminder-section custom-scrollbar">Loading reminders...</div>
  }

  return (
    <div className={`reminder-section custom-scrollbar ${reminderState == 'reminder' ? 'reminder-width' : ''}`}>
      {isLoading ? (
        'Loading Reminders...'
      ) : reminderState === 'reminder' ? (
        <div className="custom-reminder-section">
          {upcomingReminders?.length ? (
            <div className="reminder-action">
              <SolidButton color="primary" className="w-100" onClick={() => setReminderState('create-reminder')}>
                <SvgIcon iconId="plus" className="common-svg-btn" /> Create a Reminder
              </SolidButton>
            </div>
          ) : null}
          <div className="upcoming-reminder">
            <div className="reminder-header">Upcoming Reminders</div>
            {upcomingReminders.length > 0 ? (
              upcomingReminders.map((rem) => (
                <div key={rem.id} className="reminder-item">
                  <div onClick={() => handleCancelReminder(rem)}>
                    <SvgIcon iconId="close-btn-icon" className="close-btn-icon" />
                  </div>
                  <div className="reminder-note">{rem.note}</div>
                  <div className="reminder-type">{getReminderForDisplay(rem)}</div>
                  <div className="reminder-time">{formatReminderTime(rem.remind_at)}</div>
                </div>
              ))
            ) : (
              <>
                <div className="reminder-content">
                  <div className="reminder-icon">
                    <SvgIcon iconId="remider" className="common-svg-lg" />
                  </div>
                  <div className="reminder-text">
                    <h6>All done!</h6>
                    <span>You do not have any upcoming reminders.</span>
                  </div>
                </div>
                <div className="reminder-action">
                  <SolidButton color="primary" className="w-100" onClick={() => setReminderState('create-reminder')}>
                    <SvgIcon iconId="plus" className="common-svg-btn" /> Create a Reminder
                  </SolidButton>
                </div>
              </>
            )}
          </div>

          {completedReminders.length > 0 && (
            <div className="hide-completed-toggle" onClick={toggleShowCompleted}>
              <span className="toggle-text">{showCompleted ? 'Hide completed' : 'Show completed'}</span>
              <SvgIcon iconId={showCompleted ? 'arrow-top' : 'arrow-bottom'} className="common-svg-hw" />
            </div>
          )}

          {showCompleted && completedReminders.length > 0 && (
            <div className="completed-reminders-section">
              {completedReminders.map((rem) => (
                <div key={rem.id} className="reminder-item completed">
                  <div className="reminder-note">{rem.note}</div>
                  <div className="reminder-type">{getReminderForDisplay(rem)}</div>
                  <div className="reminder-time">{formatReminderTime(rem.remind_at)}</div>
                  <SvgIcon onClick={() => handleDeleteReminder(rem)} iconId="trash-icon" className="ms-auto common-svg-hw danger-fill-stroke" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <CreateReminder onBack={handleBackToReminder} />
      )}

      <ConfirmModal
        isOpen={showCancelModal}
        onClose={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        isLoading={cancelReminderMutation.isPending}
        title="Cancel Reminder"
        subtitle="Are you sure you want to cancel this reminder? This action cannot be undone."
        confirmText="Cancel Reminder"
        cancelText="Keep Reminder"
        variant="warning"
        loadingText="Cancelling reminder..."
      />
      <ConfirmModal
        isLoading={isPending}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title={t('delete_reminder')}
        // subtitle={t('action_cannot_be_undone')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        variant="danger"
      />
    </div>
  )
}

export default Reminders
