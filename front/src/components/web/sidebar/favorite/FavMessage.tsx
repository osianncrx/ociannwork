import { format } from 'date-fns'
import { FC } from 'react'
import { mutations } from '../../../../api'
import { SvgIcon } from '../../../../shared/icons'
import ChatAvatar from '../../../../shared/image/ChatAvatar'
import { FavMessageProps } from '../../../../types'
import { SenderName } from '../../chat/chat-area/message-sender-info'
import PinFavRenderer from '../../chat/chat-area/messages/PinFavRenderer'

const FavMessage: FC<FavMessageProps> = ({ selectedFavMessages, message }) => {
  const { mutate: favoriteMessage } = mutations.useFavoriteMessage()
  const { mutate: unfavoriteMessage } = mutations.useUnfavoriteMessage()

  const handleFavoriteMessage = () => {
    if (!message?.id) return

    if (message?.isFavorite) {
      unfavoriteMessage({ message_id: message?.id })
    } else {
      favoriteMessage({ message_id: message?.id })
    }
  }

  return (
    <div className="fw-medium">
      <div className="fav-aligns">
        <div className="profile-aligns">
          <ChatAvatar data={message?.sender} name={message?.sender} customClass="avtar-md" />
          <SenderName message={message} />
        </div>
        <div className="time-aligns">
          <span className="chat-time">{format(new Date(message?.created_at), 'HH:mm')}</span>
          <SvgIcon
            className={`common-svg-hw-btn ${message?.isFavorite ? 'star-svg' : ''}`}
            iconId="star"
            onClick={handleFavoriteMessage}
          />
        </div>
      </div>
      <PinFavRenderer message={message} allChatMessages={selectedFavMessages} />
    </div>
  )
}

export default FavMessage
