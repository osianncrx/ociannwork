import { FC, useCallback } from 'react'
import { queries } from '../../../../../api'
import { useAppSelector } from '../../../../../store/hooks'
import { Message, Status } from '../../../../../types/common'
import { MessageStatusProps } from '../../../../../types'
import { ChatType } from '../../../../../constants'

const MessageStatus: FC<MessageStatusProps> = ({ message, isLastMessage }) => {
  const { user } = useAppSelector((store) => store.auth)
  const { selectedChat, selectedChatMessages } = useAppSelector((store) => store.chat)

  const { data: channelData } = queries.useGetChannelById(
    { id: selectedChat?.id },
    { enabled: selectedChat?.type === ChatType.Channel && !!selectedChat?.id },
  )

  const findLastMessageByStatus = useCallback(
    (statusType: 'seen' | 'delivered') => {
      if (!selectedChatMessages || !user?.id) return null

      const allMessages: Message[] = []
      selectedChatMessages.forEach((dateGroup) => {
        if (dateGroup.messages && Array.isArray(dateGroup.messages)) {
          allMessages.push(...dateGroup.messages)
        }
      })

      // Sort all messages by creation time (newest first)
      const sortedMessages = allMessages.sort(
        (a: Message, b: Message) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      // Find the absolute last message in the entire conversation
      const absoluteLastMessage = sortedMessages[0]
      // Get messages sent by current user
      const userMessages = sortedMessages.filter((msg: Message) => msg.sender_id === user.id)

      // Find the last message that has the specified status
      for (const msg of userMessages) {
        const hasTargetStatus = msg?.statuses?.find((status) => status.status === statusType)

        if (hasTargetStatus) {
          if (absoluteLastMessage && absoluteLastMessage.sender_id !== user.id) {
            const messageTime = new Date(msg.created_at).getTime()
            const lastMessageTime = new Date(absoluteLastMessage.created_at).getTime()

            if (lastMessageTime > messageTime) {
              continue
            }
          }

          return msg.id
        }
      }

      return null
    },
    [selectedChatMessages, user?.id],
  )

  const lastReadMessageId = findLastMessageByStatus('seen')
  const lastDeliveredMessageId = findLastMessageByStatus('delivered')

  const renderMessageStatus = useCallback(
    (message: Message) => {
      if (message.sender_id !== user?.id) return null

      const recipientStatuses = message.statuses?.filter((s: Status) => s.user_id !== user.id) || []
      if (selectedChat?.type === ChatType.Channel) {
        const channelMembersCount = channelData?.channel?.members?.length || 0
        const expectedRecipients = Math.max(channelMembersCount - 1, 0)

        const seenCount = recipientStatuses.filter((s) => s.status === 'seen').length
        const deliveredCount = recipientStatuses.filter((s) => s.status === 'delivered').length
        if (seenCount >= expectedRecipients && message.id === lastReadMessageId) {
          return <div className="letter-box-light">R</div>
        } else if ((deliveredCount > 0 || seenCount > 0) && message.id === lastDeliveredMessageId) {
          return <div className="letter-box-secondary">D</div>
        } else if (deliveredCount <= 0 && isLastMessage) {
          return <div className="letter-box-light">✓</div>
        }
      } else {
        const hasSeenStatus = recipientStatuses.some((s) => s.status === 'seen')
        const hasDeliveredStatus = recipientStatuses.some((s) => s.status === 'delivered')

        if (hasDeliveredStatus && message.id === lastDeliveredMessageId) {
          return <div className="letter-box-secondary">D</div>
        } else if (hasSeenStatus && message.id === lastReadMessageId) {
          return <div className="letter-box-light">R</div>
        } else if (!hasSeenStatus && !hasDeliveredStatus && isLastMessage) {
          return <div className="letter-box-light">✓</div>
        }
        return null
      }
    },
    [selectedChat, user?.id, channelData, isLastMessage, lastReadMessageId, lastDeliveredMessageId],
  )

  return user.id == message.sender_id && <div className="d-flex gap-2">{renderMessageStatus(message)}</div>
}

export default MessageStatus
