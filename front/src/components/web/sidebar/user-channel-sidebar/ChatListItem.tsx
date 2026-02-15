import { memo, useMemo } from 'react'
import { queries } from '../../../../api'
import { ChatType } from '../../../../constants'
import { SvgIcon } from '../../../../shared/icons'
import ChatAvatar from '../../../../shared/image/ChatAvatar'
import { messageEncryptionService } from '../../../../services/message-encryption.service'
import { useAppSelector } from '../../../../store/hooks'
import { ChatItem } from '../../../../types'
import { getLastMessagePreview } from '../../utils/custom-functions'

const ChatListItem = memo(
  ({
    chat,
    isActive,
    onSelect,
    onPin,
  }: {
    chat: ChatItem
    isActive: boolean
    onSelect: () => void
    onPin: (e: any) => void
  }) => {
    const { user } = useAppSelector((store) => store.auth)
    const { userStatus } = useAppSelector((state) => state.userStatus)
    const { hasUnreadMentions, currentCallStatus, callParticipants } = useAppSelector((state) => state.chat)
    const userStatusData = chat?.id ? userStatus[chat.id] : { status: 'offline', lastSeen: null }
    const status = userStatusData?.status
    const isMe = user?.id == chat?.id && chat?.type != ChatType.Channel
    const chatKey = `${chat.type}_${chat.id}`
    const hasUnreadMention = hasUnreadMentions[chatKey] || false
    const shouldShowMentionBadge = (chat.unread_count ?? 0) > 0 && hasUnreadMention

    // Get E2E status and sender's public key for decryption
    const { data: e2eStatus } = queries.useGetE2EStatus()
    const isE2EEnabled = e2eStatus?.e2e_enabled || false
    const { data: senderKeyData } = queries.useGetUserPublicKey(
      chat?.last_message?.sender_id || '',
      { enabled: isE2EEnabled && !!chat?.last_message?.sender_id }
    )

    // Decryption function for last message
    const decryptLastMessage = useMemo(() => {
      if (!isE2EEnabled || !chat?.last_message?.content) {
        return (content: string) => content
      }
      return (content: string) => {
        try {
          return messageEncryptionService.decryptMessage(
            content,
            senderKeyData?.public_key || null
          )
        } catch (error) {
          console.error('Error decrypting last message:', error)
          return content
        }
      }
    }, [isE2EEnabled, senderKeyData?.public_key, chat?.last_message?.content])
    const callHighLightChannel = useMemo(() => {
      if (!currentCallStatus || currentCallStatus === 'idle') {
        return false
      }
      if (callParticipants.chatType === ChatType.Channel) {
        return chat.type === ChatType.Channel && callParticipants.channelId === chat.id
      }
      if (callParticipants.chatType === ChatType.DM) {
        return chat.type === ChatType.DM && callParticipants.participants.includes(chat?.id)
      }
      return false
    }, [currentCallStatus, callParticipants, chat.type, chat.id])

    return (
      <li
        className={`chat-item ${isActive ? 'active' : ''} ${(chat.unread_count ?? 0) > 0 && user.id !== chat.id ? 'unread-message':''} ${callHighLightChannel && chat.id !== user.id ? 'call-highlight-class' : ''}`}
        onClick={onSelect}
      >
        <div className="avatar-container">
          {currentCallStatus !== '' && callHighLightChannel && chat.id !== user.id ? (
            <div className="chat-icon chat-calling-icon">
              <SvgIcon iconId="call" />
            </div>
          ) : (
            <>
              <ChatAvatar data={chat} name={chat} customClass="avtar-sm" />
              {chat.type !== ChatType.Channel && !isMe && <span className={`status-dot ${status || 'offline'}`} />}
            </>
          )}
        </div>
        <div className="chat-text">
          <div className="chat-name">{`${chat.name} ${isMe ? '(ME)' : ''}`}</div>
          <div className="chat-message">{getLastMessagePreview(chat?.last_message, decryptLastMessage)}</div>
        </div>
        {chat.is_muted && <SvgIcon className="common-svg-hw unmute" iconId="unmute" />}
        <div className="chat-meta">
          {(chat.unread_count ?? 0) > 0 && user.id !== chat.id && (
            <div className={`${hasUnreadMention ? 'counter-mention' : ''}`}>
              <div className={`unread-badge ${shouldShowMentionBadge ? 'mention-badge' : ''}`}>
                <div className="unread-badge-text" aria-label={`${chat.unread_count ?? 0} unread messages`}>
                  {(chat.unread_count ?? 0) > 9 ? '9+' : chat.unread_count}
                </div>
              </div>
              <div className="mention-side">{hasUnreadMention ? '@' : ''}</div>
            </div>
          )}
          <div className={`pin-icon ${chat.pinned ? 'pinned' : ''}`} onClick={onPin}>
            <SvgIcon iconId={chat.pinned ? 'pinned' : 'pin'} />
          </div>
        </div>
      </li>
    )
  },
)

export default ChatListItem
