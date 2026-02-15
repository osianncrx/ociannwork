import { FC, memo, useEffect, useState } from 'react'
import { queries } from '../../../../../api'
import { MessageType } from '../../../../../constants'
import { messageEncryptionService } from '../../../../../services/message-encryption.service'
import { PinFavRendererProps } from '../../../../../types'
import AudioMessage from './AudioMessage'
import CallMessage from './CallMessage'
import FileMessage from './FileMessage'
import ImageMessage from './ImageMessage'
import LinkMessage from './LinkMessage'
import ReminderMessage from './ReminderMessage'
import TextMessage from './TextMessage'
import VideoMessage from './VideoMessage'
import { useTranslation } from 'react-i18next'

const PinFavRenderer: FC<PinFavRendererProps> = memo(
  (props) => {
    const { message, allChatMessages } = props
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
          return <TextMessage {...props} hideIcon={true} />

        case MessageType.Reminder:
          return <ReminderMessage {...props} hideIcon={true} />

        case MessageType.Image:
          return <ImageMessage {...props} allChatMessages={allChatMessages} hideIcon={true} />

        case MessageType.Video:
          return <VideoMessage {...props} hideIcon={true} />

        case MessageType.File:
          return <FileMessage {...props} hideIcon={true} />

        case MessageType.Call:
          return <CallMessage {...props} />

        case MessageType.Audio:
          return <AudioMessage {...props} hideIcon={true} />

        case MessageType.Link:
          return <LinkMessage {...props} hideIcon={true} />

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
      return (
        <li className="error-message-container">
          <div className="error-message"> {t('error_displaying_message')}</div>
        </li>
      )
    }
  },
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.file_url === nextProps.message.file_url &&
      prevProps.message.isPinned === nextProps.message.isPinned &&
      prevProps.message.pins?.[0] === nextProps.message.pins?.[0] &&
      prevProps.message.reactions === nextProps.message.reactions &&
      prevProps.message.isFavorite === nextProps.message.isFavorite &&
      prevProps.message.statuses === nextProps.message.statuses &&
      prevProps.message.sender_id === nextProps.message.sender_id &&
      prevProps.message.recipient_id === nextProps.message.recipient_id &&
      prevProps.allChatMessages === nextProps.allChatMessages &&
      prevProps.message.metadata === nextProps.message.metadata
    )
  },
)

export default PinFavRenderer
