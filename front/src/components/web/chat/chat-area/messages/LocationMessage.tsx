import { format } from 'date-fns'
import { FC, memo, useEffect, useMemo, useState } from 'react'
import { queries } from '../../../../../api'
import { SvgIcon } from '../../../../../shared/icons'
import { messageEncryptionService } from '../../../../../services/message-encryption.service'
import { MessageTypeProps } from '../../../../../types/common'
import MessageReactions from '../message-reactions'

const LocationMessage: FC<MessageTypeProps> = memo((props) => {
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
        console.error('Error decrypting location message content:', error)
        setDecryptedContent(message.content || '')
      }
    }

    decrypt()
  }, [message.content, isE2EEnabled, senderKeyData?.public_key])

  const locationData = useMemo(() => {
    if (!message.metadata) return null

    try {
      let metadata = message.metadata
      
      // Handle both string and object metadata
      if (typeof metadata === 'string') {
        metadata = JSON.parse(metadata)
      }
      
      // Handle forwarded messages - metadata might have nested structure
      if (metadata && typeof metadata === 'object') {
        // Check if it's a forwarded message with nested metadata
        const hasLocationData = metadata.latitude !== undefined && metadata.longitude !== undefined
        
        if (hasLocationData) {
          return {
            latitude: Number(metadata.latitude),
            longitude: Number(metadata.longitude),
            address: metadata.address || decryptedContent || 'Location',
          }
        }
      }
      
      return null
    } catch (e) {
      console.error('Failed to parse location metadata:', e)
      return null
    }
  }, [message.metadata, decryptedContent])

  const handleOpenInMaps = () => {
    if (!locationData || typeof locationData.latitude !== 'number' || typeof locationData.longitude !== 'number') return

    const { latitude, longitude } = locationData
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())

    if (isMobile) {
      if (/iphone|ipad|ipod/i.test(userAgent)) {
        window.open(`maps://maps.apple.com/?q=${latitude},${longitude}&ll=${latitude},${longitude}`)
      } else if (/android/i.test(userAgent)) {
        window.open(`geo:${latitude},${longitude}?q=${latitude},${longitude}`)
      } else {
        window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`)
      }
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank')
    }
  }

  if (!locationData) {
    return (
      <div className="location-message-simple">
        <span className="location-icon-text">📍</span>
        <span>Location data unavailable</span>
      </div>
    )
  }

  return (
    <div className="location-message-simple">
      <div className="location-content">
        <div className="location-icon-text">📍</div>
        <div className="location-details">
          <div className="location-address-text">{String(locationData.address || 'Location')}</div>
          <div className="location-coord-text">
            {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
          </div>
        </div>
      </div>
      <button className="location-open-btn" onClick={handleOpenInMaps} type="button">
        Open in Maps →
      </button>

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
          {message?.reactions?.length > 0 && (
            <MessageReactions message={message} findMessageById={findMessageById} />
          )}
        </>
      )}
    </div>
  )
})

LocationMessage.displayName = 'LocationMessage'

export default LocationMessage

