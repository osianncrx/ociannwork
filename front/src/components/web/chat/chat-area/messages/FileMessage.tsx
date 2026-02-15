import { format } from 'date-fns'
import { FC, MouseEvent, useEffect, useState } from 'react'
import { queries } from '../../../../../api'
import { SvgIcon } from '../../../../../shared/icons'
import { messageEncryptionService } from '../../../../../services/message-encryption.service'
import { MessageTypeProps } from '../../../../../types/common'
import { downloadFile, formatFileSize, getFileIcon, getMetadata } from '../../../utils/custom-functions'
import MessageReactions from '../message-reactions'
import { useTranslation } from 'react-i18next'

const FileMessage: FC<MessageTypeProps> = (props) => {
  const { message, hideIcon, findMessageById } = props
  const { t } = useTranslation()
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
        console.error('Error decrypting file message content:', error)
        setDecryptedContent(message.content || '')
      }
    }

    decrypt()
  }, [message.content, isE2EEnabled, senderKeyData?.public_key])

  let fileName:any = message?.file_name || decryptedContent || 'Download file'

  if (message.metadata) {
    try {
      const metadataObj = getMetadata(message)
      if (metadataObj && metadataObj.original_filename) {
        fileName = metadataObj?.original_filename
      } else if (metadataObj && metadataObj.forwarded && metadataObj.original_filename) {
        fileName = metadataObj.original_filename
      }
    } catch (error) {
      console.warn('Error parsing metadata:', error)
    }
  }

  const fileIcon = message.file_type ? getFileIcon(message.file_type, fileName) : null
  const fileSize = message.file_size ? formatFileSize(message.file_size) : ''

  const handleFileClick = async (e: MouseEvent) => {
    e.preventDefault()
    if (message.file_url && message.file_type) await downloadFile(message.file_url, fileName, message.file_type)
  }

  return (
    <div className="file-aligns">
      <div className="file-message-container">
        <div className={`file-attachment ${message.file_url ? 'pointer' : 'default'}`} onClick={handleFileClick}>
          <div className="file-icon-container">
            <span className="file-icon-emoji">{fileIcon}</span>
          </div>

          <div className="file-info-section">
            <div className="file-name-row">
              <span className="file-name-text">{fileName}</span>
            </div>
            {fileSize && <div className="file-size-text">{fileSize}</div>}
            <div className="file-download-hint">{t('click_to_download')}</div>
          </div>

          <div className="download-indicator">
            <SvgIcon iconId='download-icon' className='common-svg-hw-btn' />
          </div>
        </div>
      </div>
      {!hideIcon && (
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
          {message?.reactions?.length > 0 && <MessageReactions message={message} findMessageById={findMessageById} />}
        </>
      )}
    </div>
  )
}

export default FileMessage
