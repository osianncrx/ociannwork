import { CHAT_CONSTANTS, ImagePath, MessageType } from '../../../../../constants'
import { SvgIcon } from '../../../../../shared/icons'
import { Image } from '../../../../../shared/image'
import { useAppSelector } from '../../../../../store/hooks'
import { ReplyMessage } from '../../../../../types/common'
import { extractTextWithMentions } from '../../../../../utils'
import { getRepliedMessagePreview } from '../../../utils/custom-functions'

const RepliedMessagePreview = ({
  replyingTo,
  onCancelReply,
}: {
  replyingTo: ReplyMessage | null
  onCancelReply?: () => void
}) => {
  const plainText = replyingTo?.content ? extractTextWithMentions(replyingTo.content) : ''
  const messagePreview = getRepliedMessagePreview(replyingTo || null, plainText)
  const { user } = useAppSelector((store) => store.auth)

  const isMyMessage = user.id == replyingTo?.sender.id

  if (!messagePreview) return null
  return (
    <div className="reply-indicator-bar">
      <div className="reply-indicator-content">
        <div className="reply-info">
          <div className="reply-info-sender">
            <span className="reply-sender-name">{`${isMyMessage ? 'You' : replyingTo?.sender.name}`}</span>
          </div>
          <div className="message-reply">
            {messagePreview.type === MessageType.Image && messagePreview.content && (
              <div className="reply-media-preview">
                <Image
                  src={messagePreview.content}
                  alt={messagePreview.alt}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = `${ImagePath}/user/placeholder.png`
                  }}
                />
              </div>
            )}

            {messagePreview.type === 'video' && messagePreview.content && (
              <div className="reply-media-preview">
                <span className="reply-media-type">
                  <SvgIcon iconId="video" />
                  <span>Video</span>
                </span>
              </div>
            )}

            {messagePreview.type === 'audio' && messagePreview.content && (
              <div className="reply-media-preview">
                <span className="reply-media-type">
                  <SvgIcon iconId="audio" />
                  <span>Audio</span>
                </span>
              </div>
            )}

            {messagePreview.type === 'file' && messagePreview.content && (
              <div className="reply-media-preview">
                <span className="reply-media-type">
                  <SvgIcon iconId="page" />
                  <span>File</span>
                </span>
              </div>
            )}

            {messagePreview.type === 'call' && (
              <div className="reply-media-preview">
                <span className="reply-media-type">
                  <SvgIcon iconId="phone" />
                  <span>Call</span>
                </span>
              </div>
            )}

            {messagePreview.text && (
              <span className="reply-preview-text">
                {messagePreview.text.length > CHAT_CONSTANTS.Trim_Reply_Length
                  ? `${messagePreview.text.substring(0, CHAT_CONSTANTS.Trim_Reply_Length)}...`
                  : messagePreview.text}
              </span>
            )}

            {!messagePreview.text && !messagePreview.content && !messagePreview.type && (
              <span className="reply-preview-text">
                {messagePreview.type === 'text' ? 'Empty message' : `${messagePreview.type} message`}
              </span>
            )}
          </div>
        </div>
        <button className="reply-cancel-btn" onClick={onCancelReply}>
          <SvgIcon iconId="close" className="common-svg-hw-btn" />
        </button>
      </div>
    </div>
  )
}

export default RepliedMessagePreview
