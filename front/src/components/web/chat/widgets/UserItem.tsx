import { memo } from 'react'
import { ChatType } from '../../../../constants'
import ChatAvatar from '../../../../shared/image/ChatAvatar'
import { useAppSelector } from '../../../../store/hooks'
import { ChatItem } from '../../../../types'

const UserItem = memo(
  ({
    chat,
    onSelect,
    hideDot,
  }: {
    chat: ChatItem
    isActive?: boolean
    onSelect?: () => void
    onPin?: (e: any) => void
    last_active?: string
    hideDot?: boolean
  }) => {
    const { userStatus } = useAppSelector((state) => state.userStatus)
    const userStatusData = chat?.id ? userStatus[chat.id] : { status: 'offline', lastSeen: null }
    const status = userStatusData?.status
    const { user } = useAppSelector((store) => store.auth)

    const isMe = user.id == chat.id && chat.type !== ChatType.Channel
    return (
      <li className="chat-item" onClick={onSelect}>
        <div className="custom-avatar-img avatar-container">
          <div className="custom-avatar-img-container">
            <ChatAvatar data={chat} name={chat} customClass="user-info avtar-sm" />
            {chat.type !== ChatType.Channel && user?.id != chat.id && !hideDot && (
              <span className={`status-dot ${status || 'offline'}`} />
            )}
          </div>
          <div className="chat-text">
            <div className="chat-name">{`${chat.name} ${isMe ? '(ME)' : ''}`}</div>
          </div>
        </div>
      </li>
    )
  },
)

export default UserItem
