import { FC, useEffect, useState } from 'react'
import { queries } from '../../../../../api'
import { MessageType } from '../../../../../constants'
import { SvgIcon } from '../../../../../shared/icons'
import { Image } from '../../../../../shared/image'
import { messageEncryptionService } from '../../../../../services/message-encryption.service'
import { ThreadPreview } from '../../../../../shared/thread'
import { useAppSelector } from '../../../../../store/hooks'
import { ReplyMessageProps } from '../../../../../types'
import { extractTextWithMentions, getPlainTextFromMessage } from '../../../../../utils'
import { getFileName } from '../../../utils/custom-functions'

const RepliedMessage: FC<ReplyMessageProps> = ({ parentMessage, onClick, message, isLastMessage }) => {
  const { user } = useAppSelector((store) => store.auth)
  const isMe = user.id == parentMessage.sender_id
  const { data: e2eStatus } = queries.useGetE2EStatus()
  const isE2EEnabled = e2eStatus?.e2e_enabled || false
  const { data: senderKeyData } = queries.useGetUserPublicKey(
    parentMessage.sender?.id || parentMessage.sender_id,
    { enabled: isE2EEnabled && !!(parentMessage.sender?.id || parentMessage.sender_id) }
  )
  const [decryptedContent, setDecryptedContent] = useState<string>(parentMessage.content || '')

  useEffect(() => {
    const decrypt = async () => {
      if (!isE2EEnabled || !parentMessage.content) {
        setDecryptedContent(parentMessage.content || '')
        return
      }

      try {
        const decrypted = messageEncryptionService.decryptMessage(
          parentMessage.content,
          senderKeyData?.public_key || null
        )
        setDecryptedContent(decrypted)
      } catch (error) {
        console.error('Error decrypting reply message content:', error)
        setDecryptedContent(parentMessage.content || '')
      }
    }

    decrypt()
  }, [parentMessage.content, isE2EEnabled, senderKeyData?.public_key])

  const renderPreviewContent = () => {
    const messageType = parentMessage.message_type as MessageType
    const fileName = getFileName(parentMessage)

    if (!parentMessage.content) {
      switch (messageType) {
        case MessageType.File:
        case MessageType.Document:
          return (
            <div className="media-preview file-preview">
              <div className="file-name-header">{(fileName as string) || 'File'}</div>
              <div className="file-preview-content">
                <SvgIcon iconId="file" className="common-svg-md file-icon" />
              </div>
            </div>
          )

        case MessageType.Image:
          return (
            <div className="media-preview image-preview">
              {fileName && <div className="file-name-header">{fileName as string}</div>}
              <div className="image-preview-content">
                <Image
                  height={50}
                  src={parentMessage.file_url || ''}
                  alt="Image preview"
                  className="thumbnail-img"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <div className="fallback-icon hidden">
                  <SvgIcon iconId="image" className="common-svg-md" />
                </div>
              </div>
            </div>
          )

        case MessageType.Video:
          return (
            <div className="media-preview video-preview">
              {fileName && <div className="file-name-header">{fileName as string}</div>}
              <div className="video-preview-content">
                <div className="video-thumbnail">
                  <SvgIcon iconId="play" className="common-svg-md play-icon" />
                  {parentMessage.file_url && (
                    <Image
                      src={parentMessage.file_url || ''}
                      alt="Video preview"
                      className="thumbnail-img"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )

        case MessageType.Audio:
        case MessageType.Voice:
          return (
            <div className="media-preview audio-preview">
              {fileName && <div className="file-name-header">{fileName as string}</div>}
            </div>
          )

        case MessageType.System:
          return (
            <div className="media-preview system-preview">
              <div className="system-preview-content">
                <SvgIcon iconId="system" className="common-svg-md system-icon" />
              </div>
            </div>
          )

        case MessageType.Call:
          return (
            <div className="media-preview call-preview">
              <div className="call-preview-content">
                <SvgIcon iconId="call" className="common-svg-md call-icon" />
              </div>
            </div>
          )

        case MessageType.Link:
          return (
            <div className="media-preview link-preview">
              <div className="link-preview-content">
                <SvgIcon iconId="link" className="common-svg-md link-icon" />
              </div>
            </div>
          )

        case MessageType.Reminder:
          return (
            <div className="media-preview reminder-preview">
              <div className="reminder-preview-content">
                <SvgIcon iconId="reminder" className="common-svg-md reminder-icon" />
              </div>
            </div>
          )

        default:
          return (
            <div className="media-preview default-preview">
              {fileName && <div className="file-name-header">{fileName as string}</div>}
              <div className="default-preview-content">
                <SvgIcon iconId="file" className="common-svg-md default-icon" />
              </div>
            </div>
          )
      }
    }

    try {
      const textWithMentions = extractTextWithMentions(decryptedContent)
      if (textWithMentions && textWithMentions !== decryptedContent) {
        return <span className="reply-text">{textWithMentions}</span>
      }

      const plainText = getPlainTextFromMessage(decryptedContent)
      return <span className="reply-text">{plainText}</span>
    } catch (error) {
      console.error('Error extracting preview text:', error)
      return <span className="reply-text">Message</span>
    }
  }

  return (
    <ThreadPreview
      onClick={onClick}
      headerText={`${isMe ? 'You' : parentMessage.sender?.name}`}
      message={message}
      isLastMessage={isLastMessage}
      currentUserId={user?.id}
    >
      {renderPreviewContent()}
    </ThreadPreview>
  )
}

export default RepliedMessage
