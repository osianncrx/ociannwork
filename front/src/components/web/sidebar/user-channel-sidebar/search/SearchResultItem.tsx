import { memo } from 'react';
import ChatAvatar from '../../../../../shared/image/ChatAvatar';
import { useAppSelector } from '../../../../../store/hooks';

const SearchResultItem = memo(({ member, onStartChat }: { member: any; onStartChat: () => void }) => {
  const { user } = useAppSelector((store) => store.auth)
  const isMe = user?.id == member?.id
  const { userStatus } = useAppSelector((state) => state.userStatus)
  const status = userStatus?.[member.id]?.status || 'offline'

  return (
    <li className="chat-item" onClick={onStartChat}>
      <div className="avatar-container">
        <ChatAvatar data={member} name={member} customClass="avtar-sm" />
        {!isMe && <span className={`status-dot ${status}`} />}
      </div>
      <div className="chat-text">
        <div className="chat-name">{`${member.name} ${isMe ? '(ME)' : ''}`}</div>
        <div className="chat-message">{member.email}</div>
      </div>
    </li>
  )
})

export default SearchResultItem
