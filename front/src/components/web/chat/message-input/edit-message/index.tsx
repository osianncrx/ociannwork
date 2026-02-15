import { FC, useEffect, useRef, useState } from 'react'
import { mutations, queries } from '../../../../../api'
import { messageEncryptionService } from '../../../../../services/message-encryption.service'
import { useAppSelector } from '../../../../../store/hooks'
import { EditMessageInputProps, EditorRef } from '../../../../../types'
import { safeJsonParse } from '../../../utils/custom-functions'
import Editor from '../text-editor'

const EditMessageInput: FC<EditMessageInputProps> = ({ message, onCancel, onSave }) => {
  const editorRef = useRef<EditorRef>(null)
  const { mutate: editMessage, isPending } = mutations.useEditMessage()
  const { teamSetting } = useAppSelector((store) => store.teamSetting)
  const { data: e2eStatus } = queries.useGetE2EStatus()
  const { data: senderKeyData } = queries.useGetUserPublicKey(
    message.sender.id,
    { enabled: e2eStatus?.e2e_enabled || false }
  )
  const isE2EEnabled = e2eStatus?.e2e_enabled || false

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus()

      setTimeout(() => {
        if (editorRef.current && 'setCursorToEnd' in editorRef.current) {
           (editorRef.current as any).setCursorToEnd()
        } else {
          try {
            const editableElements = document.querySelectorAll('[contenteditable="true"]')
            const editorElement = Array.from(editableElements).find((el) =>
              el.closest('.edit-message-container'),
            ) as HTMLElement

            if (editorElement) {
              const range = document.createRange()
              const selection = window.getSelection()
              const lastChild = editorElement.lastChild
              if (lastChild) {
                if (lastChild.nodeType === Node.TEXT_NODE) {
                  range.setStart(lastChild, lastChild.textContent?.length || 0)
                } else {
                  range.setStart(lastChild, lastChild.childNodes.length)
                }
                range.collapse(true)
                selection?.removeAllRanges()
                selection?.addRange(range)
              }
            }
          } catch (error) {
            console.warn('Could not position cursor at end:', error)
          }
        }
      }, 100)
    }
  }, [])

  const handleSave = ({ body }: { body: string }) => {
    const trimmedBody = body?.trim()
    if (!trimmedBody || trimmedBody.length === 0) return

    try {
      const parsedContent = safeJsonParse(body)
      const hasValidContent = parsedContent.ops?.some((op: any) => {
        if (typeof op.insert === 'string') {
          const trimmed = op.insert.trim()
          return trimmed.length > 0 && trimmed !== '\n' && trimmed !== ' '
        }
        if (typeof op.insert === 'object') {
          return op.insert.mention || op.insert.image || op.insert.video
        }
        return false
      })

      if (!hasValidContent) return
    } catch {
      if (trimmedBody.length === 0) return
    }

    // Encrypt content if E2E is enabled
    const contentToSave = isE2EEnabled ? messageEncryptionService.encryptMessage(body) : body

    editMessage(
      { message_id: message.id, content: contentToSave },
      {
        onSuccess: () => {
          onSave(body)
        },
        onError: (error) => {
          console.error('Failed to edit message:', error)
        },
      },
    )
  }

  // Decrypt message content if E2E is enabled
  const [decryptedContent, setDecryptedContent] = useState<string>(message.content || '')
  const [isDecrypting, setIsDecrypting] = useState(isE2EEnabled && !!message.content)

  useEffect(() => {
    const decrypt = async () => {
      if (!isE2EEnabled || !message.content) {
        setDecryptedContent(message.content || '')
        setIsDecrypting(false)
        return
      }

      setIsDecrypting(true)
      
      try {
        // Decrypt using sender's public key (if available) or fallback to own key
        const decrypted = messageEncryptionService.decryptMessage(
          message.content,
          senderKeyData?.public_key || null
        )
        setDecryptedContent(decrypted)
      } catch (error) {
        console.error('Error decrypting message for edit:', error)
        setDecryptedContent(message.content || '')
      } finally {
        setIsDecrypting(false)
      }
    }

    decrypt()
  }, [message.content, isE2EEnabled, senderKeyData?.public_key])

  const getInitialContent = () => {
    try {
      return safeJsonParse(decryptedContent)
    } catch {
      return [{ insert: decryptedContent }, { insert: '\n' }]
    }
  }

  // Don't render editor until decryption is complete
  if (isDecrypting) {
    return (
      <div className="edit-message-container">
        <div style={{ padding: '8px', color: '#666' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="edit-message-container">
      <Editor
        maxLength={teamSetting?.maximum_message_length}
        ref={editorRef}
        onCancel={onCancel}
        onSubmit={handleSave}
        variant="update"
        placeholder="Edit your message..."
        defaultValue={getInitialContent()}
        disabled={isPending}
        enableDraft={false}
      />
    </div>
  )
}

export default EditMessageInput
