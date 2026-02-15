import { InfiniteData, useQueryClient } from '@tanstack/react-query'
import { isSameDay } from 'date-fns'
import { useEffect } from 'react'
import { getSectionLabel } from '../../../components/web/utils/custom-functions'
import { ChatType, MessageType, SOCKET } from '../../../constants'
import { NotificationService } from '../../../services/notification.service'
import { messageEncryptionService } from '../../../services/message-encryption.service'
import { socket } from '../../../services/socket-setup'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { removeChannelMember } from '../../../store/slices/channelSlice'
import {
  addNewChat,
  deleteMessage,
  editMessage,
  markChatAsRead,
  muteChat,
  removeChannelFromChats,
  selectChat,
  setSelectedChatMessages,
  togglePinChat,
  unmuteChat,
  updateChannelMembers,
  updateChatDndState,
  updateChatOnNewMessage,
  updateMemberStatusInChats,
  updateMessageFavoriteState,
  updateMessagePinStateWithData,
  updateMessageReactions,
  updateMessageStatus,
} from '../../../store/slices/chatSlice'
import { updateDndState, updateMemberRoleLocal } from '../../../store/slices/teamSlice'
import { updateMultipleUserStatus, updateUserStatus } from '../../../store/slices/userStatusSlice'
import Store from '../../../store/store'
import { ExtendedChatItem } from '../../../types'
import { Message, Reaction } from '../../../types/common'
import { isChatMuted } from '../../../utils/mute-utils'
import {
  DeletedMessagePayload,
  FavoriteMessagePayload,
  getMessagePreviewText,
  getNotificationIcon,
  PinMessagePayload,
  UpdatedMessagePayload,
} from '../utils/notificationUtils'

type ChatPinUpdatePayload = {
  id: string | number
  type: ChatType | string
  pin?: boolean | string | number
  pinned?: boolean | string | number
  isPinned?: boolean | string | number
  is_pinned?: boolean | string | number
}

type ChatMuteUpdatePayload = {
  target_id: string | number
  target_type: ChatType | string
  muted_until?: string | null
  duration?: string | null
  mutedUntil?: string | null
}

export const useSocketHandlers = () => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((store) => store.auth)
  const { userTeamData } = useAppSelector((store) => store.team)
  const { selectedChatMessages, selectedChat } = useAppSelector((store) => store.chat)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return

    const handleReceiveMessage = (newMessage: Message) => {
      const currentState = Store.getState().chat
      const teamState = Store.getState().team
      const currentSections = currentState?.selectedChatMessages || []
      const currentSelectedChat = currentState?.selectedChat
      const currentUserId = user?.id

      if (!currentUserId) return

      let shouldNotify = false
      let isMessageForCurrentChat = false
      let isMessageForUser = false

      let chatType: ChatType.DM | ChatType.Channel
      let chatId: string
      if (newMessage.channel_id) {
        chatType = ChatType.Channel
        chatId = newMessage.channel_id
      } else {
        chatType = ChatType.DM
        chatId = newMessage.recipient_id === currentUserId ? newMessage.sender_id : newMessage.recipient_id
      }
      const queryKey = ['messages', chatId, chatType]

      queryClient.setQueryData(
        queryKey,
        (oldData: InfiniteData<{ messages: Message[]; nextOffset: number; hasMore: boolean }> | undefined) => {
          if (!oldData) return oldData

          const newPages = oldData.pages.map((page, index) => {
            if (index === oldData.pages.length - 1) {
              const currentMessages = currentSections.flatMap((section) => section.messages)
              const currentMessageMap = new Map(currentMessages.map((msg) => [msg.id.toString(), msg]))

              const updatedMessages = page.messages.map((msg) => {
                const reduxMessage = currentMessageMap.get(msg.id.toString())
                if (reduxMessage) {
                  return {
                    ...msg,
                    ...reduxMessage,
                    id: msg.id,
                    created_at: msg.created_at,
                    updated_at: reduxMessage.updated_at || msg.updated_at,
                  }
                }
                return msg
              })

              const messageExists = updatedMessages.some((msg) => msg.id.toString() === newMessage.id.toString())

              if (messageExists) {
                return {
                  ...page,
                  messages: updatedMessages,
                }
              } else {
                return {
                  ...page,
                  messages: [
                    ...updatedMessages,
                    {
                      ...newMessage,
                      statuses: newMessage.statuses || [],
                      reactions: newMessage.reactions || [],
                      isPinned: newMessage.isPinned || false,
                      isFavorite: newMessage.isFavorite || false,
                    },
                  ],
                }
              }
            }
            return page
          })

          return {
            ...oldData,
            pages: newPages,
          }
        },
      )

      if (
        newMessage.recipient_id === currentUserId ||
        (newMessage.channel_id && newMessage.sender_id !== currentUserId)
      ) {
        socket.emit(SOCKET.Emitters.Message_Delivered, {
          messageId: newMessage.id,
          senderId: newMessage.sender_id,
        })
      }

      if (newMessage.channel_id && currentSelectedChat?.type === ChatType.Channel) {
        isMessageForCurrentChat = newMessage.channel_id === currentSelectedChat.id
        isMessageForUser = true
      } else if (!newMessage.channel_id || newMessage?.type === ChatType.DM) {
        isMessageForCurrentChat =
          currentSelectedChat?.type === ChatType.DM &&
          ((newMessage.sender_id === currentSelectedChat.id && newMessage.recipient_id === currentUserId) ||
            (newMessage.sender_id === currentUserId && newMessage.recipient_id === currentSelectedChat.id))
        isMessageForUser = newMessage.recipient_id === currentUserId
      }

      shouldNotify =
        !teamState.userTeamData.do_not_disturb && isMessageForUser && newMessage.sender_id !== currentUserId

      if (newMessage.message_type === MessageType.Call) {
        shouldNotify = false
      }

      if (shouldNotify) {
        const chatId = newMessage.channel_id || newMessage.sender_id
        const chatType = newMessage.channel_id ? ChatType.Channel : ChatType.DM
        const mutedChats = currentState?.mutedChats || {}

        if (isChatMuted(mutedChats, chatId, chatType)) {
          shouldNotify = false
        }
      }

      if (isMessageForCurrentChat) {
        const messageWithCompleteData = {
          ...newMessage,
          statuses: newMessage.statuses || [],
          reactions: newMessage.reactions || [],
          isPinned: newMessage.isPinned || false,
          isFavorite: newMessage.isFavorite || false,
        }

        const messageDate = new Date(messageWithCompleteData.created_at)
        const lastSection = currentSections[currentSections.length - 1]
        const lastMessageDate = lastSection?.messages?.length
          ? new Date(lastSection.messages[lastSection.messages.length - 1].created_at)
          : null

        const shouldCreateNewSection = !lastMessageDate || !isSameDay(messageDate, lastMessageDate)

        let updatedSections = [...currentSections]

        if (shouldCreateNewSection) {
          const sectionLabel = getSectionLabel(messageDate)
          updatedSections = [
            ...currentSections,
            {
              label: sectionLabel,
              messages: [messageWithCompleteData],
            },
          ]
        } else {
          updatedSections = updatedSections.map((section, index) => {
            if (index === updatedSections.length - 1) {
              return {
                ...section,
                messages: [...section.messages, messageWithCompleteData],
              }
            }
            return section
          })
        }

        dispatch(setSelectedChatMessages(updatedSections))
      }

      if (shouldNotify) {
        const isWindowVisible = document.visibilityState === 'visible'
        
        // Calculate total unread count (including the new message that hasn't been counted yet)
        const totalUnreadCount =
          Object.values(currentState.unreadCounts || {}).reduce(
            (sum: number, count: unknown) => sum + (typeof count === 'number' ? count : 0),
            0,
          ) + 1 // Add 1 for the new message
        
        // Get sender/channel name
        const senderName = newMessage.sender?.name || 'Someone'
        const notificationTitle = newMessage.channel_id
          ? currentState.allChats.find((c) => c.id.toString() === chatId.toString() && c.type === chatType)?.name || 'Channel'
          : senderName
        
        // Get message preview text (handles all message types including those without content)
        // Decrypt message content for notifications and browser title
        const decryptContent = (content: string | null | undefined): string => {
          if (!content) return ''
          try {
            return messageEncryptionService.decryptMessage(content)
          } catch (error) {
            console.error('Error decrypting message content for notification:', error)
            return content
          }
        }
        const messagePreview = getMessagePreviewText(newMessage, decryptContent)
        
        if (!isWindowVisible) {
          NotificationService.playSound()
          const notificationIcon = getNotificationIcon(newMessage.sender)
          const chat = currentState.allChats.find((c) => c.id.toString() === chatId.toString() && c.type === chatType)
          NotificationService.showBrowserNotification(notificationTitle, {
            body: messagePreview.substring(0, 30),
            icon: notificationIcon,
            currentSelectedChat: chat,
          })
          // Also start tab highlight with notification data
          NotificationService.startTabHighlight(totalUnreadCount, notificationTitle, messagePreview)
        } else {
          if (document.hidden) {
            NotificationService.startTabHighlight(totalUnreadCount, notificationTitle, messagePreview)
          }
        }
      }

      dispatch(
        updateChatOnNewMessage({
          ...newMessage,
          currentUserId,
        }),
      )
    }
    const handleUserStatusUpdate = ({
      userId,
      status,
      lastSeen,
    }: {
      userId: string
      status: string
      lastSeen?: string
    }) => {
      if (!userId || !status) {
        console.warn('Invalid user status update:', { userId, status, lastSeen })
        return
      }
      dispatch(updateUserStatus({ userId, status, lastSeen }))
    }

    const handleUnmuteChat = ({ target_id, target_type }: { target_id: string | number; target_type: string }) => {
      if (!target_id || !target_type) return
      dispatch(
        unmuteChat({
          target_id,
          target_type,
        }),
      )
    }

    const handleMuteChat = (data: ChatMuteUpdatePayload) => {
      if (!data.target_id || !data.target_type) return
      const mutedUntil = data.muted_until ?? data.mutedUntil ?? null
      const duration = data.duration ?? null

      dispatch(
        muteChat({
          target_id: data.target_id,
          target_type: data.target_type,
          muted_until: mutedUntil ?? '',
          duration: duration ?? '',
        }),
      )
    }

    const handleBulkUserStatusUpdate = (users: Array<{ userId: string; status: string; lastSeen?: string }>) => {
      if (!Array.isArray(users) || users.some((u) => !u.userId || !u.status)) {
        console.warn('Invalid bulk user status update:', users)
        return
      }
      dispatch(updateMultipleUserStatus(users))
    }

    // Channel handling
    const handleChannelAdded = (channel: any) => {
      dispatch(
        addNewChat({
          type: ChatType.Channel,
          id: channel.id,
          name: channel.name,
          profile_color: channel.profile_color,
          latest_message_at: new Date().toISOString(),
          pinned: false,
          last_message: null,
        }),
      )
      socket.emit('join-channel', channel.id)
    }

    const handleChannelDeleted = (deletedChannel: DeletedMessagePayload) => {
      dispatch(removeChannelFromChats({ channelId: deletedChannel.id }))
    }

    const handleMembersAdded = ({ channelId, newMemberIds }: { channelId: string; newMemberIds: string[] }) => {
      dispatch(updateChannelMembers({ channelId, memberIds: newMemberIds ?? [] }))
    }

    const handleMemberLeftChannel = ({ channelId, userId }: { channelId: string; userId: string }) => {
      // If the current user left, remove the channel from their sidebar
      if (userId === user?.id) {
        dispatch(removeChannelFromChats({ channelId }))
        // If the user was viewing this channel, clear the selected chat
        if (selectedChat?.id === channelId) {
          dispatch(selectChat(null as unknown as ExtendedChatItem))
        }
      } else {
        // If another user left, update the channel member list
        dispatch(removeChannelMember(userId))
      }
    }

    const handleUpdateMessageUpdate = ({
      messageId,
      status,
      userId,
    }: {
      messageId: string
      status: string
      userId: string
    }) => {
      dispatch(
        updateMessageStatus({
          messageId: messageId,
          userId: userId,
          status: status,
        }),
      )

      if (status === 'seen') {
        const currentState = Store.getState().chat
        const messageChat = currentState.allChats.find((chat) => {
          if (chat.last_message?.id?.toString() === messageId) {
            return true
          }
          return false
        })

        if (messageChat) {
          const chatKey = `${messageChat.type}_${messageChat.id}`
          const currentUnreadCount = currentState.unreadCounts[chatKey] || 0

          if (userId === user?.id && currentUnreadCount > 0) {
            dispatch(
              markChatAsRead({
                chatId: messageChat.id,
                type: messageChat.type,
              }),
            )
          }
        }
      }
    }

    const handleMessageDeleted = (
      data: DeletedMessagePayload & { newPrevMessage?: Message; hasUnreadMentions?: boolean; wasUnread?: boolean },
    ) => {
      dispatch(
        deleteMessage({
          messageId: data.messageId || data.id,
          newPrevMessage: data.newPrevMessage,
          deletedMessage: data.deletedMessage,
          hasUnreadMentions: data.hasUnreadMentions,
          wasUnread: data.wasUnread,
        }),
      )

      const currentUserId = user?.id
      if (!currentUserId) return

      let chatType: ChatType.DM | 'channel'
      let chatId: string | number | undefined
      if (data.channel_id) {
        chatType = ChatType.Channel
        chatId = data.channel_id
      } else {
        chatType = ChatType.DM
        chatId = data.recipient_id === currentUserId ? data.sender_id : data.recipient_id
      }
      const queryKey = ['messages', chatId, chatType]
      const messageIdStr = (data.messageId || data.id).toString()

      queryClient.setQueryData(
        queryKey,
        (oldData: InfiniteData<{ messages: Message[]; nextOffset: number; hasMore: boolean }> | undefined) => {
          if (!oldData) return oldData

          const newPages = oldData.pages.map((page) => {
            const updatedMessages = page.messages.filter((msg) => msg.id.toString() !== messageIdStr)
            return {
              ...page,
              messages: updatedMessages,
            }
          })

          return {
            ...oldData,
            pages: newPages,
          }
        },
      )
    }

    const handleMessageUpdated = (updatedMessage: UpdatedMessagePayload) => {
      dispatch(editMessage(updatedMessage))
    }

    const handleMessagePinState = (pinMessage: PinMessagePayload) => {
      dispatch(updateMessagePinStateWithData({ messageId: pinMessage.message_id, pinned: pinMessage.isPinned }))
    }

    const handleMessageFavoriteState = (favoriteMessage: FavoriteMessagePayload) => {
      dispatch(
        updateMessageFavoriteState({
          messageId: favoriteMessage.message_id,
          isFavorite: favoriteMessage.isFavorite,
        }),
      )
    }
    const handlepinUpinChat = (data: ChatPinUpdatePayload) => {
      const rawPinned = data.pin ?? data.pinned ?? data.isPinned ?? data.is_pinned
      const normalizedPinned =
        typeof rawPinned === 'string'
          ? rawPinned === 'true' || rawPinned === '1'
          : rawPinned !== undefined
            ? Boolean(rawPinned)
            : false

      dispatch(
        togglePinChat({
          id: data.id,
          type: data.type,
          pinned: normalizedPinned,
        }),
      )
    }
    const handleMessageReactionUpdated = (data: { message_id: string; reactions: Reaction[] }) => {
      dispatch(updateMessageReactions({ messageId: data.message_id, reactions: data.reactions }))
    }

    // DND updates
    const handleDndStatusUpdated = ({
      userId,
      teamId,
      do_not_disturb,
      do_not_disturb_until,
    }: {
      userId: string | number
      teamId: string | number
      do_not_disturb: boolean
      do_not_disturb_until: string | null
    }) => {
      dispatch(updateDndState({ userId, teamId, do_not_disturb, do_not_disturb_until }))
      dispatch(updateChatDndState({ userId, teamId, do_not_disturb, do_not_disturb_until }))
    }

    // Member status/role updates
    const handleMemberStatusUpdated = ({
      user_id,
      status,
      role,
    }: {
      user_id: string | number
      status?: string
      role?: string
    }) => {
      if (role && user?.id && String(user.id) === String(user_id)) {
        dispatch(updateMemberRoleLocal({ userId: user_id, role: role }))
      }

      dispatch(
        updateMemberStatusInChats({
          user_id,
          status: status,
          role: role,
        }),
      )
    }

    socket.on(SOCKET.Listeners.Message_Status_Updated, handleUpdateMessageUpdate)
    socket.on(SOCKET.Listeners.Chat_Pin_Updated, handlepinUpinChat)
    socket.on(SOCKET.Listeners.Chat_Muted, handleMuteChat)
    socket.on(SOCKET.Listeners.Chat_Unmuted, handleUnmuteChat)
    socket.on(SOCKET.Listeners.User_Status_Update, handleUserStatusUpdate)
    socket.on(SOCKET.Listeners.Bulk_Status_Update, handleBulkUserStatusUpdate)
    socket.on(SOCKET.Listeners.Message_Favorite, handleMessageFavoriteState)
    socket.on(SOCKET.Listeners.Message_Pin, handleMessagePinState)
    socket.on(SOCKET.Listeners.Message_Updated, handleMessageUpdated)
    socket.on(SOCKET.Listeners.Receive_Message, handleReceiveMessage)
    socket.on(SOCKET.Listeners.Message_Deleted, handleMessageDeleted)
    socket.on(SOCKET.Listeners.Channel_Deleted, handleChannelDeleted)
    socket.on(SOCKET.Listeners.Channel_Added, handleChannelAdded)
    socket.on(SOCKET.Listeners.New_Channel, handleChannelAdded)
    socket.on(SOCKET.Listeners.Members_Added, handleMembersAdded)
    socket.on('member-left-channel', handleMemberLeftChannel)
    socket.on(SOCKET.Listeners.Message_Reaction_Updated, handleMessageReactionUpdated)
    socket.on(SOCKET.Listeners.Do_Not_Disturb_Updated, handleDndStatusUpdated)
    socket.on(SOCKET.Listeners.Member_Status_Updated, handleMemberStatusUpdated)

    return () => {
      socket.off(SOCKET.Listeners.Message_Favorite, handleMessageFavoriteState)
      socket.off(SOCKET.Listeners.Chat_Pin_Updated, handlepinUpinChat)
      socket.off(SOCKET.Listeners.Chat_Muted, handleMuteChat)
      socket.off(SOCKET.Listeners.Chat_Unmuted, handleUnmuteChat)
      socket.off(SOCKET.Listeners.Receive_Message, handleReceiveMessage)
      socket.off(SOCKET.Listeners.User_Status_Update, handleUserStatusUpdate)
      socket.off(SOCKET.Listeners.Bulk_Status_Update, handleBulkUserStatusUpdate)
      socket.off(SOCKET.Listeners.New_Channel, handleChannelAdded)
      socket.off(SOCKET.Listeners.Channel_Added, handleChannelAdded)
      socket.off(SOCKET.Listeners.Channel_Deleted, handleChannelDeleted)
      socket.off(SOCKET.Listeners.Members_Added, handleMembersAdded)
      socket.off('member-left-channel', handleMemberLeftChannel)
      socket.off(SOCKET.Listeners.Message_Status_Updated, handleUpdateMessageUpdate)
      socket.off(SOCKET.Listeners.Message_Deleted, handleMessageDeleted)
      socket.off(SOCKET.Listeners.Message_Updated, handleMessageUpdated)
      socket.off(SOCKET.Listeners.Message_Pin, handleMessagePinState)
      socket.off(SOCKET.Listeners.Message_Reaction_Updated, handleMessageReactionUpdated)
      socket.off(SOCKET.Listeners.Do_Not_Disturb_Updated, handleDndStatusUpdated)
      socket.off(SOCKET.Listeners.Member_Status_Updated, handleMemberStatusUpdated)
    }
  }, [dispatch, user, userTeamData, selectedChatMessages, selectedChat, queryClient])
}
