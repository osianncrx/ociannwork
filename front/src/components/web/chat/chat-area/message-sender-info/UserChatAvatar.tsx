import { FC } from 'react'
import { SvgIcon } from '../../../../../shared/icons'
import ChatAvatar from '../../../../../shared/image/ChatAvatar'
import DynamicPopover from '../../../../../shared/popover'
import { useAppSelector } from '../../../../../store/hooks'
import UserChatPopover from './UserChatPopover'
import { UserChatAvatarProps } from '../../../../../types'

const UserChatAvatar: FC<UserChatAvatarProps> = ({ message, customIcon, onMessageUser }) => {
  const { user } = useAppSelector((store) => store.auth)
  const handleMessageUser = () => {
    onMessageUser?.()
  }

  return (
    <div className="avatar">
      {customIcon ? (
        <SvgIcon iconId={customIcon} className="avtar-md" />
      ) : (
        message?.sender_id !== user?.id && (
          <DynamicPopover
            triggerType="click"
            delay={{ show: 200, hide: 200 }}
            trigger={
              <span className="avatar-trigger d-inline-block cursor-pointer">
                <ChatAvatar data={message?.sender} name={message?.sender} customClass="avtar-md" />
              </span>
            }
            hideArrow={false}
            placement="top"
            closeOnScroll={false}
            popoverClassName="user-chat-popover"
          >
            <UserChatPopover message={message} onMessageUser={handleMessageUser} />
          </DynamicPopover>
        )
      )}
    </div>
  )
}

export default UserChatAvatar
