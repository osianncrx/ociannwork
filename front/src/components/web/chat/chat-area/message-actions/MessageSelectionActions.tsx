import React, { useCallback } from 'react'
import { useMessageSelection } from './useMessageSelection'
import { usePlanFeatures } from '../../../../../utils/hooks'
import { Message } from '../../../../../types/common'
import { downloadFile } from '../../../utils/custom-functions'
import { SvgIcon } from '../../../../../shared/icons'
import { MessageSelectionActionsProps } from '../../../../../types'

const MessageSelectionActions: React.FC<MessageSelectionActionsProps> = ({
  selectedCount,
  onDelete,
  onForward,
  onStar,
  selectedMessages,
  canDelete = true,
}) => {
  const { clearSelection } = useMessageSelection()
  const { allowsMultipleDelete } = usePlanFeatures()

  const isDownloadableMessage = (msg: Message) => {
    const downloadableTypes = ['image', 'video', 'document', 'file', 'audio']
    return downloadableTypes.includes(msg.message_type) && !!msg.file_url
  }

  const isTextMessage = (msg: Message) => {
    return msg.message_type === 'text' || msg.message_type === 'call'
  }

  const downloadableMessages = selectedMessages.filter(isDownloadableMessage)
  const textMessages = selectedMessages.filter(isTextMessage)
  const hasOnlyDownloadableContent = downloadableMessages.length > 0 && textMessages.length === 0

  const handleClear = () => {
    if ((window as any).__longPressTimeout) {
      clearTimeout((window as any).__longPressTimeout)
      ;(window as any).__longPressTimeout = null
    }
    ;(window as any).__longPressStarted = false
    ;(window as any).__longPressTriggered = false

    clearSelection()
  }

  const handleDownloadAll = useCallback(async () => {
    if (!hasOnlyDownloadableContent) return

    for (const msg of downloadableMessages) {
      if (!msg.file_url) continue

      await downloadFile(msg.file_url, msg.file_name || 'file')
    }
  }, [downloadableMessages, hasOnlyDownloadableContent])

  const allMessagesAreStarred = selectedMessages.every((msg: Message) => msg.isFavorite)
  const someMessagesAreStarred = selectedMessages.some((msg: Message) => msg.isFavorite)

  const handleAction = (action: () => void) => {
    action()
  }

  return (
    <div
      className="message-selection-header d-flex align-items-center justify-content-between"
      data-selection-related="true"
    >
      <div className="d-flex align-items-center gap-3 flex-1">
        <div onClick={handleClear}>X</div>
        <span className="fw-semibold">
          {selectedCount} {selectedCount > 1 ? 'Messages' : 'Message'} selected
        </span>
      </div>

      <div className="d-flex gap-3">
        {/* Only show delete icon if: single message selected OR (multiple selected AND feature enabled) */}
        {(selectedCount === 1 || (selectedCount > 1 && allowsMultipleDelete())) && canDelete && (
          <SvgIcon
            iconId="trash-icon"
            onClick={() => handleAction(onDelete)}
            title={!canDelete ? 'Cannot delete receiver\'s messages' : 'Delete'}
          />
        )}

        <SvgIcon
          className={`${selectedCount > 0 ? '' : 'disabled'}`}
          iconId="forward-icon"
          onClick={() => selectedCount > 0 && handleAction(onForward)}
          title="Forward"
        />

        <SvgIcon
          className={`${selectedCount > 0 ? '' : 'disabled'} favorite`}
          iconId="dropdown-star"
          onClick={() => selectedCount > 0 && handleAction(onStar)}
          title={allMessagesAreStarred ? 'Unstar All' : someMessagesAreStarred ? 'Toggle Star' : 'Star All'}
        />

        {hasOnlyDownloadableContent && (
          <SvgIcon
            iconId="download"
            onClick={handleDownloadAll}
            title={`Download ${downloadableMessages.length} ${downloadableMessages.length > 1 ? 'files' : 'file'}`}
          />
        )}
      </div>
    </div>
  )
}

export default MessageSelectionActions
