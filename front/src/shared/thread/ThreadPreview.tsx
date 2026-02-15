import { FC } from 'react'
import { ThreadPreviewProps } from '../../types'

const ThreadPreview: FC<ThreadPreviewProps> = ({
  onClick,
  children,
  showHeaderIcon = true,
  headerText,
  className = '',
  message,
  isLastMessage = false,
  currentUserId,
}) => {
  const showStatus = isLastMessage && currentUserId && message?.sender_id === currentUserId

  return (
    <div className={`reply-preview ${className}`} onClick={onClick}>
      <div className="reply-content">
        {showHeaderIcon && (
          <div className="reply-content-box">{headerText && <span className="reply-sender">{headerText}</span>}</div>
        )}
        <div className="flex-between">
          <div className="common-flex">{children}</div>
          {(message?.isFavorite || showStatus) && <div className="common-flex gap-2"></div>}
        </div>
      </div>
    </div>
  )
}

export default ThreadPreview
