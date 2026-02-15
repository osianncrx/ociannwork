import Quill from 'quill'
import { ImageBaseUrl, ImagePath } from '../../../constants'
import { Message } from '../../../types/common'
import { getInitials } from '../../../utils'
import { getMessagePreviewText } from '../../../components/web/utils/custom-functions'

interface SenderData {
  name?: string
  first_name?: string
  avatar?: string | null
}

export interface DeletedMessagePayload {
  id: string | number
  sender_id: string | number
  recipient_id?: string | number
  channel_id?: string | number
  created_at: string
  mentions?: string[]
  newPrevMessage?: Message | null
  hasUnreadMentions?: boolean
  currentUserId?: string | number
  messageId?: string | number
  deletedMessage?: Message | null
  wasUnread?: boolean
}

export interface UpdatedMessagePayload {
  id: string | number
  content: string
  sender_id: string | number
  created_at: string
  isEdited:boolean
}

export interface PinMessagePayload {
  message_id: number
  isPinned: boolean
}

export interface FavoriteMessagePayload {
  message_id: number
  isFavorite: boolean
}

export const generateInitialsIcon = (sender: SenderData | null | undefined): string => {
  const name = sender?.name || sender?.first_name || 'Unknown'
  const initials = getInitials(name)
  const firstLetter = initials || name.charAt(0).toUpperCase()

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return `${ImagePath}/layout/1.png`
  }

  canvas.width = 64
  canvas.height = 64

  const gradient = ctx.createLinearGradient(0, 0, 64, 64)
  gradient.addColorStop(0, '#007bff')
  gradient.addColorStop(1, '#0056b3')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = 'white'
  ctx.font = 'bold 20px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(firstLetter, 32, 32)

  return canvas.toDataURL()
}

export const getNotificationIcon = (sender: SenderData | null | undefined): string => {
  const imageSrc = typeof sender?.avatar === 'string' ? sender.avatar : sender?.avatar || ''

  if (imageSrc) {
    return ImageBaseUrl + imageSrc
  }
  return generateInitialsIcon(sender)
}

export const getPlainTextFromContent = (value: string): string => {
  if (value.includes('"ops"') || (value.startsWith('{') && value.includes('"insert"'))) {
    try {
      const quill = new Quill(document.createElement('div'))
      quill.setContents(JSON.parse(value))
      return quill.getText().trim()
    } catch {
      return value
    }
  }
  return value.replace(/<[^>]*>/g, '')
}

// Re-export getMessagePreviewText from custom-functions for convenience
export { getMessagePreviewText }
