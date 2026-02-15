import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap'
import { MessageType } from '../../../../../constants'
import { SvgIcon } from '../../../../../shared/icons'
import { ConfirmModal } from '../../../../../shared/modal'
import { useAppSelector } from '../../../../../store/hooks'
import { MessageActionsProps } from '../../../../../types'
import EmojiWrapper from '../../message-input/text-editor/EmojiWrapper'
import MessageReadByModal from '../../modals/MessageReadBy'
import UserSelectionModal from '../../modals/UserSelectionModal'
import { useMessageActions } from './useMessageActions'
import { useMessageSelection } from './useMessageSelection'

const MessageActions: FC<MessageActionsProps> = ({
  message,
  onReply,
  onEdit,
  onMessageHoverChange,
  dropdownOpen,
  setDropdownOpen,
}) => {
  const { t } = useTranslation()
  const { user } = useAppSelector((store) => store.auth)
  const isMyMessage = useMemo(() => message.sender_id === user.id, [message.sender_id, user.id])
  const {
    permissions,
    copyStatus,
    isPending,
    confirmDeleteOpen,
    forwardModalOpen,
    infoModalOpen,
    setConfirmDeleteOpen,
    setForwardModalOpen,
    setInfoModalOpen,
    setSelectedMessage,
    handleCopy,
    handleReaction,
    handlePinToggle,
    handleFavoriteToggle,
    handleDelete,
    handleForward,
  } = useMessageActions(message)
  const { enterSelectionMode } = useMessageSelection()

  const handleMouseEnter = () => {
    setDropdownOpen(true)
  }

  const handleMouseLeave = () => {
    setDropdownOpen(false)
  }
  return (
    <>
      <ul className="chat-messages-icon">
        {/* Reply Action */}
        <li>
          <SvgIcon className="common-svg-hw-btn replymsgs" iconId="reply" onClick={() => onReply(message)} />
        </li>

        {/* Reaction Action */}
        {permissions.canReact && (
          <li>
            <EmojiWrapper
              position={message.sender_id === user.id ? 'left' : 'right'}
              id={`emoji-reaction-${message.id}`}
              onEmojiSelect={(emoji) => {
                handleReaction(emoji)
              }}
              onPickerStateChange={onMessageHoverChange}
            >
              <SvgIcon className="common-svg-hw-btn" iconId="emoji-round-plus" />
            </EmojiWrapper>
          </li>
        )}

        {/* Copy Action */}
        {permissions.canCopy && (
          <li>
            <SvgIcon
              className={`common-svg-hw-btn ${copyStatus === 'copied' ? 'copied-success' : ''}`}
              iconId={copyStatus === 'copied' ? 'copied-icon' : 'copy-icon'}
              onClick={() => {
                handleCopy()
              }}
            />
          </li>
        )}

        {/* Forward Action */}
        {permissions.canForward && (
          <li>
            <SvgIcon
              className="common-svg-hw-btn"
              iconId="forward-icon"
              onClick={() => {
                setSelectedMessage(message)
                setForwardModalOpen(true)
              }}
            />
          </li>
        )}

        {/* Dropdown for remaining actions */}
        {(message.message_type !== MessageType.Call || isMyMessage) && (
          <Dropdown
            isOpen={dropdownOpen}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            direction="up"
          >
            <DropdownToggle tag="li" className="list-unstyled" caret={false}>
              <SvgIcon className="common-svg-hw-btn" iconId="more-horizontal" />
            </DropdownToggle>

            <DropdownMenu container="body">
              {permissions.canEdit && (
                <DropdownItem
                  onClick={() => {
                    onEdit(message)
                    setDropdownOpen(false) // Close dropdown on edit
                  }}
                >
                  <SvgIcon className="common-svg-hw-btn" iconId="edit" /> {t('edit')}
                </DropdownItem>
              )}

              <DropdownItem
                onClick={() => {
                  enterSelectionMode(Number(message.id))
                  setDropdownOpen(false)
                }}
              >
                <SvgIcon className="common-svg-hw-btn" iconId="checkbox" /> {t('select')}
              </DropdownItem>

              {permissions.canPin && (
                <DropdownItem
                  onClick={() => {
                    handlePinToggle()
                  }}
                >
                  <SvgIcon className="common-svg-hw-btn" iconId="dropdown-pin" />
                  {message.isPinned ? t('unpin') : t('pin')}
                </DropdownItem>
              )}

              {permissions.canFavorite && (
                <DropdownItem
                  onClick={() => {
                    handleFavoriteToggle()
                  }}
                >
                  <SvgIcon className="common-svg-hw-btn" iconId="dropdown-star" />
                  {message.isFavorite ? t('unfavorite') : t('favorite')}
                </DropdownItem>
              )}

              {permissions.canDelete && (
                <DropdownItem
                  onClick={() => {
                    setConfirmDeleteOpen(true)
                  }}
                >
                  <SvgIcon className="common-svg-hw-btn delete" iconId="trash-icon" /> {t('delete')}
                </DropdownItem>
              )}

              {permissions.canSeeReadBy && (
                <DropdownItem
                  onClick={() => {
                    setInfoModalOpen(true)
                  }}
                >
                  <SvgIcon className="common-svg-hw-btn read-by" iconId="read-by-close" /> {t('read_by')}
                </DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>
        )}
      </ul>

      {/* Modals */}
      <ConfirmModal
        isLoading={isPending}
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false)
          setDropdownOpen(false)
        }}
        onConfirm={() => {
          handleDelete()
          setDropdownOpen(false)
        }}
        title={t('delete_message')}
        subtitle={t('action_cannot_be_undone')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        variant="danger"
      />
      <UserSelectionModal
        isOpen={forwardModalOpen}
        onClose={() => {
          setForwardModalOpen(false)
          setDropdownOpen(false)
        }}
        title={t('forward_to')}
        submitButtonText={t('forward')}
        onSubmit={(selectedUsers) => {
          handleForward(selectedUsers)
          setDropdownOpen(false)
        }}
        isMulti
        excludeUsers={[user.id]}
      />
      <MessageReadByModal
        isOpen={infoModalOpen}
        onClose={() => {
          setInfoModalOpen(false)
          setDropdownOpen(false)
        }}
        message={message}
      />
    </>
  )
}

export default MessageActions
