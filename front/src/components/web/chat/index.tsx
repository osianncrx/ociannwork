import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { mutations, queries, get } from '../../../api'
import { KEYS, URL_KEYS } from '../../../constants'
import { ChannelRole, ChatType, MessageType } from '../../../constants'
import { messageEncryptionService } from '../../../services/message-encryption.service'
import { SvgIcon } from '../../../shared/icons'
import { ConfirmModal } from '../../../shared/modal'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  clearTargetMessageId,
  setAllChats,
  setAllTeamMembers,
  setSelectedChatMessages,
} from '../../../store/slices/chatSlice'
import { updateDndState } from '../../../store/slices/teamSlice'
import { Message, ReplyMessage } from '../../../types/common'
import { MessagePayload } from '../../../types'
import { toaster } from '../../../utils/custom-functions'
import { usePlanFeatures } from '../../../utils/hooks'
import { mergeAndGroupMessages, mergeMessagesFromPages } from '../utils/custom-functions'
import ChatArea from './chat-area'
import NoSelectedChat from './chat-area/NoSelectedChat'
import ChatHeader from './chat-header'
import NewMessageInput from './message-input/new-message'
import DragDropWrapper from './widgets/DragDropWrapper'
import RestrictChatWrapper from './widgets/RestrictChatWrapper'
import { useMessageSelection } from './chat-area/message-actions/useMessageSelection'
import MessageSelectionActions from './chat-area/message-actions/MessageSelectionActions'
import UserSelectionModal from './modals/UserSelectionModal'

const ChatSection = () => {
  const { t } = useTranslation()
  const { data: conversationsData } = queries.useGetConversations()
  const { selectedChat, targetMessageId, selectedChatMessages } = useAppSelector((store) => store.chat)
  const { currentUserRole } = useAppSelector((store) => store.channel)
  const [editingMessage, setEditingMessage] = useState<any>(null)
  const [replyingTo, setReplyingTo] = useState<ReplyMessage | null>(null)
  const [dragDropFiles, setDragDropFiles] = useState<File[]>([])
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [forwardModalOpen, setForwardModalOpen] = useState(false)
  const { data: teamMembers } = queries.useGetTeamMembersList()
  const { sidebarToggle, isFileModalOpen } = useAppSelector((state) => state.admin_layout)
  const { userTeamData, team } = useAppSelector((state) => state.team)
  const { user } = useAppSelector((state) => state.auth)
  const { mutate: doNotDisturbMutate } = mutations.useDoNotDisturb()
  const { mutate: deleteMutate, isPending: isDeleting } = mutations.useDeleteMessage()
  const { mutate: favoriteMessage } = mutations.useFavoriteMessage()
  const { mutate: unfavoriteMessage } = mutations.useUnfavoriteMessage()
  const { mutate: startConversation } = mutations.useStartConversation()
  const { selectedMessages, isSelectionMode, clearSelection, getSelectedMessagesData } = useMessageSelection()
  const { allowsMultipleDelete } = usePlanFeatures()
  const allMessages = selectedChatMessages.flatMap((dg: any) => dg.messages || [])
  const selectedMessagesData = getSelectedMessagesData(allMessages)
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = queries.useGetMessagesInfinite(selectedChat)
  const { data: e2eStatus } = queries.useGetE2EStatus()
  const { data: myKeyData } = queries.useGetMyPublicKey()
  const queryClient = useQueryClient()
  const isE2EEnabled = e2eStatus?.e2e_enabled || false
  const hasEncryptionKey = isE2EEnabled && myKeyData?.public_key && myKeyData.public_key.length > 0

  // Initialize encryption service with user's public key when available
  // This ensures the encryption key is derived from the public key
  useEffect(() => {
    if (isE2EEnabled && myKeyData?.public_key) {
      messageEncryptionService.initializeFromPublicKey(myKeyData.public_key)
    } else if (!isE2EEnabled) {
      // Clear key when E2E is disabled
      messageEncryptionService.initializeFromPublicKey(null)
    }
  }, [myKeyData?.public_key, isE2EEnabled])

  const dispatch = useAppDispatch()
  const scrollToMessageRef = useRef<(messageId: string) => void>(() => {}) // Ref to hold scrollToMessage
  const scrollToBottomRef = useRef<() => void>(() => {})

  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  const handleEdit = (message: Message | null) => {
    if (message) {
      setEditingMessage(message)
      setReplyingTo(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
  }

  const handleReply = (message: Message) => {
    // Decrypt message content if E2E is enabled
    // For reply, we'll decrypt synchronously using sender's public key
    // The TextMessage component will handle proper decryption with sender's public key
    let contentToUse = message.content
    if (isE2EEnabled && message.content) {
      try {
        // Try to decrypt using own key first (for own messages)
        // For other's messages, will be handled by TextMessage component
        contentToUse = messageEncryptionService.decryptMessage(message.content)
      } catch (error) {
        console.error('Error decrypting message for reply:', error)
        contentToUse = message.content
      }
    }

    setReplyingTo({
      id: String(message.id),
      content: contentToUse,
      message_type: message.message_type,
      file_url: message.file_url,
      file_name: message.file_name,
      created_at: message.created_at,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        email: message.sender.email,
      },
    })
  }

  const handleDragDropFiles = (files: File[]) => {
    setDragDropFiles(files)
  }

  const handleTurnOffDnd = () => {
    doNotDisturbMutate(
      {
        value: false,
      },
      {
        onSuccess: () => {
          if (user?.id) {
            dispatch(
              updateDndState({
                userId: user?.id,
                teamId: team?.id || userTeamData?.team_id || '',
                do_not_disturb: false,
                do_not_disturb_until: null,
              }),
            )
          }
        },
      },
    )
  }

  useEffect(() => {
    if (messagesData?.pages) {
      const allMessages = mergeMessagesFromPages(messagesData.pages)
      const processedMessages = mergeAndGroupMessages(allMessages)
      dispatch(setSelectedChatMessages(processedMessages))
    }
  }, [messagesData, dispatch])

  useEffect(() => {
    if (conversationsData) {
      dispatch(setAllChats(conversationsData))
    }
    if (teamMembers) {
      dispatch(setAllTeamMembers(teamMembers))
    }
  }, [conversationsData, dispatch, teamMembers])

  useEffect(() => {
    handleCancelReply()
  }, [selectedChat])

  const isMessageLoaded = (id: string) => {
    if (!messagesData?.pages) return false
    const allMessages = mergeMessagesFromPages(messagesData.pages)
    return allMessages.some((m: Message) => String(m.id) === id)
  }

  useEffect(() => {
    if (targetMessageId && hasNextPage && !isFetchingNextPage && !isMessageLoaded(targetMessageId)) {
      fetchNextPage()
    } else if (targetMessageId && isMessageLoaded(targetMessageId) && scrollToMessageRef.current) {
      scrollToMessageRef.current(targetMessageId)
      dispatch(clearTargetMessageId())
    }
  }, [targetMessageId, messagesData, hasNextPage, isFetchingNextPage, fetchNextPage, dispatch])

  // Calculate which messages can be deleted
  const deletableMessages = useMemo(() => {
    return selectedMessagesData.filter((msg) => {
      if ([MessageType.System, MessageType.Reminder].includes(msg.message_type)) return false
      const isMyMessage = msg.sender_id === user?.id
      if (isMyMessage) return true
      // Only channel admins can delete other users' messages in channels
      if (selectedChat?.type === ChatType.Channel && currentUserRole === ChannelRole.Admin) return true
      // In DM, users cannot delete receiver's messages
      return false
    })
  }, [selectedMessagesData, user?.id, selectedChat?.type, currentUserRole])

  const canDeleteSelected = useMemo(() => {
    return deletableMessages.length > 0 && deletableMessages.length === selectedMessagesData.length
  }, [deletableMessages.length, selectedMessagesData.length])

  // Calculate favorite state
  const favoriteState = useMemo(() => {
    if (selectedMessagesData.length === 0) return { allFavorited: false, allUnfavorited: false, mixed: false }
    const favoritedCount = selectedMessagesData.filter((msg) => msg.isFavorite).length
    return {
      allFavorited: favoritedCount === selectedMessagesData.length,
      allUnfavorited: favoritedCount === 0,
      mixed: favoritedCount > 0 && favoritedCount < selectedMessagesData.length,
    }
  }, [selectedMessagesData])

  const handleBulkDelete = useCallback(() => {
    // Check if trying to delete multiple messages when feature is disabled
    // Allow single message deletion, but prevent multiple deletion
    if (selectedMessagesData.length > 1 && !allowsMultipleDelete()) {
      toaster('error', t('multiple_delete_not_available') || 'Multiple message deletion is not available in your current plan. Please upgrade to enable this feature.')
      setConfirmDeleteOpen(false)
      return
    }

    if (!canDeleteSelected || deletableMessages.length === 0) {
      toaster('error', t('message_cannot_be_deleted') || 'Message cannot be deleted')
      setConfirmDeleteOpen(false)
      return
    }

    // If some messages cannot be deleted, show an info message
    if (deletableMessages.length < selectedMessagesData.length) {
      const nonDeletableCount = selectedMessagesData.length - deletableMessages.length
      toaster('info', `${nonDeletableCount} message(s) cannot be deleted`)
    }

    setConfirmDeleteOpen(false)
    clearSelection()

    const deletePromises = deletableMessages.map((msg) => {
      return new Promise<void>((resolve, reject) => {
        deleteMutate(
          { id: msg.id },
          {
            onSuccess: () => resolve(),
            onError: () => {
              toaster('error', t('message_cannot_be_deleted') || 'Message cannot be deleted')
              reject()
            },
          },
        )
      })
    })

    Promise.allSettled(deletePromises).then(() => {
      clearSelection()
    })
  }, [canDeleteSelected, deletableMessages, selectedMessagesData.length, deleteMutate, clearSelection, t])

  const handleBulkForward = useCallback(
    async (selectedItems: { id: string; type: ChatType.DM | ChatType.Channel }[]) => {
      if (!user?.id || selectedMessagesData.length === 0) return

      // Filter out Call messages as they cannot be forwarded
      const forwardableMessages = selectedMessagesData.filter((msg) => msg.message_type !== MessageType.Call)
      
      if (forwardableMessages.length === 0) {
        toaster('error', t('call_messages_cannot_be_forwarded') || 'Call messages cannot be forwarded')
        return
      }

      if (forwardableMessages.length < selectedMessagesData.length) {
        toaster('info', `${selectedMessagesData.length - forwardableMessages.length} call message(s) cannot be forwarded`)
      }

      try {
        // Forward each selected message to each selected chat
        const forwardPromises = forwardableMessages.flatMap((message) =>
          selectedItems.map(async (item) => {
            // For E2E messages, fetch sender's public key and decrypt
            let decryptedContent = message.content?.trim() || ''
            if (isE2EEnabled && message.content) {
              try {
                const senderId = message.sender_id || message.sender?.id
                const isMyMessage = senderId === user?.id

                // For own messages, we can decrypt without sender key
                if (isMyMessage) {
                  decryptedContent = messageEncryptionService.decryptMessage(message.content, null)
                } else if (senderId) {
                  // For other users' messages, fetch sender's public key
                  // Try to get sender key from cache first
                  let senderKeyData = queryClient.getQueryData<{
                    success: boolean
                    user_id: number
                    name: string
                    public_key: string | null
                    has_encryption: boolean
                    e2e_enabled: boolean
                  }>([KEYS.E2E_USER_KEY, senderId])

                  // If not in cache, fetch it
                  if (!senderKeyData) {
                    try {
                      senderKeyData = await get<{
                        success: boolean
                        user_id: number
                        name: string
                        public_key: string | null
                        has_encryption: boolean
                        e2e_enabled: boolean
                      }>(URL_KEYS.E2E.GetUserKey.replace(':user_id', String(senderId)))
                      // Cache it for future use
                      if (senderKeyData) {
                        queryClient.setQueryData([KEYS.E2E_USER_KEY, senderId], senderKeyData)
                      }
                    } catch (error) {
                      console.error('Error fetching sender key:', error)
                    }
                  }

                  // Decrypt using sender's public key
                  decryptedContent = messageEncryptionService.decryptMessage(
                    message.content,
                    senderKeyData?.public_key || null
                  )
                }
              } catch (error) {
                console.error('Error decrypting message for forward:', error)
                // If decryption fails, use original content
                decryptedContent = message.content
              }
            }

            // Parse metadata if it's a string
            let parsedMetadata = message.metadata
            if (typeof parsedMetadata === 'string') {
              try {
                parsedMetadata = JSON.parse(parsedMetadata)
              } catch (e) {
                parsedMetadata = {}
              }
            }

            if (!parsedMetadata || typeof parsedMetadata !== 'object') {
              parsedMetadata = {}
            }

            // Re-encrypt the decrypted content for the new recipient if E2E is enabled
            const contentToSend =
              hasEncryptionKey && isE2EEnabled
                ? messageEncryptionService.encryptMessage(decryptedContent)
                : decryptedContent

            const payload: MessagePayload = {
              channel_id: item.type === ChatType.Channel ? Number(item.id) : null,
              recipient_id: item.type === ChatType.DM ? Number(item.id) : null,
              content: contentToSend,
              message_type: message.message_type || 'text',
              file_url: message.file_url || null,
              file_type: message.file_type || null,
              metadata: {
                ...parsedMetadata,
                forwarded: true,
                original_sender: message.sender,
                original_message_id: message.id,
              },
              parent_id: null,
              sender_id: user?.id,
              statuses: [],
            }

            return new Promise<void>((resolve, reject) => {
              startConversation(payload, {
                onSuccess: () => resolve(),
                onError: (error) => {
                  console.error('Error forwarding message:', error)
                  reject(error)
                },
              })
            })
          }),
        )

        await Promise.allSettled(forwardPromises)
        setForwardModalOpen(false)
        clearSelection()
        toaster('success', t('messages_forwarded_successfully') || 'Messages forwarded successfully')
      } catch (error) {
        console.error('Error forwarding messages:', error)
        toaster('error', t('error_forwarding_messages') || 'Error forwarding messages')
      }
    },
    [selectedMessagesData, user?.id, isE2EEnabled, hasEncryptionKey, startConversation, clearSelection, t],
  )

  const handleBulkStar = useCallback(() => {
    if (selectedMessagesData.length === 0) return

    // If all are favorited, unfavorite all. If all are unfavorited or mixed, favorite all.
    const shouldFavorite = !favoriteState.allFavorited

    selectedMessagesData.forEach((msg) => {
      if (shouldFavorite) {
        // Favorite all messages that are not already favorited
        if (!msg.isFavorite) {
          favoriteMessage({ message_id: msg.id })
        }
      } else {
        // Unfavorite all messages that are favorited
        if (msg.isFavorite) {
          unfavoriteMessage({ message_id: msg.id })
        }
      }
    })
    clearSelection()
  }, [selectedMessagesData, favoriteState.allFavorited, favoriteMessage, unfavoriteMessage, clearSelection])

  return selectedChat?.id ? (
    <div
      className={`messenger-right ${!sidebarToggle ? 'close-sidebar-messenger' : 'open-sidebar-messenger'} ${isFileModalOpen ? 'modal-open' : ''}`}
    >
      {userTeamData?.do_not_disturb && (
        <div className="donotdisturb">
          <SvgIcon className="common-svg-hw" iconId="dnd" />
          <span>You are on DND</span>
          <button type="button" className="btn btn-outline-danger" onClick={handleTurnOffDnd}>
            turn off
          </button>
        </div>
      )}
      <ChatHeader />
      <ChatArea
        onEdit={handleEdit}
        onReply={handleReply}
        replyingTo={replyingTo}
        onLoadMore={fetchNextPage}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
        isLoading={isLoading}
        targetMessageId={targetMessageId}
        scrollToMessageRef={scrollToMessageRef}
        scrollToBottomRef={scrollToBottomRef}
      />
      <RestrictChatWrapper selectedChat={selectedChat}>
        {isSelectionMode ? (
          <div className="select-info">
            <MessageSelectionActions
              selectedCount={selectedMessages.size}
              onClear={clearSelection}
              onDelete={() => setConfirmDeleteOpen(true)}
              onForward={() => setForwardModalOpen(true)}
              onStar={handleBulkStar}
              selectedMessages={selectedMessagesData}
              canDelete={canDeleteSelected}
            />
            <ConfirmModal
              isLoading={isDeleting}
              isOpen={confirmDeleteOpen}
              onClose={() => setConfirmDeleteOpen(false)}
              onConfirm={handleBulkDelete}
              title={`Delete ${deletableMessages?.length} ${deletableMessages?.length === 1 ? 'message' : 'messages'}?`}
              subtitle={t('action_cannot_be_undone') || 'This action cannot be undone'}
              confirmText={t('delete') || 'Delete'}
              cancelText={t('cancel') || 'Cancel'}
              variant="danger"
            />
            <UserSelectionModal
              isOpen={forwardModalOpen}
              onClose={() => setForwardModalOpen(false)}
              title={t('forward_to') || 'Forward to'}
              submitButtonText={t('forward') || 'Forward'}
              onSubmit={handleBulkForward}
              isMulti
              excludeUsers={[user?.id]}
            />
          </div>
        ) : (
          <NewMessageInput
            editingMessage={editingMessage}
            onCancelEdit={handleCancelEdit}
            replyingTo={replyingTo}
            onCancelReply={handleCancelReply}
            scrollToBottomRef={scrollToBottomRef}
            dragDropFiles={dragDropFiles}
            onDragDropFilesCleared={() => setDragDropFiles([])}
          />
        )}
      </RestrictChatWrapper>
      <DragDropWrapper onFilesSelected={handleDragDropFiles} />
    </div>
  ) : (
    <NoSelectedChat />
  )
}

export default ChatSection
