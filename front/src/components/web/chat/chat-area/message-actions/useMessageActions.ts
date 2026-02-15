import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mutations, queries } from '../../../../../api'
import { ChannelRole, ChatType, MessageType } from '../../../../../constants'
import { messageEncryptionService } from '../../../../../services/message-encryption.service'
import { useAppSelector } from '../../../../../store/hooks'
import { MessagePayload } from '../../../../../types'
import { Message } from '../../../../../types/common'
import { toaster } from '../../../../../utils/custom-functions'
import { extractAsHTML, extractFormattedText } from '../../../utils/custom-functions'

export const useMessageActions = (message: Message) => {
  const { t } = useTranslation()
  const { user } = useAppSelector((store) => store.auth)
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { currentUserRole } = useAppSelector((store) => store.channel)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [forwardModalOpen, setForwardModalOpen] = useState(false)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const { mutate: deleteMutate, isPending } = mutations.useDeleteMessage()
  const { mutate: pinMessage } = mutations.usePinMessage()
  const { mutate: unpinMessage } = mutations.useUnpinMessage()
  const { mutate: favoriteMessage } = mutations.useFavoriteMessage()
  const { mutate: unfavoriteMessage } = mutations.useUnfavoriteMessage()
  const { mutate: addReaction } = mutations.useAddReaction()
  const { mutate: removeReaction } = mutations.useRemoveReaction()
  const { mutate } = mutations.useStartConversation()
  const { data: e2eStatus } = queries.useGetE2EStatus()
  const isE2EEnabled = e2eStatus?.e2e_enabled || false
  const { data: senderKeyData } = queries.useGetUserPublicKey(
    message.sender.id,
    { enabled: isE2EEnabled && !!message.sender.id }
  )
  const { data: myKeyData } = queries.useGetMyPublicKey()
  const hasEncryptionKey = isE2EEnabled && myKeyData?.public_key && myKeyData.public_key.length > 0

  const isMyMessage = message.sender_id === user.id
  const isMe = user.id === message?.sender_id

  const canEdit = useCallback(() => {
    if (!isMyMessage) return false
    if (
      [
        MessageType.File,
        MessageType.Image,
        MessageType.System,
        MessageType.Video,
        MessageType.Call,
        MessageType.Audio,
        MessageType.Reminder,
        MessageType.Location,
      ].includes(message.message_type)
    )
      return false
    return true
  }, [isMyMessage, message.message_type])

  const canDelete = useCallback(() => {
    if ([MessageType.System, MessageType.Reminder].includes(message.message_type)) return false
    if (isMyMessage) return true
    if (selectedChat.type === ChatType.Channel && currentUserRole === ChannelRole.Admin) return true
    return false
  }, [message.message_type, isMyMessage, selectedChat.type, currentUserRole])

  const canCopy = useCallback(() => {
    if (
      [
        MessageType.File,
        MessageType.Image,
        MessageType.Audio,
        MessageType.Video,
        MessageType.Sticker,
        MessageType.Call,
        MessageType.Location,
      ].includes(message.message_type)
    )
      return false
    return true
  }, [message.message_type])

  const canForward = useCallback(() => {
    return message.message_type !== MessageType.Call
  }, [message.message_type])

  const canReact = useCallback(() => {
    return ![MessageType.Call, MessageType.Reminder, MessageType.Location].includes(message.message_type)
  }, [message.message_type])

  const canPin = useCallback(() => {
    return ![MessageType.Location].includes(message.message_type)
  }, [message.message_type])

  const canFavorite = useCallback(() => {
    return ![MessageType.Location].includes(message.message_type)
  }, [message.message_type])

  const canSeeReadBy = useCallback(() => selectedChat?.type === ChatType.Channel && isMe, [selectedChat?.type, isMe])

  const permissions = useMemo(
    () => ({
      canEdit: canEdit(),
      canDelete: canDelete(),
      canCopy: canCopy(),
      canForward: canForward(),
      canReact: canReact(),
      canPin: canPin(),
      canFavorite: canFavorite(),
      canSeeReadBy: canSeeReadBy(),
    }),
    [canEdit, canDelete, canCopy, canForward, canReact, canPin, canFavorite, canSeeReadBy],
  )

  const handleCopy = async () => {
    try {
      // Decrypt message content before copying if E2E is enabled
      let contentToCopy = message.content
      if (isE2EEnabled && message.content) {
        try {
          contentToCopy = messageEncryptionService.decryptMessage(
            message.content,
            senderKeyData?.public_key || null
          )
        } catch (error) {
          console.error('Error decrypting message for copy:', error)
          contentToCopy = message.content
        }
      }

      const plainText = extractFormattedText(contentToCopy)
      const htmlContent = extractAsHTML(contentToCopy)

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(plainText)
      }
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      toaster('error', t('copy_failed'))
    }
  }

  const handleReaction = (emoji: { emoji: string }) => {
    const emojiString = emoji.emoji
    const reaction = message.reactions?.find((r) => r.emoji === emojiString)
    const userReacted = reaction?.users?.some((u) => String(u) === String(user.id)) || false
    userReacted
      ? removeReaction({ message_id: Number(message.id), emoji: emojiString })
      : addReaction({ message_id: Number(message.id), emoji: { emoji: emojiString } })
  }

  const handlePinToggle = () => {
    if (!message?.id) return
    message.isPinned ? unpinMessage({ message_id: message.id }) : pinMessage({ message_id: message.id })
  }

  const handleFavoriteToggle = () => {
    if (!message?.id) return
    message.isFavorite ? unfavoriteMessage({ message_id: message.id }) : favoriteMessage({ message_id: message.id })
  }

  const handleDelete = () => {
    if (!message?.id) return
    deleteMutate(
      { id: message.id },
      {
        onSuccess: () => setConfirmDeleteOpen(false),
        onError: () => toaster('error', t('message_cannot_be_deleted')),
      },
    )
  }

  const handleForward = async (selectedItems: { id: string; type: ChatType.DM | ChatType.Channel }[]) => {
    if (!selectedMessage || !user?.id) return

    try {
      // Decrypt message content before forwarding if E2E is enabled
      let decryptedContent = selectedMessage.content?.trim() || ''
      if (isE2EEnabled && selectedMessage.content) {
        try {
          decryptedContent = messageEncryptionService.decryptMessage(
            selectedMessage.content,
            senderKeyData?.public_key || null
          )
        } catch (error) {
          console.error('Error decrypting message for forward:', error)
          // Continue with encrypted content if decryption fails
          decryptedContent = selectedMessage.content
        }
      }

      await Promise.all(
        selectedItems.map(async (item) => {
          // Parse metadata if it's a string
          let parsedMetadata = selectedMessage.metadata
          if (typeof parsedMetadata === 'string') {
            try {
              parsedMetadata = JSON.parse(parsedMetadata)
            } catch (e) {
              console.error('Failed to parse metadata for forwarding:', e)
              parsedMetadata = {}
            }
          }
          
          // Ensure metadata is an object
          if (!parsedMetadata || typeof parsedMetadata !== 'object') {
            parsedMetadata = {}
          }

          // Re-encrypt the decrypted content for the new recipient
          const contentToSend = hasEncryptionKey ? messageEncryptionService.encryptMessage(decryptedContent) : decryptedContent

          const payload: MessagePayload = {
            channel_id: item.type === ChatType.Channel ? Number(item.id) : null,
            recipient_id: item.type === ChatType.DM ? Number(item.id) : null,
            content: contentToSend,
            message_type: selectedMessage.message_type || 'text',
            file_url: selectedMessage.file_url || null,
            file_type: selectedMessage.file_type || null,
            metadata: {
              ...parsedMetadata,
              forwarded: true,
              original_sender: selectedMessage.sender,
              original_message_id: selectedMessage.id,
            },
            parent_id: null,
            sender_id: user.id,
            statuses: [],
          }
          mutate(payload)
        }),
      )

      setForwardModalOpen(false)
      setSelectedMessage(null)
    } catch (error) {
      console.error('Error forwarding message:', error)
    }
  }

  return {
    permissions,
    copyStatus,
    isPending,
    confirmDeleteOpen,
    forwardModalOpen,
    infoModalOpen,
    selectedMessage,
    setSelectedMessage,
    setConfirmDeleteOpen,
    setForwardModalOpen,
    setInfoModalOpen,
    handleCopy,
    handleReaction,
    handlePinToggle,
    handleFavoriteToggle,
    handleDelete,
    handleForward,
  }
}
