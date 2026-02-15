import { FC } from 'react'
import { MessageTypeProps } from '../../../../../types/common'
import { format } from 'date-fns'
import MessageReactions from '../message-reactions'
import { SvgIcon } from '../../../../../shared/icons'

const ReminderMessage: FC<MessageTypeProps> = (props) => {
  const { message, hideIcon, findMessageById } = props
  const isChannel = !!message.channel_id

  return (
    <>
      <div className="reminder-message-content">
        <span>{`${message?.sender?.name} wanted me to remind ${isChannel ? 'you all' : 'you'}`} </span>
      </div>
      <div className="reply-preview">
        <div className="reply-line"></div>
        <div className="reply-content">
          <div className="flex-between">
            <div className="common-flex">
              <span className="reply-text">{message?.content}</span>
            </div>
          </div>
        </div>
      </div>
      {!hideIcon && (
        <>
          <div className="chat-pinned-box visible-chat-time">
            {message?.isPinned && (
                <SvgIcon iconId="pin-1" className="common-svg-hw-btn" />
            )}
            {message?.isFavorite && (
              <SvgIcon className={`common-svg-hw-btn ${message?.isFavorite ? 'star-svg' : ''}`} iconId="star" />
            )}
            {message?.created_at && format(new Date(message.created_at), 'hh:mm a')}
          </div>
          {message?.reactions?.length > 0 && <MessageReactions message={message} findMessageById={findMessageById} />}
        </>
      )}
    </>
  )
}

export default ReminderMessage
