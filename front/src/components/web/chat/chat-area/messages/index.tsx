import { FC, memo, useEffect, useState } from 'react'
import { queries } from '../../../../../api'
import { MessageType } from '../../../../../constants'
import { messageEncryptionService } from '../../../../../services/message-encryption.service'
import { MessageRendererProps } from '../../../../../types'
import { getConsecutiveSystemMessages, isFirstInSystemMessageGroup } from '../../../utils/custom-functions'
import AudioMessage from './AudioMessage'
import CallMessage from './CallMessage'
import FileMessage from './FileMessage'
import ImageMessage from './ImageMessage'
import LinkMessage from './LinkMessage'
import LocationMessage from './LocationMessage'
import MessageWrapper from './MessageWrapper'
import ReminderMessage from './ReminderMessage'
import SystemMessage from './SystemMessage'
import TextMessage from './TextMessage'
import VideoMessage from './VideoMessage'
import { useTranslation } from 'react-i18next'

const MessageRenderer: FC<MessageRendererProps> = memo(
  (props) => {
    const { message, allChatMessages, sectionMessages, msgIndex } = props
    const { t } = useTranslation()
    const { data: e2eStatus } = queries.useGetE2EStatus()
    const isE2EEnabled = e2eStatus?.e2e_enabled || false
    const [decryptedContent, setDecryptedContent] = useState<string>(message?.content || '')

    useEffect(() => {
      if (!message?.content || !isE2EEnabled) {
        setDecryptedContent(message?.content || '')
        return
      }

      try {
        // For fallback display, use fallback decryption (own key)
        const decrypted = messageEncryptionService.decryptMessage(message.content)
        setDecryptedContent(decrypted)
      } catch (error) {
        console.error('Error decrypting fallback message content:', error)
        setDecryptedContent(message.content || '')
      }
    }, [message?.content, isE2EEnabled])

    if (!message) {
      return (
        <li className="error-message-container">
          <span className="error-message">{t('invalid_message')}</span>
        </li>
      )
    }

    try {
      switch (message.message_type) {
        case MessageType.Text:
          return (
            <MessageWrapper {...props}>
              <TextMessage {...props} />
            </MessageWrapper>
          )

        case MessageType.System:
          if (sectionMessages) {
            const isFirstInGroup = isFirstInSystemMessageGroup(sectionMessages, msgIndex)
            const consecutiveMessages = getConsecutiveSystemMessages(sectionMessages, msgIndex)
            const currentMessageIndex = consecutiveMessages.findIndex((msg) => msg.id === message.id)

            return (
              <SystemMessage
                message={message}
                consecutiveSystemMessages={consecutiveMessages}
                isGrouped={consecutiveMessages.length > 1}
                isFirstInGroup={isFirstInGroup}
                currentMessageIndex={currentMessageIndex}
              />
            )
          }

          return <SystemMessage message={message} />

        case MessageType.Reminder:
          return (
            <MessageWrapper hideStatus {...props} customIcon="reminder-svg" customSenderName="Reminder">
              <ReminderMessage {...props} />
            </MessageWrapper>
          )

        case MessageType.Image:
          return (
            <MessageWrapper {...props}>
              <ImageMessage {...props} allChatMessages={allChatMessages} />
            </MessageWrapper>
          )

        case MessageType.Video:
          return (
            <MessageWrapper {...props}>
              <VideoMessage {...props} />
            </MessageWrapper>
          )

        case MessageType.File:
          return (
            <MessageWrapper {...props}>
              <FileMessage {...props} />
            </MessageWrapper>
          )

        case MessageType.Call:
          return (
            <MessageWrapper {...props}>
              <CallMessage {...props} />
            </MessageWrapper>
          )

        case MessageType.Audio:
          return (
            <MessageWrapper {...props}>
              <AudioMessage {...props} />
            </MessageWrapper>
          )

        case MessageType.Link:
          return (
            <MessageWrapper {...props}>
              <LinkMessage {...props} />
            </MessageWrapper>
          )

        case MessageType.Location:
          return (
            <MessageWrapper {...props}>
              <LocationMessage {...props} />
            </MessageWrapper>
          )

        default:
          return (
            <li className="unknown-message-container">
              <div className="message-unknown">
                <span>{decryptedContent || 'Unsupported message type'}</span>
              </div>
            </li>
          )
      }
    } catch (error) {
      console.error('Error rendering message:', error, message)
      return (
        <li className="error-message-container">
          <div className="error-message">{t("error_displaying_message")}</div>
        </li>
      )
    }
  },
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.file_url === nextProps.message.file_url &&
      prevProps.isEditing === nextProps.isEditing &&
      prevProps.message.isPinned === nextProps.message.isPinned &&
      prevProps.message.pins?.[0] === nextProps.message.pins?.[0] &&
      prevProps.message.reactions === nextProps.message.reactions &&
      prevProps.message.isFavorite === nextProps.message.isFavorite &&
      prevProps.message.statuses === nextProps.message.statuses &&
      prevProps.message.sender_id === nextProps.message.sender_id &&
      prevProps.message.recipient_id === nextProps.message.recipient_id &&
      prevProps.allChatMessages === nextProps.allChatMessages &&
      prevProps.message.metadata === nextProps.message.metadata &&
      JSON.stringify(prevProps.message.metadata) === JSON.stringify(nextProps.message.metadata)
    )
  },
)

export default MessageRenderer
