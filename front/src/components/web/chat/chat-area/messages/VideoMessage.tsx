import { FC, useEffect, useState } from 'react'
import { queries } from '../../../../../api'
import { ImageBaseUrl } from '../../../../../constants'
import { messageEncryptionService } from '../../../../../services/message-encryption.service'
import { MessageTypeProps } from '../../../../../types/common'
import Renderer from '../../widgets/Renderer'
import { format } from 'date-fns'
import { SvgIcon } from '../../../../../shared/icons'
import MessageReactions from '../message-reactions'

const VideoMessage: FC<MessageTypeProps> = (props) => {
  const { message, hideIcon, findMessageById } = props
  const { data: e2eStatus } = queries.useGetE2EStatus()
  const isE2EEnabled = e2eStatus?.e2e_enabled || false
  const { data: senderKeyData } = queries.useGetUserPublicKey(
    message.sender.id,
    { enabled: isE2EEnabled && !!message.sender.id }
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
        console.error('Error decrypting video message content:', error)
        setDecryptedContent(message.content || '')
      }
    }

    decrypt()
  }, [message.content, isE2EEnabled, senderKeyData?.public_key])

  return (
    <>
      <div className="message-video">
        <video
          controls
          className="chat-media-video"
          onError={() => console.warn('Video failed to load:', message.file_url)}
        >
          <source src={ImageBaseUrl + message?.file_url} type="video/mp4" />
          <source src={ImageBaseUrl + message?.file_url} type="video/webm" />
          <source src={ImageBaseUrl + message?.file_url} type="video/ogg" />
          Your browser does not support the video tag.
        </video>
        {decryptedContent ? (
          <Renderer value={decryptedContent} message={message} hideIcon={hideIcon} findMessageById={findMessageById} />
        ) : (
          !hideIcon && (
            <>
              <div className="chat-pinned-box">
                {message?.isPinned && (
                  <div className="chat-content-pinned">
                    <SvgIcon iconId="pin-1" className="common-svg-hw-btn" />
                  </div>
                )}
                {message?.isFavorite && (
                  <SvgIcon className={`common-svg-hw-btn ${message?.isFavorite ? 'star-svg' : ''}`} iconId="star" />
                )}
                <span className="visible-chat-time">
                  {message?.created_at && format(new Date(message.created_at), 'hh:mm a')}
                </span>
              </div>
              {message?.reactions?.length > 0 && (
                <MessageReactions message={message} findMessageById={findMessageById} />
              )}
            </>
          )
        )}
      </div>
    </>
  )
}

export default VideoMessage
