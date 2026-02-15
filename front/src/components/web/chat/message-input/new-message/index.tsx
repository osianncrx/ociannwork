import { useEffect, useMemo, useRef, useState } from 'react'
import { mutations, queries } from '../../../../../api'
import { CHAT_CONSTANTS, ChatType, MessageType, SOCKET } from '../../../../../constants'
import { socket } from '../../../../../services/socket-setup'
import { messageEncryptionService } from '../../../../../services/message-encryption.service'
import { useAppSelector } from '../../../../../store/hooks'
import { EditorRef, MessageInputProps, MessageMetadata, MessagePayload, User } from '../../../../../types'
import { extractMentionIds, extractTextWithMentions } from '../../../../../utils'
import { getRepliedMessagePreview, safeJsonParse } from '../../../utils/custom-functions'
import Editor from '../text-editor'
import RepliedMessagePreview from './RepliedMessagePreview'
import TypingIndicator from './TypingIndicator'
import StorageLimitModal from '../../modals/StorageLimitModal'

const NewMessageInput = ({
  replyingTo,
  onCancelReply,
  scrollToBottomRef,
  dragDropFiles,
  onDragDropFilesCleared,
}: MessageInputProps) => {
  const { user } = useAppSelector((store) => store.auth)
  const { mutate } = mutations.useStartConversation()
  const { selectedChat } = useAppSelector((store) => store.chat)
  const editorRef = useRef<EditorRef>(null)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showStorageLimitModal, setShowStorageLimitModal] = useState(false)
  const [storageLimitInfo, setStorageLimitInfo] = useState<{
    currentUsageMB?: number
    maxStorageMB?: number
    message?: string
  }>({})
  const plainText = replyingTo?.content ? extractTextWithMentions(replyingTo.content) : ''

  const messagePreview = getRepliedMessagePreview(replyingTo || null, plainText)

  const { data: channelData } = queries.useGetChannelById(
    { id: selectedChat?.id },
    { enabled: selectedChat?.type === ChatType.Channel && !!selectedChat?.id },
  )

  const { data: e2eStatus } = queries.useGetE2EStatus()
  const { data: myKeyData } = queries.useGetMyPublicKey()
  const isE2EEnabled = e2eStatus?.e2e_enabled || false
  const hasEncryptionKey = isE2EEnabled && myKeyData?.public_key && myKeyData.public_key.length > 0

  const draftKey = useMemo(() => {
    if (selectedChat?.id) {
      return `draft_chat_${selectedChat?.id}`
    }
    return 'draft_general'
  }, [selectedChat?.id])

  useEffect(() => {
    if (replyingTo && editorRef.current) {
      editorRef.current.focus()
    }
  }, [replyingTo])

  useEffect(() => {
    if (dragDropFiles && dragDropFiles.length > 0 && editorRef.current) {
      editorRef.current.setDragDropFiles?.(dragDropFiles)
      if (onDragDropFilesCleared) {
        onDragDropFilesCleared()
      }
    }
  }, [dragDropFiles, onDragDropFilesCleared])

  const handleSend = async ({
    body,
    files,
    location,
  }: {
    body: string
    files?: File[]
    location?: { latitude: number; longitude: number; address: string }
  }) => {
    const hasTextContent = body && body.trim() && body !== '""' && body !== '{}'
    const hasFiles = files && files.length > 0
    const hasLocation = location !== null && location !== undefined

    if (!hasTextContent && !hasFiles && !hasLocation) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (isTyping) {
      if (selectedChat?.type === ChatType.Channel) {
        socket.emit(SOCKET.Emitters.Typing, {
          channelId: selectedChat?.id,
          userId: user?.id,
          userName: user?.name,
          isTyping: false,
        })
      } else {
        socket.emit(SOCKET.Emitters.Typing, {
          senderId: user?.id,
          recipientId: selectedChat?.id,
          userId: user?.id,
          userName: user?.name,
          isTyping: false,
        })
      }
      setIsTyping(false)
    }

    try {
      let mentionIds: string[] = []
      let messageType = MessageType.Text
      let metadata: MessageMetadata | null = null

      const urlRegex = /(https?:\/\/[^\s]+)/g
      const urls = hasTextContent ? body.match(urlRegex) : null

      if (hasTextContent) {
        const deltaContent = safeJsonParse(body)
        const members = channelData?.channel?.members || []
        mentionIds = extractMentionIds(deltaContent, members)

        if (urls && urls.length > 0 && !hasFiles && !hasLocation) {
          messageType = MessageType.Link
          metadata = { urls }
        }
      }

      if (hasLocation) {
        messageType = MessageType.Location
        metadata = {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        }
      }

      if (hasFiles && !hasLocation) {
        messageType = MessageType.File
        if (files.length === 1) {
          const file = files[0]
          const mime = file.type.toLowerCase()
          if (mime.startsWith('image/')) {
            messageType = MessageType.Image
          } else if (mime.startsWith('video/')) {
            messageType = MessageType.Video
          } else if (mime.startsWith('audio/')) {
            messageType = MessageType.Audio
          }
        }

        const formData = new FormData()
        files.forEach((file) => {
          formData.append('files', file)
        })

        formData.append('channel_id', selectedChat?.type === ChatType.Channel ? selectedChat?.id : '')
        formData.append('recipient_id', selectedChat?.type !== ChatType.Channel ? selectedChat?.id : '')

        if (hasTextContent) {
          // Encrypt content if E2E is enabled and encryption key is available
          const contentToSend = hasEncryptionKey ? messageEncryptionService.encryptMessage(body) : body
          formData.append('content', contentToSend)
          if (hasEncryptionKey && messageEncryptionService.isEncrypted(contentToSend)) {
            formData.append('is_encrypted', 'true')
          }
        }

        formData.append('message_type', messageType)

        if (hasLocation && location) {
          formData.append('metadata', JSON.stringify(metadata))
        }

        if (replyingTo?.id) {
          formData.append('parent_id', replyingTo.id.toString())
        }

        if (mentionIds.length > 0) {
          mentionIds.forEach((id) => formData.append('mentions', id))
        }

        mutate(formData as unknown as MessagePayload, {
          onSuccess: () => {
            if (editorRef.current) {
              editorRef.current.clearContent()
            }
            if (replyingTo && onCancelReply) {
              onCancelReply()
            }
            if (scrollToBottomRef?.current) {
              setTimeout(() => {
                scrollToBottomRef.current()
              }, 100)
            }
          },
          onError: (error: any) => {
            console.error('File upload failed:', error)
            
            // Check if it's a storage limit error
            if (error?.response?.data?.error === 'STORAGE_LIMIT_EXCEEDED' || 
                error?.response?.data?.message?.toLowerCase().includes('storage limit')) {
              const errorData = error?.response?.data
              setStorageLimitInfo({
                currentUsageMB: errorData?.current_usage_mb,
                maxStorageMB: errorData?.max_storage_mb,
                message: errorData?.message || 'Storage limit exceeded. Please upgrade your plan or delete some files.',
              })
              setShowStorageLimitModal(true)
            }
          },
        })
      } else {
        // Encrypt content if E2E is enabled and encryption key is available
        const contentToSend = hasTextContent && hasEncryptionKey ? messageEncryptionService.encryptMessage(body) : body
        const isEncrypted = hasEncryptionKey && messageEncryptionService.isEncrypted(contentToSend)
        
        const payload: MessagePayload = {
          channel_id: selectedChat?.type === ChatType.Channel ? selectedChat?.id : null,
          recipient_id: selectedChat?.type !== ChatType.Channel ? selectedChat?.id : null,
          content: contentToSend,
          message_type: messageType,
          file_url: null,
          file_type: null,
          metadata: metadata,
          parent_id: replyingTo?.id || null,
          sender: user as User,
          sender_id: user?.id || '',
          statuses: [],
          mentions: mentionIds,
          is_encrypted: isEncrypted || undefined,
        }

        mutate(payload, {
          onSuccess: () => {
            if (editorRef.current) {
              editorRef.current.clearContent()
            }
            if (replyingTo && onCancelReply) {
              onCancelReply()
            }
            if (scrollToBottomRef?.current) {
              setTimeout(() => {
                scrollToBottomRef.current()
              }, 100)
            }
          },
          onError: (error) => {
            console.error('Message sending failed:', error)
          },
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleTyping = () => {
    if (!selectedChat?.id || !user?.id) return

    if (!isTyping) {
      if (selectedChat.type === ChatType.Channel) {
        socket.emit(SOCKET.Emitters.Typing, {
          channelId: selectedChat.id,
          userId: user.id,
          userName: user.name,
          isTyping: true,
        })
      } else {
        socket.emit(SOCKET.Emitters.Typing, {
          senderId: user.id,
          recipientId: selectedChat.id,
          userId: user.id,
          userName: user.name,
          isTyping: true,
        })
      }
      setIsTyping(true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (selectedChat.type === ChatType.Channel) {
        socket.emit(SOCKET.Emitters.Typing, {
          channelId: selectedChat.id,
          userId: user.id,
          userName: user.name,
          isTyping: false,
        })
      } else {
        socket.emit(SOCKET.Emitters.Typing, {
          senderId: user.id,
          recipientId: selectedChat.id,
          userId: user.id,
          userName: user.name,
          isTyping: false,
        })
      }
      setIsTyping(false)
    }, CHAT_CONSTANTS.Typing_Interval)
  }

  // Stop typing when component unmounts or chat changes
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTyping && selectedChat?.id && user?.id) {
        if (selectedChat.type === ChatType.Channel) {
          socket.emit(SOCKET.Emitters.Typing, {
            channelId: selectedChat.id,
            userId: user.id,
            userName: user.name,
            isTyping: false,
          })
        } else {
          socket.emit(SOCKET.Emitters.Typing, {
            senderId: user.id,
            recipientId: selectedChat.id,
            userId: user.id,
            userName: user.name,
            isTyping: false,
          })
        }
      }
      setIsTyping(false)
    }
  }, [])

  return (
    <>
      <StorageLimitModal
        isOpen={showStorageLimitModal}
        onClose={() => setShowStorageLimitModal(false)}
        currentUsageMB={storageLimitInfo.currentUsageMB}
        maxStorageMB={storageLimitInfo.maxStorageMB}
        message={storageLimitInfo.message}
      />
      <div className="custom-typing-indicator">
        <TypingIndicator />
      </div>
      <div className="message-editor-chat-bg">
        <div className="message-editor-chat">
          {replyingTo && messagePreview && (
            <RepliedMessagePreview onCancelReply={onCancelReply} replyingTo={replyingTo} />
          )}
          <div className="message-editor">
            <Editor
              onChange={handleTyping}
              ref={editorRef}
              onCancel={() => console.log('cancelled')}
              onSubmit={handleSend}
              draftKey={draftKey}
              enableDraft={true}
              draftSaveDelay={500}
              placeholder={
                replyingTo ? `Reply to ${replyingTo.sender.name}...` : `Write a message to ${selectedChat.name}`
              }
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default NewMessageInput
