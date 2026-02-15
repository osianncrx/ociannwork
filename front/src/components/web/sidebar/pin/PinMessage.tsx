import { format } from 'date-fns'
import { FC } from 'react'
import { mutations } from '../../../../api'
import { SvgIcon } from '../../../../shared/icons'
import ChatAvatar from '../../../../shared/image/ChatAvatar'
import { PinMessageProps } from '../../../../types'
import { SenderName } from '../../chat/chat-area/message-sender-info'
import PinFavRenderer from '../../chat/chat-area/messages/PinFavRenderer'

const PinMessage: FC<PinMessageProps> = ({ selectedPinMessages, message }) => {
  const { mutate: pinMessage } = mutations.usePinMessage()
  const { mutate: unpinMessage } = mutations.useUnpinMessage()

  const pinUnpinMessage = () => {
    if (!message?.id) return
    if (message.isPinned) {
      unpinMessage({ message_id: message?.id })
    } else {
      pinMessage({ message_id: message?.id })
    }
  }

  return (
    <div className="fw-medium ">
      <div className="pin-aligns">
        <div className="profile-aligns">
          <ChatAvatar data={message?.sender} name={message?.sender} customClass="avtar-md" />
          <SenderName message={message} />
        </div>
        <div className="time-aligns">
          <span className="chat-time">{format(new Date(message?.created_at), 'HH:mm')}</span>
          <SvgIcon iconId="pin-1" className="common-svg-hw-btn" onClick={pinUnpinMessage} />
        </div>
      </div>
      <PinFavRenderer message={message} allChatMessages={selectedPinMessages} />
    </div>
  )
}

export default PinMessage
