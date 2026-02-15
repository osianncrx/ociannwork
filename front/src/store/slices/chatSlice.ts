import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ChatType, STORAGE_KEYS, UserTeamStatus } from '../../constants'
import { ChatSliceType, ExtendedChatItem } from '../../types'
import { Message, Reaction } from '../../types/common'
import { getStorage, stringify } from '../../utils'

const storage = getStorage()

const initialState: ChatSliceType = {
  selectedChat: storage.getItem(STORAGE_KEYS.SELECTED_CHAT) || null,
  allChats: [],
  allTeamMembers: [],
  selectedChatMessages: [],
  selectedPinMessages: [],
  selectedFavMessages: [],
  unreadCounts: {},
  lastReadTimestamps: {},
  targetMessageId: null,
  hasUnreadMentions: {},
  mutedChats: {},
  currentCallStatus: '',
  callParticipants: { participants: [], channelId: null, chatType: '' },
  isMultiSelectMode: false,
  selectedMessageIds: [],
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setAllChats: (state, action: PayloadAction<ExtendedChatItem[]>) => {
      const newChats = action.payload
      if (stringify(state.allChats) === stringify(newChats)) {
        return
      }

      state.allChats = newChats.map((chat) => {
        const chatKey = `${chat.type}_${chat.id}`
        if (typeof chat.unread_count !== 'undefined') {
          state.unreadCounts[chatKey] = chat.unread_count
        }
        if (typeof chat.has_unread_mentions !== 'undefined') {
          state.hasUnreadMentions[chatKey] = chat.has_unread_mentions
        }
        if (chat.is_muted && chat.muted_until && chat.mute_duration) {
          state.mutedChats[chatKey] = {
            muted_until: chat.muted_until,
            duration: chat.mute_duration,
          }
        }
        return chat
      })
    },
    setChatLastMessage: (state, action) => {
      const { id, type, lastMessage } = action.payload
      const chatIndex = state.allChats.findIndex((chat) => chat.id === id && chat.type === type)
      if (chatIndex !== -1) {
        state.allChats[chatIndex].last_message = lastMessage
        state.allChats[chatIndex].latest_message_at = lastMessage?.created_at || null
      }
    },
    setAllTeamMembers: (state, action) => {
      state.allTeamMembers = action.payload
    },
    selectChat: (state, action: PayloadAction<ExtendedChatItem>) => {
      state.selectedChat = action.payload
      if (action.payload) {
        storage.setItem(STORAGE_KEYS.SELECTED_CHAT, action.payload)
      } else {
        storage.removeItem(STORAGE_KEYS.SELECTED_CHAT)
      }
    },
    setSelectedChatMessages: (state, action) => {
      const newMessages = action.payload
      if (stringify(state.selectedChatMessages) === stringify(newMessages)) {
        return
      }
      state.selectedChatMessages = newMessages
    },
    setSelectedPinMessages: (state, action) => {
      const newMessages = action.payload
      state.selectedPinMessages = newMessages
    },
    setSelectedFavMessages: (state, action) => {
      const newMessages = action.payload
      state.selectedFavMessages = newMessages
    },
    addNewChat: (state, action: PayloadAction<ExtendedChatItem>) => {
      const newChat = action.payload
      const exists = state.allChats.find((chat) => chat.id === newChat.id && chat.type === newChat.type)
      if (!exists) {
        const firstUnpinnedIndex = state.allChats.findIndex((chat) => !chat.pinned)
        if (firstUnpinnedIndex === -1) {
          state.allChats.push(newChat)
        } else {
          state.allChats.splice(firstUnpinnedIndex, 0, newChat)
        }
        const chatKey = `${newChat.type}_${newChat.id}`
        if (typeof newChat.unread_count !== 'undefined') {
          state.unreadCounts[chatKey] = newChat.unread_count
        } else {
          state.unreadCounts[chatKey] = 0
        }
        if (typeof newChat.has_unread_mentions !== 'undefined') {
          state.hasUnreadMentions[chatKey] = newChat.has_unread_mentions
        } else {
          state.hasUnreadMentions[chatKey] = false
        }
      }
    },
    updateChatOnNewMessage: (state, action) => {
      const newMessage = action.payload
      const isChannel = !!newMessage.channel_id
      const currentUserId = newMessage?.currentUserId

      const isFromCurrentUser = newMessage.sender_id === currentUserId

      if (!isFromCurrentUser) {
        const chatKey = isChannel ? `channel_${newMessage.channel_id}` : `dm_${newMessage.sender_id}`

        state.unreadCounts[chatKey] = (state.unreadCounts[chatKey] || 0) + 1

        const isCurrentUserMentioned =
          newMessage.mentions?.includes(currentUserId) || newMessage.mentions?.includes(String(currentUserId)) || false

        if (isCurrentUserMentioned) {
          state.hasUnreadMentions[chatKey] = true
        }

        const chatIndex = state.allChats.findIndex(
          (chat) =>
            chat.id === (isChannel ? newMessage.channel_id : newMessage.sender_id) &&
            chat.type === (isChannel ? ChatType.Channel : ChatType.DM || 'me'),
        )
        if (chatIndex !== -1) {
          state.allChats[chatIndex].unread_count = state.unreadCounts[chatKey]
        }
      }
      const chatId = isChannel
        ? newMessage.channel_id
        : newMessage.sender_id === currentUserId
          ? newMessage.recipient_id
          : newMessage.sender_id

      const chatIndex = state.allChats.findIndex(
        (chat) => chat.id === chatId && chat.type === (isChannel ? ChatType.Channel : ChatType.DM || 'me'),
      )

      if (chatIndex !== -1) {
        const chat = state.allChats[chatIndex]
        const updatedChat = {
          ...chat,
          last_message: newMessage,
          latest_message_at: newMessage.created_at || new Date().toISOString(),
          ...(!isChannel &&
            chat.id === newMessage.sender_id && {
              name: newMessage.sender?.name || chat.name,
              avatar: newMessage.sender?.avatar || chat.avatar,
              profile_color: newMessage.sender?.profiler_color || chat.profile_color,
            }),
        }

        state.allChats.splice(chatIndex, 1)
        state.allChats.unshift(updatedChat)
      } else {
        if (isChannel) {
          const newChannelChat = {
            type: ChatType.Channel,
            id: newMessage.channel_id,
            name: newMessage.channel?.name || `Channel ${newMessage.channel_id}`,
            email: null,
            avatar: newMessage.channel?.avatar || null,
            profile_color: newMessage.channel?.profiler_color || null,
            latest_message_at: newMessage.created_at || new Date().toISOString(),
            pinned: false,
            last_message: newMessage,
            members: newMessage.channel?.members || [],
            unread_count: 1,
          }
          state.allChats.unshift(newChannelChat)
          const chatKey = `channel_${newMessage.channel_id}`
          state.unreadCounts[chatKey] = 1
        } else {
          const isFromCurrentUser = newMessage.sender_id === currentUserId
          const newChat = {
            type: ChatType.DM,
            id: chatId,
            name: isFromCurrentUser
              ? newMessage.recipient?.name || `User ${newMessage.recipient_id}`
              : newMessage.sender?.name || `User ${newMessage.sender_id}`,
            email: isFromCurrentUser ? newMessage.recipient?.email || null : newMessage.sender?.email || null,
            avatar: isFromCurrentUser ? newMessage.recipient?.avatar || null : newMessage.sender?.avatar || null,
            profiler_color: isFromCurrentUser
              ? newMessage.recipient?.profiler_color || null
              : newMessage.sender?.profiler_color || null,
            latest_message_at: newMessage.created_at || new Date().toISOString(),
            pinned: false,
            last_message: newMessage,
            unread_count: isFromCurrentUser ? 0 : 1,
          }
          state.allChats.unshift(newChat)
          const chatKey = `dm_${chatId}`
          state.unreadCounts[chatKey] = isFromCurrentUser ? 0 : 1
        }
      }
    },
    updateChatName: (state, action) => {
      const { id, type, name, description } = action.payload
      const stringId = String(id) // Coerce to string

      // Update in allChats
      const chatIndex = state.allChats.findIndex((chat) => String(chat.id) === stringId && chat.type === type)
      if (chatIndex !== -1) {
        state.allChats[chatIndex].name = name
      }

      // Update selectedChat if it matches
      if (state.selectedChat && String(state.selectedChat.id) === stringId && state.selectedChat.type === type) {
        const updatedSelectedChat = {
          ...state.selectedChat,
          name: name,
          description: description,
        }
        state.selectedChat = updatedSelectedChat
        storage.setItem(STORAGE_KEYS.SELECTED_CHAT, updatedSelectedChat)
      }
    },

    togglePinChat: (state, action) => {
      const { id, type, pinned } = action.payload

      const targetId = String(id)
      const targetType = String(type)
      const normalizedPinned = Boolean(
        typeof pinned === 'string' ? pinned === 'true' || pinned === '1' : pinned,
      )

      const updatedChats = state.allChats.map((chat) =>
        String(chat.id) === targetId && String(chat.type) === targetType
          ? { ...chat, pinned: normalizedPinned }
          : chat,
      )

      state.allChats = updatedChats.sort((a, b) => {
        if (a.pinned == b.pinned) {
          return (b.latest_message_at || '').localeCompare(a.latest_message_at || '')
        }
        return a.pinned ? -1 : 1
      })

      if (
        state.selectedChat &&
        String(state.selectedChat.id) == targetId &&
        String(state.selectedChat.type) === targetType
      ) {
        state.selectedChat.pinned = normalizedPinned
        storage.setItem(STORAGE_KEYS.SELECTED_CHAT, state.selectedChat)
      }
    },

    updateChannelMembers: (state, action) => {
      const { channelId, memberIds } = action.payload
      if (!Array.isArray(memberIds) || memberIds.length === 0) return

      const channel = state.allChats.find((chat) => chat.id === channelId && chat.type === ChatType.Channel)
      if (channel) {
        if (!channel.members) {
          channel.members = []
        }
        channel.members = [...new Set([...channel.members, ...memberIds])]
      }
    },
    removeChannelFromChats: (state, action) => {
      const { channelId } = action.payload
      state.allChats = state.allChats.filter((chat) => !(chat.id === channelId))

      if (state.selectedChat?.id === channelId) {
        state.selectedChat = null
        storage.removeItem(STORAGE_KEYS.SELECTED_CHAT)
      }
    },
    updateMessageStatus: (
      state,
      action: PayloadAction<{
        messageId: string | number
        userId: string | number
        status: string
        updated_at?: string
      }>,
    ) => {
      const { messageId, userId, status, updated_at } = action.payload
      const now = new Date().toISOString()

      // Helper function to update status in a message
      const updateStatusInMessage = (message: any) => {
        if (String(message.id) !== String(messageId)) return message

        const existingStatuses = message.statuses || []
        const existingStatusIndex = existingStatuses.findIndex((s: any) => String(s.user_id) === String(userId))

        const newStatus = {
          user_id: userId,
          status,
          updated_at: updated_at || now,
        }

        let newStatuses
        if (existingStatusIndex >= 0) {
          // Update existing status
          newStatuses = [...existingStatuses]
          newStatuses[existingStatusIndex] = newStatus
        } else {
          // Add new status
          newStatuses = [...existingStatuses, newStatus]
        }

        return {
          ...message,
          statuses: newStatuses,
        }
      }

      // Update status in selected chat messages
      state.selectedChatMessages = state.selectedChatMessages.map((section) => ({
        ...section,
        messages: section.messages.map(updateStatusInMessage),
      }))

      // Update status in last_message of all chats if needed
      state.allChats = state.allChats.map((chat) => {
        if (chat.last_message && String(chat.last_message.id) === String(messageId)) {
          return {
            ...chat,
            last_message: updateStatusInMessage(chat.last_message),
          }
        }
        return chat
      })
    },
    markAllAsSeenBy: (state, action) => {
      const { readerId, channelId } = action.payload
      const now = new Date().toISOString()

      // Helper to update status for a message
      const updateMessageStatus = (message: any) => {
        if (message.sender_id === readerId) return message

        const existingStatusIndex = message.statuses?.findIndex((s: any) => s.user_id === readerId) ?? -1

        const newStatus = {
          user_id: readerId,
          status: 'seen',
          updated_at: now,
        }

        let newStatuses
        if (existingStatusIndex >= 0) {
          newStatuses = [...message.statuses]
          newStatuses[existingStatusIndex] = newStatus
        } else {
          newStatuses = [...(message.statuses || []), newStatus]
        }

        return {
          ...message,
          statuses: newStatuses,
        }
      }

      // Update selectedChatMessages if applicable
      state.selectedChatMessages = state.selectedChatMessages.map((section) => ({
        ...section,
        messages: section.messages.map(updateMessageStatus),
      }))

      // Update last_message in allChats if it matches
      state.allChats = state.allChats.map((chat) => {
        if (chat.last_message && (!channelId || chat.id === channelId)) {
          return {
            ...chat,
            last_message: updateMessageStatus(chat.last_message),
          }
        }
        return chat
      })
    },
    markChatAsRead: (state, action) => {
      const { chatId, type } = action.payload
      const chatKey = `${type}_${chatId}`

      // Update unread count to 0
      state.unreadCounts[chatKey] = 0

      // Clear mention flag when chat is marked as read
      state.hasUnreadMentions[chatKey] = false

      // Update last read timestamp
      state.lastReadTimestamps[chatKey] = new Date().toISOString()

      // If this is the currently selected chat, clear its unread count and mention state
      const chatIndex = state.allChats.findIndex((c) => c.id === chatId && c.type === type)
      if (chatIndex !== -1) {
        state.allChats[chatIndex].unread_count = 0
        state.allChats[chatIndex].has_unread_mentions = false
      }
    },
    editMessage: (state, action) => {
      const updatedMessage = action.payload

      state.selectedChatMessages = state.selectedChatMessages.map((section) => ({
        ...section,
        messages: section.messages.map((msg: Message) =>
          String(msg.id) === String(updatedMessage.id)
            ? {
                ...msg,
                ...updatedMessage,
                isEdited: updatedMessage.isEdited !== undefined ? updatedMessage.isEdited : true,
                updated_at: updatedMessage.updated_at || new Date().toISOString(),
              }
            : msg,
        ),
      }))
      state.allChats = state.allChats.map((chat) => {
        if (chat.last_message?.id && String(chat.last_message.id) === String(updatedMessage.id)) {
          return {
            ...chat,
            last_message: {
              ...chat.last_message,
              ...updatedMessage,
              isEdited: updatedMessage.isEdited !== undefined ? updatedMessage.isEdited : true,
              updated_at: updatedMessage.updated_at || new Date().toISOString(),
            },
          }
        }
        return chat
      })
    },
    deleteMessage: (state, action) => {
      const { messageId, newPrevMessage, deletedMessage, hasUnreadMentions, wasUnread } = action.payload

      // Remove deleted message ID from selectedMessageIds if it exists
      const messageIdString = String(messageId)
      const index = state.selectedMessageIds.indexOf(messageIdString)
      if (index !== -1) {
        state.selectedMessageIds.splice(index, 1)
        // If no messages are selected after deletion, exit multi-select mode
        if (state.selectedMessageIds.length === 0) {
          state.isMultiSelectMode = false
        }
      }

      state.selectedChatMessages = state.selectedChatMessages
        .map((section) => {
          const filteredMessages = section.messages.filter((msg: Message) => String(msg.id) !== String(messageId))

          if (section.label && filteredMessages.length === 0) {
            return null
          }
          return {
            ...section,
            messages: filteredMessages,
          }
        })
        .filter(Boolean)

      const chatIndex = state.allChats.findIndex(
        (chat) => chat.id === state.selectedChat?.id && chat.type === state.selectedChat?.type,
      )

      if (chatIndex !== -1) {
        if (state.allChats[chatIndex].last_message?.id?.toString() === messageId.toString()) {
          const allRemainingMessages = state.selectedChatMessages.flatMap((section) => section.messages)
          const newLastMessage = allRemainingMessages.length
            ? allRemainingMessages[allRemainingMessages.length - 1]
            : newPrevMessage

          state.allChats[chatIndex].last_message = newLastMessage
          state.allChats[chatIndex].latest_message_at = newLastMessage?.created_at || null
        }
      }

      state.allChats = state.allChats.map((chat) => {
        const chatKey = `${chat.type}_${chat.id}`
        let shouldDecrementUnread = false
        let shouldUpdateLastMessage = false

        if (chat.last_message?.id?.toString() === messageId.toString()) {
          shouldUpdateLastMessage = true
        }

        if (deletedMessage) {
          if (wasUnread !== undefined) {
            shouldDecrementUnread = wasUnread
          } else {
            const currentUserId = state.selectedChat?.id
            const isFromCurrentUser = deletedMessage.sender_id === currentUserId
            shouldDecrementUnread = !isFromCurrentUser
          }
        }

        if (shouldDecrementUnread) {
          const currentUnread = state.unreadCounts[chatKey] || 0
          const nextUnread = Math.max(0, currentUnread - 1)

          state.unreadCounts[chatKey] = nextUnread

          if (nextUnread === 0) {
            state.hasUnreadMentions[chatKey] = false
          }

          const updatedChat = { ...chat, unread_count: nextUnread }

          if (shouldUpdateLastMessage) {
            return {
              ...updatedChat,
              last_message: newPrevMessage || null,
              latest_message_at: newPrevMessage?.created_at || null,
            }
          }

          return updatedChat
        }

        if (shouldUpdateLastMessage) {
          return {
            ...chat,
            last_message: newPrevMessage || null,
            latest_message_at: newPrevMessage?.created_at || null,
          }
        }

        return chat
      })

      if (deletedMessage && hasUnreadMentions !== undefined) {
        const isChannel = !!deletedMessage.channel_id
        const deletedMessageChatKey = isChannel
          ? `channel_${deletedMessage.channel_id}`
          : `dm_${deletedMessage.sender_id}`

        state.hasUnreadMentions[deletedMessageChatKey] = hasUnreadMentions
      }
    },
    updateMessagePinStateWithData: (state, action) => {
      const { messageId, pinned, pins } = action.payload

      state.selectedChatMessages = state.selectedChatMessages.map((section) => ({
        ...section,
        messages: section.messages.map((msg: Message) => {
          if (msg.id == messageId) {
            return {
              ...msg,
              isPinned: pinned,
              pins: pinned ? pins || msg.pins || [] : [],
            }
          }
          return msg
        }),
      }))

      state.allChats = state.allChats.map((chat) => {
        if (chat.last_message?.id == messageId) {
          return {
            ...chat,
            last_message: {
              ...chat.last_message,
              isPinned: pinned,
              pins: pinned ? pins || chat.last_message?.pins || [] : [],
            },
          } as ExtendedChatItem
        }
        return chat
      })
    },

    updateMessagePinState: (state, action: PayloadAction<{ messageId: number; pinned: boolean }>) => {
      const { messageId, pinned } = action.payload

      state.selectedChatMessages = state.selectedChatMessages.map((section) => ({
        ...section,
        messages: section.messages.map((msg: Message) => (msg.id === messageId ? { ...msg, isPinned: pinned } : msg)),
      }))

      state.allChats = state.allChats.map((chat) => {
        if (chat.last_message?.id === messageId) {
          return { ...chat, last_message: { ...chat.last_message, isPinned: pinned } }
        }
        return chat
      })
    },
    updateMessageFavoriteState: (state, action: PayloadAction<{ messageId: number; isFavorite: boolean }>) => {
      const { messageId, isFavorite } = action.payload
      state.selectedChatMessages = state.selectedChatMessages.map((section) => ({
        ...section,
        messages: section.messages.map((msg: Message) =>
          msg.id === messageId ? { ...msg, isFavorite: isFavorite } : msg,
        ),
      }))

      state.allChats = state.allChats.map((chat) =>
        chat.last_message?.id === messageId
          ? { ...chat, last_message: { ...chat.last_message, isFavorite: isFavorite } }
          : chat,
      )
    },
    updateMessageReactions: (state, action: PayloadAction<{ messageId: string; reactions: Reaction[] }>) => {
      const { messageId, reactions } = action.payload
      state.selectedChatMessages = state.selectedChatMessages.map((section) => ({
        ...section,
        messages: section.messages.map((msg: Message) =>
          msg.id === messageId ? { ...msg, reactions: reactions } : msg,
        ),
      }))
    },
    updateChatDndState: (state, action) => {
      const { userId, do_not_disturb, do_not_disturb_until } = action.payload

      // Update DM chat item for the user
      state.allChats = state.allChats.map((chat) => {
        if (chat.type === ChatType.DM && String(chat.id) === String(userId)) {
          return { ...chat, do_not_disturb, do_not_disturb_until } 
        }
        return chat
      })

      // Update selectedChat if it's the same user
      if (
        state.selectedChat &&
        state.selectedChat.type === ChatType.DM &&
        String(state.selectedChat.id) === String(userId)
      ) {
        state.selectedChat = {
          ...state.selectedChat,
          do_not_disturb,
          do_not_disturb_until,
        }
        storage.setItem(STORAGE_KEYS.SELECTED_CHAT, state.selectedChat)
      }
    },
    setTargetMessageId: (state, action: PayloadAction<string | null>) => {
      state.targetMessageId = action.payload
    },
    clearTargetMessageId: (state) => {
      state.targetMessageId = null
    },
    muteChat: (
      state,
      action: PayloadAction<{ target_id: string | number; target_type: string; muted_until: string; duration: string }>,
    ) => {
      const { target_id, target_type, muted_until, duration } = action.payload
      const chatKey = `${target_type}_${target_id}`
      state.mutedChats[chatKey] = { muted_until, duration }
      if (state.selectedChat && String(state.selectedChat.id) === String(target_id)) {
        state.selectedChat = {
          ...state.selectedChat,
          is_muted: true,
          mute_duration: duration,
          muted_until: muted_until,
        }
        storage.setItem(STORAGE_KEYS.SELECTED_CHAT, state.selectedChat)
      }
    },
    unmuteChat: (state, action: PayloadAction<{ target_id: string | number; target_type: string }>) => {
      const { target_id, target_type } = action.payload
      const chatKey = `${target_type}_${target_id}`
      delete state.mutedChats[chatKey]
      if (state.selectedChat && String(state.selectedChat.id) === String(target_id)) {
        state.selectedChat = {
          ...state.selectedChat,
          is_muted: false,
          mute_duration: null,
          muted_until: null,
        }
        storage.setItem(STORAGE_KEYS.SELECTED_CHAT, state.selectedChat)
      }
    },
    setMutedChats: (state, action: PayloadAction<Record<string, { muted_until: string; duration: string }>>) => {
      state.mutedChats = action.payload
    },
    updateMemberStatusInChats: (
      state,
      action: PayloadAction<{
        user_id: string | number
        status?: UserTeamStatus.Active | UserTeamStatus.Deactivated | UserTeamStatus.Rejected | string
        role?: 'admin' | 'member' | string
      }>,
    ) => {
      const { user_id, status, role } = action.payload
      state.allChats = state.allChats.map((chat) => {
        if (chat.type === ChatType.DM && String(chat.id) === String(user_id)) {
          return {
            ...chat,
            ...(status ? { team_member_status: status, status } : {}),
            ...(role ? { role } : {}),
          } as any
        }
        return chat
      })

      // Update selected chat if it matches
      if (
        state.selectedChat &&
        state.selectedChat.type === ChatType.DM &&
        String(state.selectedChat.id) === String(user_id)
      ) {
        state.selectedChat = {
          ...state.selectedChat,
          ...(status ? { team_member_status: status, status } : {}),
          ...(role ? { role } : {}),
        }
        storage.setItem(STORAGE_KEYS.SELECTED_CHAT, state.selectedChat)
      }
    },
    setCurrentCallStatus: (state, action) => {
      state.currentCallStatus = action.payload
    },
    setCallParticipants: (state, action) => {
      state.callParticipants = action.payload
    },
    setMultiSelectMode: (state, action: PayloadAction<boolean>) => {
      state.isMultiSelectMode = action.payload
      if (!action.payload) {
        state.selectedMessageIds = []
      }
    },
    toggleMessageSelection: (state, action: PayloadAction<string>) => {
      const messageId = action.payload
      const index = state.selectedMessageIds.indexOf(messageId)
      if (index === -1) {
        state.selectedMessageIds.push(messageId)
      } else {
        state.selectedMessageIds.splice(index, 1)
      }
    },
    selectAllMessages: (state) => {
      const allMessageIds: string[] = []
      state.selectedChatMessages.forEach((section: any) => {
        section.messages.forEach((msg: any) => {
          if (msg.id) {
            allMessageIds.push(String(msg.id))
          }
        })
      })
      state.selectedMessageIds = allMessageIds
    },
    clearSelectedMessages: (state) => {
      state.selectedMessageIds = []
    },
    filterSelectedMessages: (state, action: PayloadAction<string[]>) => {
      // Filter selectedMessageIds to only include IDs that exist in validIds
      const validIds = action.payload
      state.selectedMessageIds = state.selectedMessageIds.filter((id) => validIds.includes(id))
    },
  },
})

export const {
  selectChat,
  setAllChats,
  setAllTeamMembers,
  setSelectedChatMessages,
  setSelectedPinMessages,
  setSelectedFavMessages,
  addNewChat,
  updateChatOnNewMessage,
  togglePinChat,
  updateChannelMembers,
  removeChannelFromChats,
  updateMessageStatus,
  markAllAsSeenBy,
  markChatAsRead,
  deleteMessage,
  editMessage,
  updateMessagePinState,
  updateMessageFavoriteState,
  updateMessageReactions,
  updateMessagePinStateWithData,
  updateChatName,
  updateChatDndState,
  setTargetMessageId,
  clearTargetMessageId,
  muteChat,
  unmuteChat,
  setMutedChats,
  updateMemberStatusInChats,
  setCurrentCallStatus,
  setCallParticipants,
  setMultiSelectMode,
  toggleMessageSelection,
  selectAllMessages,
  clearSelectedMessages,
  filterSelectedMessages,
} = chatSlice.actions

export default chatSlice.reducer
