import { FC, memo, useEffect, useState } from 'react'
import { queries } from '../../../../../api'
import { messageEncryptionService } from '../../../../../services/message-encryption.service'
import { SystemMessageProps } from '../../../../../types'

const systemMessageGroupStates = new Map<string, boolean>()

const SystemMessage: FC<SystemMessageProps> = memo(
  ({ message, consecutiveSystemMessages, isGrouped = false, currentMessageIndex = 0 }) => {
    const [showAll, setShowAll] = useState(false)
    const { data: e2eStatus } = queries.useGetE2EStatus()
    const isE2EEnabled = e2eStatus?.e2e_enabled || false
    const { data: senderKeyData } = queries.useGetUserPublicKey(
      message.sender?.id || message.sender_id,
      { enabled: isE2EEnabled && !!(message.sender?.id || message.sender_id) }
    )
    const [decryptedContent, setDecryptedContent] = useState<string>(message.content || '')

    useEffect(() => {
      const decrypt = async () => {
        if (!isE2EEnabled || !message.content) {
          setDecryptedContent(message.content || '')
          return
        }

        try {
          const decrypted = messageEncryptionService.decryptMessage(
            message.content,
            senderKeyData?.public_key || null
          )
          setDecryptedContent(decrypted)
        } catch (error) {
          console.error('Error decrypting system message content:', error)
          setDecryptedContent(message.content || '')
        }
      }

      decrypt()
    }, [message.content, isE2EEnabled, senderKeyData?.public_key])

    // Generate a group ID based on the first message in the consecutive group
    const groupId =
      consecutiveSystemMessages && consecutiveSystemMessages.length > 0
        ? `group-${consecutiveSystemMessages[0].id}`
        : `single-${message.id}`

    useEffect(() => {
      if (isGrouped && consecutiveSystemMessages && consecutiveSystemMessages.length > 1) {
        const currentState = systemMessageGroupStates.get(groupId) ?? false
        setShowAll(currentState)
      }
    }, [groupId, isGrouped, consecutiveSystemMessages])

    const handleToggle = () => {
      const newShowAll = !showAll
      setShowAll(newShowAll)
      systemMessageGroupStates.set(groupId, newShowAll)

      // Trigger re-render for all components in this group
      window.dispatchEvent(
        new CustomEvent(`systemMessageToggle-${groupId}`, {
          detail: { showAll: newShowAll },
        }),
      )
    }

    useEffect(() => {
      if (isGrouped && consecutiveSystemMessages && consecutiveSystemMessages.length > 1) {
        const handleGroupToggle = (event: CustomEvent) => {
          setShowAll(event.detail.showAll)
        }

        window.addEventListener(`systemMessageToggle-${groupId}`, handleGroupToggle as EventListener)
        return () => {
          window.removeEventListener(`systemMessageToggle-${groupId}`, handleGroupToggle as EventListener)
        }
      }
    }, [groupId, isGrouped, consecutiveSystemMessages])

    // If this is a grouped system message with multiple consecutive messages
    if (isGrouped && consecutiveSystemMessages && consecutiveSystemMessages.length > 1) {
      const isLastMessage = currentMessageIndex === consecutiveSystemMessages.length - 1
      const shouldShowMessage = showAll || isLastMessage

      return (
        <div className="system-message-group text-center">
          {shouldShowMessage && <div className="system-message">{decryptedContent}</div>}

          {isLastMessage && (
            <button className="system-message-toggle-btn" onClick={handleToggle}>
              {showAll ? 'Hide All' : `View All (${consecutiveSystemMessages.length})`}
            </button>
          )}
        </div>
      )
    }

    return <div className="system-message text-center">{decryptedContent}</div>
  },
)

export default SystemMessage
