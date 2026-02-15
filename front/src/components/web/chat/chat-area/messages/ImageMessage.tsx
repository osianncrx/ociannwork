import { format } from 'date-fns'
import { FC, memo, MouseEvent, SyntheticEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { queries } from '../../../../../api'
import { ImageBaseUrl, ImagePath, MessageType } from '../../../../../constants'
import { SvgIcon } from '../../../../../shared/icons'
import { Image } from '../../../../../shared/image'
import { ImageGallery } from '../../../../../shared/swiper'
import { messageEncryptionService } from '../../../../../services/message-encryption.service'
import { MessageTypeProps } from '../../../../../types/common'
import { downloadFile } from '../../../utils/custom-functions'
import Renderer from '../../widgets/Renderer'
import MessageReactions from '../message-reactions'
import { GalleryMedia } from '../../../../../types'

const ImageMessage: FC<MessageTypeProps> = memo((props) => {
  const { message, allChatMessages, hideIcon, findMessageById } = props
  const [showModal, setShowModal] = useState(false)
  const [showDownload, setShowDownload] = useState(false)
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
        console.error('Error decrypting image message content:', error)
        setDecryptedContent(message.content || '')
      }
    }

    decrypt()
  }, [message.content, isE2EEnabled, senderKeyData?.public_key])

  const fileName = useMemo(() => message.file_name || 'image', [message.file_name])

  const galleryImages = useMemo(() => {
    if (!allChatMessages) return []

    const images: GalleryMedia[] = []

    allChatMessages.forEach((section) => {
      section.messages?.forEach((msg:any) => {
        if (msg.message_type === MessageType.Image && msg.file_url) {
          const imageSrc = ImageBaseUrl + msg.file_url
          images.push({
            src: imageSrc,
            alt: msg.file_name || 'image',
            messageId: msg.id,
            fileName: msg.file_name, 
            type: 'image',
          })
        }
      })
    })

    return images
  }, [allChatMessages])

  const initialImageIndex = useMemo(() => {
    return galleryImages.findIndex((img) => img.messageId === message.id)
  }, [galleryImages, message.id])

  const handleImageClick = useCallback(() => {
    setShowModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
  }, [])

  const handleDownload = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault()
      if (message?.file_url && message.file_type) await downloadFile(message?.file_url, fileName, message.file_type)
    },
    [message.file_url, fileName, message.file_type],
  )

  const handleImageError = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    target.src = `${ImagePath}/user/placeholder.png`
  }, [])

  return (
    <>
      <div
        className="message-image"
        onMouseEnter={() => setShowDownload(true)}
        onMouseLeave={() => setShowDownload(false)}
      >
        <div className="position-relative">
          <Image
            src={ImageBaseUrl + message.file_url}
            alt={message.file_name || 'image'}
            className="chat-media-image"
            onClick={handleImageClick}
            onError={handleImageError}
            loading="lazy"
          />
          {showDownload && <SvgIcon iconId="download-icon" onClick={handleDownload} className="image-download-icon" />}
        </div>
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

      {showModal && <ImageGallery images={galleryImages} initialIndex={initialImageIndex} onClose={handleCloseModal} />}
    </>
  )
})

export default ImageMessage
