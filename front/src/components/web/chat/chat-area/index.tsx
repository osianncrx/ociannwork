import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { queries } from '../../../../api'
import { ChatType, MessageType, SOCKET } from '../../../../constants'
import { socket } from '../../../../services/socket-setup'
import { messageEncryptionService } from '../../../../services/message-encryption.service'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import {
  clearSelectedMessages,
  filterSelectedMessages,
  markAllAsSeenBy,
  markChatAsRead,
  setMultiSelectMode,
  setTargetMessageId,
  toggleMessageSelection,
  updateMessagePinState,
  updateMessagePinStateWithData,
  updateMessageStatus,
} from '../../../../store/slices/chatSlice'
import Store from '../../../../store/store'
import { ExtendedChatAreaProps, Message, Status } from '../../../../types/common'
import { formatMessagesForCopy, formatMessagesForHTMLCopy, shouldGroupWithPrevious } from '../../utils/custom-functions'
import { useChatScroll, useTypingIndicator } from '../hooks'
import DateLabel from './date-label'
import MessageRenderer from './messages'

const ChatArea = ({
  onReply,
  onEdit,
  onLoadMore,
  hasMore,
  isLoadingMore,
  isLoading,
  scrollToMessageRef,
  scrollToBottomRef,
}: ExtendedChatAreaProps) => {
  const {
    selectedChatMessages,
    selectedChat,
    targetMessageId,
    unreadCounts,
    hasUnreadMentions,
    isMultiSelectMode,
    selectedMessageIds,
  } = useAppSelector((store) => store.chat)
  const { typingUsers } = useTypingIndicator()
  const { user } = useAppSelector((store) => store.auth)
  const dispatch = useAppDispatch()
  const seenMessagesRef = useRef<Set<string>>(new Set())
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const loadMoreTriggerRef = useRef<any>(null)

  const [isScrolling, setIsScrolling] = useState<boolean>(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const loadLockRef = useRef<boolean>(false)
  const requireUserScrollRef = useRef<boolean>(false)
  const pendingPrependRef = useRef<boolean>(false)
  const prevScrollTopRef = useRef<number>(0)
  const prevScrollHeightRef = useRef<number>(0)
  const anchorMessageIdRef = useRef<string | null>(null)
  const anchorOffsetRef = useRef<number>(0)

  const {
    containerRef,
    handleScroll: originalHandleScroll,
    forceScrollToBottom,
    isUserScrolledUp,
    scrollToMessage,
    maintainScrollPosition,
  } = useChatScroll(selectedChat, selectedChatMessages, typingUsers)

  useEffect(() => {
    if (scrollToBottomRef) {
      scrollToBottomRef.current = forceScrollToBottom
    }
  }, [forceScrollToBottom, scrollToBottomRef])

  useEffect(() => {
    if (scrollToMessageRef) {
      scrollToMessageRef.current = scrollToMessage
    }
  }, [scrollToMessage, scrollToMessageRef])

  useEffect(() => {
    if (!targetMessageId || !selectedChatMessages) return
    const messageExists = selectedChatMessages.some((section) =>
      section.messages.some((msg: Message) => String(msg.id) === targetMessageId),
    )
    if (messageExists) {
      setTimeout(() => {
        scrollToMessage(targetMessageId)
      }, 100)
      dispatch(setTargetMessageId(null))
    }
  }, [targetMessageId, scrollToMessage, dispatch, selectedChatMessages])

  const { data: channelData } = queries.useGetChannelById(
    { id: selectedChat?.id },
    { enabled: selectedChat?.type === ChatType.Channel && !!selectedChat?.id },
  )
  const { data: e2eStatus } = queries.useGetE2EStatus()
  const isE2EEnabled = e2eStatus?.e2e_enabled || false

  const getUserName = useCallback(
    (uid: string | number): string => {
      const id = String(uid)

      if (String(user?.id) === id) {
        return 'You'
      }

      if (selectedChat?.type === ChatType.Channel && channelData?.channel?.members) {
        const member = channelData.channel.members.find((m) => String(m.user_id) === id)
        if (member) return member.User.name
      }

      if (selectedChat?.type === ChatType.DM && selectedChatMessages) {
        for (const section of selectedChatMessages) {
          for (const message of section.messages) {
            if (message.sender && String(message.sender.id) === id) {
              return message.sender.name
            }
            if (message.recipient && String(message.recipient.id) === id) {
              return message.recipient.name
            }
          }
        }
      }

      return 'Unknown User'
    },
    [channelData?.channel?.members, selectedChat, selectedChatMessages, user?.id],
  )

  const getUserNameForPin = useCallback(
    (uid: string | number, pinData?: any): string => {
      const id = String(uid)

      if (String(user?.id) === id) {
        return 'You'
      }

      const regularName = getUserName(uid)

      if (regularName !== 'Unknown User') {
        return regularName
      }

      if (pinData?.user?.name) {
        return pinData.user.name
      }

      if (pinData?.User?.name) {
        return pinData.User.name
      }

      return 'Unknown User'
    },
    [getUserName, user?.id],
  )

  const handleScroll = useCallback(() => {
    originalHandleScroll()
    const el = containerRef.current
    if (!el) return

    if (requireUserScrollRef.current) {
      if (el.scrollTop > 300) {
        requireUserScrollRef.current = false
      }
      return
    }

    const nearTop = el.scrollTop <= 80
    if (nearTop && hasMore && !isLoadingMore && !loadLockRef.current) {
      prevScrollTopRef.current = el.scrollTop
      prevScrollHeightRef.current = el.scrollHeight

      try {
        const items = el.querySelectorAll('[data-message-id]')
        let anchorId: string | null = null
        let anchorOffset = 0
        for (let i = 0; i < items.length; i++) {
          const item = items[i] as HTMLElement 
          const rect = item.getBoundingClientRect()
          if (rect.bottom > el.getBoundingClientRect().top) {
            anchorId = item.getAttribute('data-message-id')
            anchorOffset = rect.top - el.getBoundingClientRect().top
            break
          }
        }
        anchorMessageIdRef.current = anchorId
        anchorOffsetRef.current = anchorOffset
      } catch {}

      loadLockRef.current = true
      pendingPrependRef.current = true
      onLoadMore()
    }
  }, [originalHandleScroll, containerRef, hasMore, isLoadingMore, onLoadMore])

  useEffect(() => {
    const handleMessagePin = (data: { message_id: number; isPinned: boolean; pins?: any[] }) => {
      dispatch(
        updateMessagePinStateWithData({
          messageId: data.message_id,
          pinned: data.isPinned,
          pins: data.pins,
        }),
      )
    }

    const handleMessageUnpin = (data: { message_id: number; isPinned: boolean }) => {
      dispatch(
        updateMessagePinState({
          messageId: data.message_id,
          pinned: data.isPinned,
        }),
      )
    }

    socket.on(SOCKET.Listeners.Message_Pin, handleMessagePin)
    socket.on(SOCKET.Listeners.Message_Unpin, handleMessageUnpin)

    return () => {
      socket.off(SOCKET.Listeners.Message_Pin, handleMessagePin)
      socket.off(SOCKET.Listeners.Message_Unpin, handleMessageUnpin)
    }
  }, [dispatch])

  useEffect(() => {
    if (!pendingPrependRef.current) return
    const id = setTimeout(() => {
      const el = containerRef.current
      if (el) {
        const anchorId = anchorMessageIdRef.current
        let restored = false
        if (anchorId) {
          const anchorEl = el.querySelector(`[data-message-id="${anchorId}"]`) as HTMLElement
          if (anchorEl) {
            const targetScrollTop = anchorEl.offsetTop - anchorOffsetRef.current
            el.scrollTop = targetScrollTop
            restored = true
          }
        }
        if (!restored) {
          const newScrollHeight = el.scrollHeight
          const delta = newScrollHeight - prevScrollHeightRef.current
          el.scrollTop = prevScrollTopRef.current + delta
        }
      }
      pendingPrependRef.current = false
      requireUserScrollRef.current = false
      loadLockRef.current = false
      anchorMessageIdRef.current = null
      anchorOffsetRef.current = 0
    }, 0)
    return () => clearTimeout(id)
  }, [selectedChatMessages, containerRef])

  useEffect(() => {
    isLoadingMore && maintainScrollPosition?.()
  }, [selectedChatMessages, isLoadingMore, maintainScrollPosition])

  // Update message readers
  useEffect(() => {
    const handleMessageStatusUpdated = (data: { messageId: string; userId: string; status: string }) => {
      dispatch(updateMessageStatus(data))
    }

    const handleMessagesRead = (data: { readerId: string; channelId?: string }) => {
      if (data.channelId && selectedChat?.type === ChatType.Channel && selectedChat?.id === data.channelId) {
        dispatch(markAllAsSeenBy({ readerId: data.readerId }))
        dispatch(markChatAsRead({ chatId: data.channelId, type: ChatType.Channel }))
      } else if (!data.channelId && selectedChat?.type === ChatType.DM) {
        dispatch(markAllAsSeenBy({ readerId: data.readerId }))
        dispatch(markChatAsRead({ chatId: selectedChat?.id, type: ChatType.DM }))
      }
    }

    socket.on(SOCKET.Listeners.Message_Status_Updated, handleMessageStatusUpdated)
    socket.on(SOCKET.Listeners.Messages_Read, handleMessagesRead)

    return () => {
      socket.off(SOCKET.Listeners.Message_Status_Updated, handleMessageStatusUpdated)
      socket.off(SOCKET.Listeners.Messages_Read, handleMessagesRead)
    }
  }, [selectedChat, dispatch])

  useEffect(() => {
    if (!containerRef.current || !selectedChatMessages) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleMessageIds = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target.getAttribute('data-message-id'))
          .filter(Boolean) as string[]

        if (!visibleMessageIds.length) return

        const { messageIdsToMark, senderIds } = visibleMessageIds.reduce(
          (acc, messageId) => {
            const message = findMessageById(messageId)
            if (
              message &&
              message.sender_id !== user?.id &&
              !message.statuses?.some((s: Status) => s.user_id === user.id && s.status === 'seen') &&
              !seenMessagesRef.current.has(messageId)
            ) {
              acc.messageIdsToMark.push(messageId)
              seenMessagesRef.current.add(messageId)
              message.sender_id && acc.senderIds.add(message.sender_id)
            }
            return acc
          },
          { messageIdsToMark: [] as string[], senderIds: new Set<string>() },
        )

        if (messageIdsToMark.length > 0) {
          senderIds.forEach((senderId) => {
            const senderMessageIds = messageIdsToMark.filter((id) => findMessageById(id)?.sender_id === senderId)
            if (senderMessageIds.length > 0) {
              socket.emit(SOCKET.Emitters.Message_Seen, {
                messageIds: senderMessageIds,
                userId: senderId,
              })
            }
          })

          if (selectedChat) {
            const chatKey = `${selectedChat.type}_${selectedChat?.id}`
            const currentUnreadCount = Store.getState().chat.unreadCounts[chatKey] || 0
            if (currentUnreadCount > 0) {
              dispatch(
                markChatAsRead({
                  chatId: selectedChat?.id,
                  type: selectedChat?.type,
                }),
              )
            }
            socket.emit('mark-last-message-seen', {
              lastMessageId: visibleMessageIds[visibleMessageIds?.length - 1],
              channelId: selectedChat?.type == ChatType.Channel ? selectedChat?.id : null,
              recipientId: selectedChat?.type != ChatType.Channel ? selectedChat?.id : null,
            })
          }
        }
      },
      { root: containerRef.current, threshold: 0.5, rootMargin: '0px' },
    )

    const messageElements = containerRef.current.querySelectorAll('[data-message-id]')
    messageElements.forEach((el:any) => observer.observe(el))

    return () => observer.disconnect()
  }, [selectedChatMessages, selectedChat?.id, user?.id])

  // Clear seen messages on chat change
  useEffect(() => {
    seenMessagesRef.current.clear()
    setIsScrolling(false)
    if (isMultiSelectMode) {
      dispatch(setMultiSelectMode(false))
      dispatch(clearSelectedMessages())
    }
  }, [selectedChat?.id, dispatch])

  // Clean up selectedMessageIds when messages are deleted and exit multi-select if no selections remain
  useEffect(() => {
    if (isMultiSelectMode && selectedChatMessages) {
      const existingMessageIds: string[] = []
      selectedChatMessages.forEach((section: any) => {
        section.messages.forEach((msg: Message) => {
          existingMessageIds.push(String(msg.id))
        })
      })

      // Filter out deleted message IDs from selection
      const validSelectedIds = selectedMessageIds.filter((id) => existingMessageIds.includes(id))
      
      // If some selected messages were deleted, update the selection
      if (validSelectedIds.length !== selectedMessageIds.length) {
        if (validSelectedIds.length === 0) {
          // All selected messages were deleted, exit multi-select mode immediately
          dispatch(clearSelectedMessages())
          dispatch(setMultiSelectMode(false))
          hasSelectedMessagesRef.current = false
        } else {
          // Some messages were deleted, filter selection to only valid IDs
          dispatch(filterSelectedMessages(validSelectedIds))
        }
      }
    }
  }, [selectedChatMessages, isMultiSelectMode, selectedMessageIds, dispatch])

  // Additional safety check: if multi-select mode is on but no valid selections exist, exit mode
  useEffect(() => {
    if (isMultiSelectMode && selectedChatMessages && selectedMessageIds.length > 0) {
      const existingMessageIds = new Set<string>()
      selectedChatMessages.forEach((section: any) => {
        section.messages.forEach((msg: Message) => {
          existingMessageIds.add(String(msg.id))
        })
      })

      const hasValidSelections = selectedMessageIds.some((id) => existingMessageIds.has(id))
      
      if (!hasValidSelections) {
        // No valid selections exist, exit multi-select mode
        dispatch(clearSelectedMessages())
        dispatch(setMultiSelectMode(false))
        hasSelectedMessagesRef.current = false
      }
    }
  }, [selectedChatMessages, isMultiSelectMode, selectedMessageIds, dispatch])

  // Exit multi-select mode if no messages are selected (but only after user has interacted)
  // We use a ref to track if user has selected any messages to avoid exiting immediately on entry
  const hasSelectedMessagesRef = useRef(false)
  
  useEffect(() => {
    if (selectedMessageIds.length > 0) {
      hasSelectedMessagesRef.current = true
    } else if (selectedMessageIds.length === 0 && hasSelectedMessagesRef.current) {
      // User had selected messages but now all are deselected - exit mode
      if (isMultiSelectMode) {
        dispatch(setMultiSelectMode(false))
        hasSelectedMessagesRef.current = false
      }
    }
  }, [selectedMessageIds.length, isMultiSelectMode, dispatch])

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const findMessageById = useCallback(
    (messageId: string | number): Message | null => {
      const idAsString = String(messageId)
      for (const section of selectedChatMessages || []) {
        const found = section.messages.find((msg: Message) => String(msg.id) === idAsString)
        if (found) return found
      }
      return null
    },
    [selectedChatMessages],
  )

  const handleEditMessage = useCallback(
    (message: Message) => {
      setEditingMessage(message)
      onEdit(message)
    },
    [onEdit],
  )

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null)
    onEdit(null)
  }, [onEdit])

  const redirectToParentMes = useCallback(
    (parentMessage: Message | null) => {
      if (parentMessage?.id) {
        dispatch(setTargetMessageId(String(parentMessage.id)))
      }
    },
    [dispatch],
  )

  const unreadMessagesCount = useMemo(() => {
    if (!selectedChat) return 0
    const chatKey = `${selectedChat.type}_${selectedChat.id}`
    return unreadCounts[chatKey] || 0
  }, [selectedChat, unreadCounts])

  const hasUnreadMention = useMemo(() => {
    if (!selectedChat) return false
    const chatKey = `${selectedChat.type}_${selectedChat.id}`
    return hasUnreadMentions[chatKey] || false
  }, [selectedChat, hasUnreadMentions])

  const shouldShowMentionBadge = useMemo(() => {
    return unreadMessagesCount > 0 && hasUnreadMention
  }, [unreadMessagesCount, hasUnreadMention])

  const handleMessageSelect = useCallback(
    (messageId: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation()
      }
      if (isMultiSelectMode) {
        dispatch(toggleMessageSelection(messageId))
      }
    },
    [isMultiSelectMode, dispatch],
  )

  const handleToggleMultiSelect = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      const newMode = !isMultiSelectMode
      dispatch(setMultiSelectMode(newMode))
      if (!newMode) {
        dispatch(clearSelectedMessages())
        hasSelectedMessagesRef.current = false
      } else {
        hasSelectedMessagesRef.current = false
      }
    },
    [isMultiSelectMode, dispatch],
  )

  const renderMessageItem = (message: Message, sectionLabel: string, msgIndex: number, messages: Message[]) => {
    const prevMessage = messages[msgIndex - 1]
    const groupWithPrevious = shouldGroupWithPrevious(prevMessage, message)
    const parentMessage = message.parent_id ? message?.parent : null
    const isLastMessage = msgIndex === messages.length - 1
    const isEditing = editingMessage?.id === message.id
    const isMyMessage = message.sender_id == user.id
    const isSelected = selectedMessageIds.includes(String(message.id))
    
    const messageContent = (
      <MessageRenderer
        message={message}
        sectionLabel={sectionLabel}
        msgIndex={msgIndex}
        messages={messages}
        isLastMessage={isLastMessage}
        isEditing={isEditing}
        groupWithPrevious={groupWithPrevious}
        parentMessage={parentMessage}
        onReply={onReply}
        onEdit={onEdit}
        getUserName={getUserName}
        getUserNameForPin={getUserNameForPin}
        findMessageById={findMessageById}
        redirectToParentMes={redirectToParentMes}
        handleEditMessage={handleEditMessage}
        handleCancelEdit={handleCancelEdit}
        allChatMessages={selectedChatMessages}
        sectionMessages={messages}
        isMultiSelectMode={isMultiSelectMode}
        isSelected={isSelected}
        onSelect={handleMessageSelect}
      />
    )

    if (groupWithPrevious) {
      return (
        <li
          key={`message-${message.id}-${sectionLabel}-${msgIndex}`}
          data-message-id={message.id}
          className={`chat-item-data flex-items-end msg-hover ${message.reactions.length ? 'message-reactions-added' : ''} ${message.isFavorite ? 'message-favorite' : ''} ${message.isPinned ? 'message-pinned' : ''} ${isSelected ? 'message-selected' : ''}`}
          onClick={(e) => isMultiSelectMode && handleMessageSelect(String(message.id), e)}
        >
          {messageContent}
        </li>
      )
    }

    const children: Message[] = []
    let nextIndex = msgIndex + 1
    while (nextIndex < messages.length && shouldGroupWithPrevious(messages[nextIndex - 1], messages[nextIndex])) {
      children.push(messages[nextIndex])
      nextIndex++
    }

    return (
      <li
        key={`message-${message.id}-${sectionLabel}-${msgIndex}`}
        data-message-id={message.id}
        className={`chat-item-data flex-items-end msg-hover ${message.reactions.length ? 'message-reactions-added' : ''} ${isMyMessage ? 'sent' : 'received'} ${message.message_type == MessageType.Reminder ? 'reminder-message' : ''} ${message.isPinned ? 'message-pinned' : ''} ${isSelected ? 'message-selected' : ''} chat-content-list`}
        onClick={(e) => isMultiSelectMode && handleMessageSelect(String(message.id), e)}
      >
        {messageContent}
        {children.length > 0 && (
          <ul className="grouped-messages ps-0">
            {children.map((child, childIdx) =>
              renderMessageItem(child, sectionLabel, msgIndex + 1 + childIdx, messages),
            )}
          </ul>
        )}
      </li>
    )
  }

  const isMyChat = user?.id == selectedChat?.id && selectedChat?.type != ChatType.Channel

  const hasMessages = useMemo(() => {
    if (!selectedChatMessages || selectedChatMessages.length === 0) return false
    return selectedChatMessages.some((section) => section.messages && section.messages.length > 0)
  }, [selectedChatMessages])

  useEffect(() => {
    if (isMultiSelectMode && !hasMessages) {
      dispatch(clearSelectedMessages())
      dispatch(setMultiSelectMode(false))
      hasSelectedMessagesRef.current = false
    }
  }, [isMultiSelectMode, hasMessages, dispatch])

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const selectedMessages: Message[] = []
      const messageElements = containerRef.current?.querySelectorAll('[data-message-id]')

      if (messageElements) {
        messageElements.forEach((el:any) => {
          if (range.intersectsNode(el)) {
            const id = el.getAttribute('data-message-id')
            if (id) {
              const msg = findMessageById(id)
              if (msg) selectedMessages.push(msg)
            }
          }
        })
      }

      if (selectedMessages.length > 0) {
        e.preventDefault()
        
        const decryptForCopy = (content: string) => {
          if (!isE2EEnabled || !content) return content
          try {
            return messageEncryptionService.decryptMessage(content)
          } catch (error) {
            console.error('Error decrypting message for copy:', error)
            return content
          }
        }
        
        const plainText = formatMessagesForCopy(selectedMessages, getUserNameForPin, decryptForCopy)
        const htmlText = formatMessagesForHTMLCopy(selectedMessages, getUserNameForPin, decryptForCopy)

        if (navigator.clipboard && window.ClipboardItem) {
          navigator.clipboard
            .write([
              new ClipboardItem({
                'text/plain': new Blob([plainText], { type: 'text/plain' }),
                'text/html': new Blob([htmlText], { type: 'text/html' }),
              }),
            ])
            .catch((err) => {
              console.error('Failed to copy formatted messages:', err)
              navigator.clipboard.writeText(plainText).catch((fallbackErr) => {
                console.error('Fallback copy also failed:', fallbackErr)
              })
            })
        } else {
          navigator.clipboard.writeText(plainText).catch((err) => {
            console.error('Failed to copy formatted messages:', err)
          })
        }
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('copy', handleCopy)
    }

    return () => {
      if (container) {
        container.removeEventListener('copy', handleCopy)
      }
    }
  }, [containerRef, findMessageById, getUserNameForPin, selectedChatMessages])

  return isLoading ? (
    <div className="custom-loader-chat">
      <span className="loader-main-chat"></span>
    </div>
  ) : (
    <div className="contact-chat">
      {isMultiSelectMode && hasMessages && (
        <div className="multi-select-header">
          <button
            className="btn-toggle-select"
            onClick={(e) => handleToggleMultiSelect(e)}
            type="button"
          >
            <SvgIcon iconId="close" className="common-svg-md" />
          </button>
          <span className="select-mode-label">
            {selectedMessageIds.length > 0
              ? `${selectedMessageIds.length} selected`
              : 'Select messages'}
          </span>
        </div>
      )}
      {/* {!isMultiSelectMode && hasMessages && (
        <div className="multi-select-toggle">
          <button
            className="btn-toggle-select"
            onClick={(e) => handleToggleMultiSelect(e)}
            title="Select messages"
            type="button"
          >
            <SvgIcon iconId="more-horizontal" className="common-svg-md" />
          </button>
        </div>
      )} */}
      <div className="contact-talk-section custom-scrollbar">
        <div className="contact-chat-end contact-chat-sub">
          <ul className={`chat-list custom-scrollbar ${isMultiSelectMode ? 'multi-select-mode' : ''}`} ref={containerRef} onScroll={handleScroll}>
            {!hasMore && (
              <li className="chat-date-description">
                <p>
                  {isMyChat
                    ? 'Store quick notes, files, and links for later and keep your personal tasks right at your fingertips'
                    : `This marks the beginning of your conversation ${selectedChat?.type === ChatType.Channel ? 'in ' : 'with '} ${selectedChat?.name}`}
                </p>
              </li>
            )}
            {hasMore && (
              <li className="load-more-container" ref={loadMoreTriggerRef}>
                {isLoadingMore ? <span className="loader"></span> : <div className="load-more-trigger"></div>}
              </li>
            )}
            {selectedChatMessages?.map((section, index) => (
              <div className="dateSection" key={`section-${section.label}-${index}`}>
                <li
                  className={`chat-date-divider chat-menu position-sticky ${isScrolling ? '' : ''}`}
                  data-section-id={section?.label}
                >
                  <DateLabel section={section} containerRef={containerRef} forceScrollToBottom={forceScrollToBottom} />
                </li>
                {section?.messages?.map((message: Message, msgIndex: number) => {
                  const prevMessage = section.messages[msgIndex - 1]
                  if (shouldGroupWithPrevious(prevMessage, message)) return null
                  return renderMessageItem(message, section.label, msgIndex, section.messages)
                })}
              </div>
            ))}
          </ul>
          {isUserScrolledUp && (
            <div className={`tap-bottom ${isUserScrolledUp ? 'show' : ''}`} onClick={forceScrollToBottom}>
              {unreadMessagesCount > 0 && user.id !== selectedChat.id && (
                <div className={`unread-badge ${shouldShowMentionBadge ? 'mention-badge' : ''}`}>
                  <span className="badge-btn" aria-label={`${unreadMessagesCount} unread messages`}>
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                </div>
              )}
              <SvgIcon iconId="tap-bottom-arrow" className="common-svg-md" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatArea
