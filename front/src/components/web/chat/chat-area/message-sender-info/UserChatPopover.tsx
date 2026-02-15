import { formatDistanceToNow } from 'date-fns'
import { FC, useState } from 'react'
import { ChatType, ImageBaseUrl, ImagePath, UserAvailabilityStatus } from '../../../../../constants'
import { SolidButton } from '../../../../../shared/button/SolidButton'
import ChatAvatar from '../../../../../shared/image/ChatAvatar'
import { ImageGallery } from '../../../../../shared/swiper'
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks'
import { addNewChat, selectChat } from '../../../../../store/slices/chatSlice'
import { ExtendedChatItem, GalleryMedia, UserChatPopoverProps } from '../../../../../types'
import { useTranslation } from 'react-i18next'

const UserChatPopover: FC<UserChatPopoverProps> = ({ message }) => {
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const { userStatus } = useAppSelector((store) => store.userStatus)
  const { allChats, selectedChat } = useAppSelector((store) => store.chat)
  const { user } = useAppSelector((store) => store.auth)
  const dispatch = useAppDispatch()
  const userStatusData = message?.sender_id ? userStatus[message?.sender_id] : { status: 'offline', lastSeen: null }
  const avatarSrc = message?.sender?.avatar || `${ImagePath}/user/placeholder.png`
  const isPlaceholder = avatarSrc === `${ImagePath}/user/placeholder.png`
  const {t} = useTranslation()

  const galleryImages: GalleryMedia[] = isPlaceholder
    ? []
    : [
        {
          src: ImageBaseUrl + avatarSrc,
          alt: message?.sender?.name || 'User Avatar',
          messageId: message?.sender?.id?.toString(),
          fileName: 'profile-photo',
          type: 'image',
        },
      ]

  const isSelfMessage = message?.sender?.id === user?.id
  const isSelectedChat = selectedChat?.id === message?.sender?.id

  const redirectToChat = () => {
    const sender = message.sender
    if (!message.channel_id) return
    const foundChat = allChats.find((chat) => chat.id == sender.id)
    if (foundChat) {
      dispatch(selectChat(foundChat))
    } else {
      const newChat: ExtendedChatItem = {
        type: ChatType.DM,
        id: sender.id,
        name: sender.name,
        email: sender.email,
        avatar: sender.avatar,
        profile_color: sender.profile_color,
        latest_message_at: null,
        pinned: false,
        last_message: null,
      }
      dispatch(addNewChat(newChat))
      dispatch(selectChat(newChat))
    }
  }

  const getStatusDisplay = () => {
    if (!userStatusData) return
    switch (userStatusData?.status) {
      case UserAvailabilityStatus.Online:
        return 'Online'
      case UserAvailabilityStatus.Away:
        return userStatusData.lastSeen
          ? `Away since ${formatDistanceToNow(new Date(userStatusData.lastSeen), { addSuffix: true })}`
          : 'Away'
      case UserAvailabilityStatus.Offline:
        return userStatusData.lastSeen
          ? `Last seen ${formatDistanceToNow(new Date(userStatusData.lastSeen), { addSuffix: true })}`
          : 'Offline'
      default:
        return 'Offline'
    }
  }

  const handleAvatarClick = () => {
    setShowAvatarModal(true)
  }

  const handleCloseAvatarModal = () => {
    setShowAvatarModal(false)
  }

  return (
    <div className="user-chat-popover-content">
      <div className="popover-user-info">
        <div className="popover-avatar-container" onClick={handleAvatarClick}>
          <ChatAvatar
            data={message?.sender}
            name={message?.sender}
            customClass="popover-avatar-lg"
            height={120}
            width={120}
          />
        </div>
        <div className="popover-user-details">
          <h4 className="user-name">{message?.sender?.name || message?.sender?.first_name || 'Unknown User'}</h4>
          <p className="user-status">
            <span className={`status-dot ${userStatusData?.status || 'offline'}`} />
            {getStatusDisplay()}
          </p>
          <p className="user-time">
            {t("local_time")}:{' '}
            {new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
      {!isSelfMessage && !isSelectedChat && (
        <div className="popover-actions">
          <SolidButton className="popover-btn message-btn" icon="message" onClick={redirectToChat} color="primary">
            Message
          </SolidButton>
        </div>
      )}

      {showAvatarModal && !isPlaceholder && galleryImages.length > 0 && (
        <ImageGallery
          images={galleryImages}
          initialIndex={0}
          onClose={handleCloseAvatarModal}
        />
      )}

      {showAvatarModal && isPlaceholder && (
        <div className="image-modal-overlay" onClick={handleCloseAvatarModal}>
          <div className="image-container" onClick={(e) => e.stopPropagation()}>
            <button className="image-close-button" onClick={handleCloseAvatarModal}>
              ✕
            </button>
            <div>{t("no_profile_photo")}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserChatPopover
