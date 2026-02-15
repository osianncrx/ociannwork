import { format } from 'date-fns'
import { FC, memo } from 'react'
import { ImageBaseUrl } from '../../../../../constants'
import { SvgIcon } from '../../../../../shared/icons'
import { MessageTypeProps } from '../../../../../types/common'
import MessageReactions from '../message-reactions'

const AudioMessage: FC<MessageTypeProps> = memo((props) => {
  const { message, hideIcon, findMessageById } = props

  return (
    <div className="message-audio">
      <audio controls className="chat-media-audio">
        <source src={ImageBaseUrl + message.file_url} type="audio/mpeg" />
        <source src={ImageBaseUrl + message.file_url} type="audio/wav" />
        <source src={ImageBaseUrl + message.file_url} type="audio/ogg" />
        Your browser does not support the audio element.
      </audio>
      {!hideIcon && (
        <>
          <div className="chat-pinned-box">
            {message?.isPinned && (
              <div className="chat-content-pinned">
                <SvgIcon iconId="pin-1" className="common-svg-hw-btn" />
              </div>
            )}
            {message?.isFavorite && (
              <SvgIcon className={`common-svg-hw-btn ${message?.isFavorite ? 'star-svg' : ''}`} iconId="star" />
            )}
            <span className="visible-chat-time">
              {message?.created_at && format(new Date(message.created_at), 'hh:mm a')}
            </span>
          </div>
          {message?.reactions?.length > 0 && <MessageReactions message={message} findMessageById={findMessageById} />}
        </>
      )}
    </div>
  )
})

export default AudioMessage
