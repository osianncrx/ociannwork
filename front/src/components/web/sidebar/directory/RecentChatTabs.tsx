import { SvgIcon } from '../../../../shared/icons'
import { RecentChatsTabProps } from '../../../../types'
import UserItem from '../../chat/widgets/UserItem'

const RecentChatsTab = ({ recentDMs, recentChannels, onChatSelect }: RecentChatsTabProps) => {
  return (
    <div className="recent-chats">
      <div className="recent-dms-section">
        <h6 className="section-title">Direct Messages</h6>
        {recentDMs.length > 0 ? (
          <ul className="chat-list custom-scrollbar">
            {recentDMs.map((chat) => (
              <UserItem key={`${chat.type}_${chat.id}`} chat={chat} onSelect={() => onChatSelect(chat)} />
            ))}
          </ul>
        ) : (
          <div className="no-data">
            <div className="no-data-found-svg mt-2">
              <SvgIcon iconId="no-data-available" />
              <span> No recent direct messages</span>
            </div>
          </div>
        )}
      </div>
      <div className="recent-channels-section">
        <h6 className="section-title">Channels</h6>
        {recentChannels.length > 0 ? (
          <ul className="chat-list">
            {recentChannels.map((chat) => (
              <UserItem
                key={`${chat.type}_${chat.id}`}
                chat={chat}
                onSelect={() => onChatSelect(chat)}
                hideDot={true}
              />
            ))}
          </ul>
        ) : (
          <div className="no-data">
            <div className="no-data-found-svg mt-2">
              <SvgIcon iconId="no-data-available" />
              <span>No recent channels</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecentChatsTab
