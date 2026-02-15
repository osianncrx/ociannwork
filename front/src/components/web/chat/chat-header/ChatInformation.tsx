import { formatDistanceToNow } from 'date-fns'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { queries } from '../../../../api'
import { ChatType, UserAvailabilityStatus } from '../../../../constants'
import { SvgIcon } from '../../../../shared/icons'
import ChatAvatar from '../../../../shared/image/ChatAvatar'
import DynamicPopover from '../../../../shared/popover'
import { ImageGallery } from '../../../../shared/swiper'
import { useAppSelector } from '../../../../store/hooks'
import { safeJsonParse } from '../../utils/custom-functions'

const ChatInformation = ({ setDetailModal }: { setDetailModal: (value: boolean) => void }) => {
  const { t } = useTranslation()
  const { selectedChat } = useAppSelector((store) => store.chat)
  const customFields = safeJsonParse(selectedChat.custom_field)
  const { userStatus } = useAppSelector((store) => store.userStatus)
  const { user } = useAppSelector((store) => store.auth)
  const userStatusData = selectedChat?.id ? userStatus[selectedChat.id] : { status: 'offline', lastSeen: null }
  const status = userStatusData?.status || 'offline'
  const lastSeen = userStatusData?.lastSeen
  const isMyChat = selectedChat?.id === user?.id && selectedChat?.type !== ChatType.Channel
  const { data: channelData } = queries.useGetChannelById(
    { id: selectedChat?.id },
    { enabled: selectedChat?.type === ChatType.Channel && !!selectedChat?.id },
  )
  const [showModal, setShowModal] = useState(false)

  const handleOpenDetailsModal = () => {
    if (selectedChat?.type === ChatType.DM) return
    setDetailModal(true)
  }

  const handleImageClick = useCallback(() => {
    setShowModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
  }, [])

  const galleryImages = useMemo(() => {
    if (!selectedChat) return []

    const images: Array<{
      src: string
      alt: string
    }> = []

    images.push({
      src: selectedChat.avatar,
      alt: t('image'),
    })

    return images
  }, [selectedChat])

  const getStatusDisplay = () => {
    if (selectedChat?.type === ChatType.Channel) {
      return channelData?.channel?.description || `${channelData?.channel?.type} ${t('channel')}`
    }
    if (isMyChat) {
      return null
    }

    switch (status) {
      case UserAvailabilityStatus.Online:
        return t('online')
      case UserAvailabilityStatus.Away:
        return lastSeen
          ? `${t('away_since')} ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`
          : t('away')
      case UserAvailabilityStatus.Offline:
        return lastSeen
          ? `${t('last_seen')} ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`
          : t('offline')
      default:
        return t('offline')
    }
  }

  const renderPopoverContent = () => {
    if (selectedChat?.type === ChatType.Channel || isMyChat) {
      return null
    }

    return (
      <div className="user-profile-popover">
        <div className="popover-header">
          <div onClick={() => (selectedChat.avatar ? handleImageClick() : '')}>
            <ChatAvatar data={selectedChat} name={selectedChat} customClass="popover-avatar" />
          </div>
          <div className="popover-user-info">
            <h3 className="popover-username">{selectedChat?.name}</h3>
            <div className="popover-status">
              <span className="status-text">{getStatusDisplay()}</span>
            </div>
          </div>
        </div>

        <div className="popover-details">
          {selectedChat?.email && (
            <div className="detail-item">
              <SvgIcon iconId="mail-icon" className="detail-icon" />
              <span className="detail-text">{selectedChat.email}</span>
            </div>
          )}

          {customFields &&
            Object.entries(customFields)
              .filter(([_, value]) => value !== '')
              .map(([key, value]) => (
                <div className="detail-item" key={key}>
                  <div className="text-dark">{key} : </div>
                  <span className="text-secondary">{String(value)}</span>
                </div>
              ))}

          {selectedChat?.phone && (
            <div className="detail-item">
              <SvgIcon iconId="phone" className="detail-icon" />
              <span className="detail-text">{selectedChat.phone}</span>
            </div>
          )}

          {selectedChat?.title && (
            <div className="detail-item">
              <SvgIcon iconId="user" className="detail-icon" />
              <span className="detail-text">{selectedChat.title}</span>
            </div>
          )}

          {selectedChat?.department && (
            <div className="detail-item">
              <SvgIcon iconId="building" className="detail-icon" />
              <span className="detail-text">{selectedChat.department}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const shouldShowPopover = selectedChat?.type !== ChatType.Channel && !isMyChat

  return (
    <>
      {shouldShowPopover ? (
        <DynamicPopover
          triggerType="click"
          // placement="left"
          trigger={
            <div className="user-info avatar-container">
              <div className="user-profile">
                <div className="position-relative">
                  <ChatAvatar data={selectedChat} name={selectedChat} customClass="avatar" />
                  {!isMyChat && selectedChat?.type !== ChatType.Channel && <span className={`status-dot ${status}`} />}
                </div>
                <div className="text-group">
                  <div className="name">
                    {`${selectedChat?.name} ${isMyChat ? `(${t('me')})` : ''}`}
                    <SvgIcon iconId="dropdown-arrow" className="dropdown-icon" />
                  </div>
                  <div className="status">{getStatusDisplay()}</div>
                </div>
              </div>
            </div>
          }
        >
          {renderPopoverContent()}
        </DynamicPopover>
      ) : (
        <div className="user-info avatar-container">
          <div className="user-profile">
            <div onClick={() => (selectedChat.avatar ? handleImageClick() : '')}>
              <ChatAvatar data={selectedChat} name={selectedChat} customClass="avatar" />
            </div>
            {!isMyChat && selectedChat?.type !== ChatType.Channel && <span className={`status-dot ${status}`} />}

            <div className="text-group" onClick={handleOpenDetailsModal}>
              <div className="name">{`${selectedChat?.name} ${isMyChat ? `(${t('me')})` : ''}`}</div>
              <div className="status">{getStatusDisplay()}</div>
            </div>
          </div>
        </div>
      )}
      {showModal && <ImageGallery images={galleryImages} onClose={handleCloseModal} />}
    </>
  )
}

export default ChatInformation
