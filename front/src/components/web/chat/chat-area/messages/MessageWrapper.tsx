import React, { FC, memo, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChatType } from '../../../../../constants'
import { SvgIcon } from '../../../../../shared/icons'
import { useAppSelector } from '../../../../../store/hooks'
import { MessageWrapperProps } from '../../../../../types'
import { getMetadata } from '../../../utils/custom-functions'
import EditMessageInput from '../../message-input/edit-message'
import MessageActions from '../message-actions'
import { useMessageSelection } from '../message-actions/useMessageSelection'
import { SenderName, UserChatAvatar } from '../message-sender-info'
import MessageStatus from '../message-status'
import RepliedMessage from './RepliedMessage'

const MessageWrapper: FC<MessageWrapperProps> = memo(
  ({
    children,
    message,
    isEditing,
    groupWithPrevious,
    isLastMessage,
    parentMessage,
    onReply,
    handleEditMessage,
    handleCancelEdit,
    redirectToParentMes,
    customIcon,
    customSenderName,
    hideAvatar = false,
    hideSenderName = false,
    hideActions = false,
    hideStatus = false,
    isMultiSelectMode = false,
    // onSelect,
  }) => {
    const { user } = useAppSelector((store) => store.auth)
    const { selectedChat } = useAppSelector((store) => store.chat)
    const [isHovered, setIsHovered] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const { t } = useTranslation()
    const messageMetaData = useMemo(() => getMetadata(message), [message])
    const isForwarded = useMemo(() => (messageMetaData && messageMetaData?.forwarded) || false, [messageMetaData])
    const { selectedMessages, isSelectionMode, toggleMessageSelection, clearSelection } = useMessageSelection()

    const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null)
    const isSelected = selectedMessages.has(Number(message.id))

    const handleCheckboxChange = () => {
      toggleMessageSelection(Number(message.id))
    }

    const handleMessageClick = (e: React.MouseEvent) => {
      if (
        (e.target as HTMLElement).closest('.message-checkbox') ||
        (e.target as HTMLElement).closest('.msg-actions') ||
        (e.target as HTMLElement).closest('.dropdown-menu')
      ) {
        return
      }

      if (isSelectionMode) {
        toggleMessageSelection(Number(message.id))
      }
    }

    useEffect(() => {
      const handleClickOutside = () => {
        if (!isSelectionMode) return
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isSelectionMode, clearSelection])

    return (
      <div
        className={`${groupWithPrevious ? 'flex-items-start' : 'common-flex-start'} ${
          message?.isPinned ? 'message-pinned' : ''
        } ${message?.isFavorite ? 'message-favorite' : ''} ${!groupWithPrevious ? 'message-align' : ''} msg-hover chat-item ${
          groupWithPrevious ? 'chat-content-list' : ''
        } ${isEditing ? 'message-editor' : ''} ${isSelectionMode ? 'multi-select-active' : ''} ${
          isSelected ? 'message-selected' : ''
        }`}
        onMouseEnter={() => {
          !isSelectionMode && setHoveredMessageId(Number(message.id))
          setIsHovered(true)
        }}
        onMouseLeave={() => {
          !isSelectionMode && setHoveredMessageId(null)
          setIsHovered(false)
        }}
        onClick={handleMessageClick}
      >
        {isSelectionMode && (
          <div className="message-checkbox me-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              className="form-check-input"
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </div>
        )}
        {!groupWithPrevious && !hideAvatar && <UserChatAvatar message={message} customIcon={customIcon} />}

        <div className="chat-content">
          {!groupWithPrevious &&
            !hideSenderName &&
            selectedChat?.type !== ChatType.DM &&
            message?.sender_id !== user?.id && (
              <SenderName message={message} isLastMessage={isLastMessage} customSenderName={customSenderName} />
            )}

          {isForwarded && (
            <div className="forwarded-indicator">
              <SvgIcon iconId="forwarded-icon" className="common-svg-hw-btn" />
              <span>{t('forwarded')}</span>
            </div>
          )}
          <div className={`chat-messages ${!parentMessage ? 'flex-between' : 'replied-message'}`}>
            {parentMessage && !isEditing && (
              <RepliedMessage
                parentMessage={parentMessage}
                onClick={() => redirectToParentMes(parentMessage)}
                isLastMessage={isLastMessage}
                message={message}
              />
            )}
            {isEditing ? (
              <EditMessageInput message={message} onCancel={handleCancelEdit} onSave={handleCancelEdit} />
            ) : (
              <div className={`chat-messages-width ${dropdownOpen || isHovered ? 'action-hovered' : ''}`}>
                {children}
                {!isEditing && !hideActions && !isMultiSelectMode && hoveredMessageId === message.id && (
                  <MessageActions
                    onReply={onReply}
                    onEdit={handleEditMessage}
                    message={message}
                    onMessageHoverChange={setIsHovered}
                    dropdownOpen={dropdownOpen}
                    setDropdownOpen={setDropdownOpen}
                  />
                )}
              </div>
            )}

            {!hideStatus && (
              <div className="common-flex gap-2 dilivery-box">
                {user?.id === message?.sender_id && user?.id !== selectedChat?.id && (
                  <MessageStatus message={message} isLastMessage={isLastMessage} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  },
)

export default MessageWrapper
