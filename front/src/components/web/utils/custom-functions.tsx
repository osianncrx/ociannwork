import { format, isSameMinute, isToday, isYesterday } from 'date-fns'
import { ReactNode } from 'react'
import { ImageBaseUrl, MessageType } from '../../../constants'
import { Message, ReplyMessage } from '../../../types/common'
import { stringify } from '../../../utils'
import { SvgIcon } from '../../../shared/icons'
import { DeltaContent, DeltaOp } from '../../../types'

export const getSectionLabel = (date: Date) => {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMMM d, yyyy')
}

export const shouldGroupWithPrevious = (prevMessage: Message, currentMessage: Message) => {
  if (!prevMessage) return false
  if (prevMessage.sender_id !== currentMessage.sender_id) return false
  if ([MessageType.System, MessageType.Call, MessageType.Reminder].includes(currentMessage.message_type)) return false
  if ([MessageType.System, MessageType.Call, MessageType.Reminder].includes(prevMessage.message_type)) return false

  const prevTime = new Date(prevMessage.created_at)
  const currTime = new Date(currentMessage.created_at)

  return isSameMinute(currTime, prevTime)
}

export const mergeMessagesFromPages = (pages: any[]) => {
  if (!pages?.length) return []

  const allMessages: Message[] = []

  pages.forEach((page, pageIndex) => {
    const pageMessages = page.messages || []

    if (pageIndex === 0) {
      allMessages.push(...pageMessages)
    } else {
      allMessages.unshift(...pageMessages)
    }
  })

  return allMessages
}

export const mergeAndGroupMessages = (messages: any[]) => {
  if (!messages?.length) {
    return []
  }

  try {
    const grouped = new Map()

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at)
      const dateKey = format(messageDate, 'yyyy-MM-dd')

      let dateLabel
      if (isToday(messageDate)) {
        dateLabel = 'Today'
      } else if (isYesterday(messageDate)) {
        dateLabel = 'Yesterday'
      } else {
        dateLabel = format(messageDate, 'EEEE, MMMM d, yyyy')
      }

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          label: dateLabel,
          messages: [],
        })
      }

      grouped.get(dateKey).messages.push(message)
    })

    return Array.from(grouped.values())
  } catch (error) {
    console.error('❌ Error in mergeAndGroupMessages:', error)
    return []
  }
}

export const safeJsonParse = (jsonString: string): any => {
  let result = jsonString

  while (true) {
    if (typeof result === 'string') {
      try {
        const parsed = JSON.parse(result)
        result = parsed
      } catch {
        break
      }
    } else {
      break
    }
  }

  return result
}

export const downloadFile = async (fileUrl: string, fileName: string, fileType?: string): Promise<void> => {
  if (!fileUrl) {
    console.warn('File URL not available')
    return
  }

  const fullUrl = fileUrl.startsWith('http') ? fileUrl : ImageBaseUrl + fileUrl
  const defaultFileName = fileType === 'image' ? 'image' : 'download'

  try {
    const response = await fetch(fullUrl, { mode: 'cors' })
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`)
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || defaultFileName
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading file:', error)
    // Fallback: Open file in new tab
    window.open(fullUrl, '_blank')
  }
}

export const parseRichTextContent = (content: string): string => {
  try {
    const parsed = safeJsonParse(content)

    // Handle Quill.js delta format
    if (parsed?.ops && Array.isArray(parsed.ops)) {
      return parsed.ops
        .map((op: any) => {
          if (typeof op.insert === 'string') {
            return op.insert
          }
          // Handle embeds like images, videos, etc.
          if (typeof op.insert === 'object') {
            if (op.insert.mention) {
              return `@${op.insert.mention.value || op.insert.mention.name || 'mention'}`
            }
            // Handle other embeds like images, videos, etc.
            if (op.insert.image) return '[Image]'
            if (op.insert.video) return '[Video]'
            if (op.insert.audio) return '[Audio]'
            return '[Media]'
          }
          return ''
        })
        .join('')
        .trim()
    }

    // Handle other rich text formats
    if (parsed?.blocks && Array.isArray(parsed.blocks)) {
      return parsed.blocks
        .map((block: any) => block.text || '')
        .join(' ')
        .trim()
    }

    // If it's a parsed object but not recognized format, try to extract text
    if (typeof parsed === 'object' && parsed !== null) {
      if (parsed.text) return parsed.text
      if (parsed.message) return parsed.message
      if (parsed.body) return parsed.body
    }

    return content
  } catch (error) {
    return content
  }
}

export const getFileIcon = (fileType: string = '', fileName: string = ''): ReactNode => {
  if (!fileName || !fileType) {
    return (
      <>
        <SvgIcon iconId="file" className="chat-icon" />
        <span className="chat-message">File</span>
      </>
    )
  }
  const type = fileType.toLowerCase()
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
    return (
      <>
        <SvgIcon iconId="image-2" className="chat-icon" />
        <span className="chat-message">Image</span>
      </>
    )
  if (type.includes('video') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext))
    return (
      <>
        <SvgIcon iconId="video-play" className="chat-icon" />
        <span className="chat-message">Video</span>
      </>
    )
  if (type.includes('audio') || ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext))
    return (
      <>
        <SvgIcon iconId="audio" className="chat-icon" />
        <span className="chat-message">Audio</span>
      </>
    )
  if (type.includes('application/pdf') || ext === 'pdf')
    return (
      <>
        <SvgIcon iconId="page" className="chat-icon" />
        <span className="chat-message">Page</span>
      </>
    )
  if (['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(type))
    return (
      <>
        <SvgIcon iconId="form" className="chat-icon" />
        <span className="chat-message">Form</span>
      </>
    )
  if (['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(type))
    return (
      <>
        <SvgIcon iconId="chart" className="chat-icon" />
        <span className="chat-message">Chart</span>
      </>
    )
  if (['application/ppt', 'application/pptx'].includes(type))
    return (
      <>
        <SvgIcon iconId="video-play" className="chat-icon" />
        <span className="chat-message">Chart</span>
      </>
    )
  if (
    ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/json'].includes(
      type,
    )
  )
    return (
      <>
        <SvgIcon iconId="file" className="chat-icon" />
        <span className="chat-message">File</span>
      </>
    )
  if (['text/plain', 'text/csv', 'md'].includes(type))
    return (
      <>
        <SvgIcon iconId="page" className="chat-icon" />
        <span className="chat-message">Page</span>
      </>
    )
  return (
    <>
      <SvgIcon iconId="link" className="chat-icon" />
      <span className="chat-message">Link</span>
    </>
  )
}

export const formatFileSize = (bytes: number = 0): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}


export const getLastMessagePreview = (
  message: Partial<Message> | null | undefined,
  decryptContent?: (content: string) => string
): ReactNode | string => {
  if (!message) return ''
  try {
    switch (message.message_type as MessageType | undefined) {
      case MessageType.System:
        const systemContent = message.content || ''
        return decryptContent ? decryptContent(systemContent) : systemContent

      case MessageType.Image:
        return (
          <>
            <SvgIcon iconId="image-2" className="chat-icon" />
            <span className="chat-message">Image</span>
          </>
        )

      case MessageType.Video:
        return (
          <>
            <SvgIcon iconId="video-play" className="chat-icon" />
            <span className="chat-message">Video</span>
          </>
        )

      case MessageType.Audio:
        return (
          <>
            <SvgIcon iconId="audio" className="chat-icon" />
            <span className="chat-message">Audio</span>
          </>
        )

      case MessageType.File:
        return (
          <>
            <SvgIcon iconId="file" className="chat-icon" />
            <span className="chat-message">File</span>
          </>
        )
      case MessageType.Document:
        const fileIcon = getFileIcon(message.file_type || undefined, message.file_name || undefined)
        const docContent = message.content || ''
        const decryptedDocContent = decryptContent ? decryptContent(docContent) : docContent
        const fileName = message.file_name || decryptedDocContent || 'File'
        return `${fileIcon} ${fileName}`

      case MessageType.Poll:
        return (
          <>
            <SvgIcon iconId="chart" className="chat-icon" />
            <span className="chat-message">Chart</span>
          </>
        )

      case MessageType.Form:
        return (
          <>
            <SvgIcon iconId="form" className="chat-icon" />
            <span className="chat-message">Form</span>
          </>
        )

      case MessageType.Location:
        try {
          const metadata = message.metadata
            ? typeof message.metadata === 'string'
              ? JSON.parse(message.metadata)
              : message.metadata
            : null
          const locationContent = message.content || ''
          const decryptedLocationContent = decryptContent ? decryptContent(locationContent) : locationContent
          const address = metadata?.address || decryptedLocationContent || 'Location'
          return (
            <>
              <SvgIcon iconId="location" className="chat-icon" />
              <span className="chat-message">{address}</span>
            </>
          )
        } catch (e) {
          return (
            <>
              <SvgIcon iconId="location" className="chat-icon" />
              <span className="chat-message">Location</span>
            </>
          )
        }


      case MessageType.Link:
        return (
          <>
            <SvgIcon iconId="link" className="chat-icon" />
            <span className="chat-message">Link</span>
          </>
        )

      case MessageType.Call:
        const callType = getCallType(message as Message)
        if (callType === 'audio') {
          return (
            <>
              <SvgIcon iconId="call" className="chat-icon" />
              <span className="chat-message">Audio call</span>
            </>
          )
        } else if (callType === 'video') {
          return (
            <>
              <SvgIcon iconId="video" className="chat-icon" />
              <span className="chat-message">Video call</span>
            </>
          )
        }
        return (
          <>
            <SvgIcon iconId="call" className="chat-icon" />
            <span className="chat-message">Call</span>
          </>
        )

      case MessageType.Text:
      default:
        if (message.content) {
          // Decrypt content if decryptContent function is provided
          const rawContent = decryptContent ? decryptContent(message.content) : message.content
          let textContent = ''

          try {
            const deltaContent = safeJsonParse(rawContent) as DeltaContent
            if (deltaContent.ops && Array.isArray(deltaContent.ops)) {
              textContent = deltaContent.ops
                .map((op: DeltaOp) => {
                  if (typeof op.insert === 'string') {
                    return op.insert
                  } else if (op.insert && typeof op.insert === 'object' && 'mention' in op.insert) {
                    const mention = op.insert.mention
                    return `@${mention?.value || mention?.name || 'mention'}`
                  }
                  return ''
                })
                .join('')
            } else {
              textContent = parseRichTextContent(rawContent)
            }
          } catch {
            textContent = parseRichTextContent(rawContent)
          }

          const trimmedContent = textContent.trim()

          if (!trimmedContent) {
            return 'Message'
          }

          // Truncate long messages
          const maxLength = 50
          if (trimmedContent.length > maxLength) {
            return trimmedContent.substring(0, maxLength) + '...'
          }

          return trimmedContent
        }

        return 'Message'
    }
  } catch (error) {
    console.warn('Error in getMessagePreview:', error, message)
    return 'Message'
  }
}


export const getMessagePreviewText = (
  message: Partial<Message> | null | undefined,
  decryptContent?: (content: string) => string
): string => {
  if (!message) return ''
  try {
    const getDecryptedContent = (content: string | null | undefined): string => {
      if (!content) return ''
      return decryptContent ? decryptContent(content) : content
    }

    switch (message.message_type as MessageType | undefined) {
      case MessageType.System:
        return message.content ? parseRichTextContent(getDecryptedContent(message.content)) : ''

      case MessageType.Image:
        return message.content ? parseRichTextContent(getDecryptedContent(message.content)) || 'Image' : 'Image'

      case MessageType.Video:
        return message.content ? parseRichTextContent(getDecryptedContent(message.content)) || 'Video' : 'Video'

      case MessageType.Audio:
      case MessageType.Voice:
        return message.content ? parseRichTextContent(getDecryptedContent(message.content)) || 'Audio' : 'Audio'

      case MessageType.File:
        const fileText = message.content ? parseRichTextContent(getDecryptedContent(message.content)) : null
        return fileText || (message.file_name ? `File: ${message.file_name}` : 'File')

      case MessageType.Document:
        return message.file_name || getDecryptedContent(message.content) || 'File'

      case MessageType.Poll:
        return 'Chart'

      case MessageType.Form:
        return 'Form'

      case MessageType.Location:
        try {
          const metadata = message.metadata
            ? typeof message.metadata === 'string'
              ? JSON.parse(message.metadata)
              : message.metadata
            : null
          return metadata?.address || getDecryptedContent(message.content) || 'Location'
        } catch {
          return 'Location'
        }

      case MessageType.Link:
        return 'Link'

      case MessageType.Call:
        const callType = getCallType(message as Message)
        if (callType === 'audio') {
          return 'Audio call'
        } else if (callType === 'video') {
          return 'Video call'
        }
        return 'Call'

      case MessageType.Text:
      default:
        if (message.content) {
          const textContent = parseRichTextContent(getDecryptedContent(message.content))
          const trimmedContent = textContent.trim()
          return trimmedContent || 'Message'
        }
        return 'Message'
    }
  } catch (error) {
    console.warn('Error in getMessagePreviewText:', error, message)
    return 'Message'
  }
}

export const extractFormattedText = (content: string): string => {
  try {
    const delta = safeJsonParse(content)

    if (delta && delta.ops && Array.isArray(delta.ops)) {
      return delta.ops
        .map((op: any) => {
          let text = ''

          if (typeof op.insert === 'string') {
            text = op.insert
          } else if (op.insert && typeof op.insert === 'object') {
            if (op.insert.mention) {
              const mention = op.insert.mention
              let mentionValue = ''

              if (mention.value !== undefined && mention.value !== null && mention.value !== '') {
                mentionValue = mention.value
              } else if (mention.id !== undefined && mention.id !== null && mention.id !== '') {
                mentionValue = mention.id
              } else {
                mentionValue = 'unknown'
              }

              text = `@${mentionValue}`
            } else if (op.insert.image) {
              text = '[Image]'
            } else if (op.insert.video) {
              text = '[Video]'
            } else if (op.insert.link) {
              text = op.insert.link
            } else {
              text = stringify(op.insert)
            }
          }

          // Apply formatting if present
          if (op.attributes) {
            if (op.attributes.bold) {
              text = `**${text}**`
            }
            if (op.attributes.italic) {
              text = `*${text}*`
            }
            if (op.attributes.underline) {
              text = `_${text}_`
            }
            if (op.attributes.strike) {
              text = `~~${text}~~`
            }
            if (op.attributes.code) {
              text = `\`${text}\``
            }
            if (op.attributes.link) {
              text = `[${text}](${op.attributes.link})`
            }
          }

          return text
        })
        .join('')
        .replace(/\n$/, '')
    }

    return content
  } catch (error) {
    console.error('Error parsing content:', error)
    return content
  }
}

export const extractAsHTML = (content: string): string => {
  try {
    const delta = safeJsonParse(content)

    if (delta && delta.ops && Array.isArray(delta.ops)) {
      return delta.ops
        .map((op: any) => {
          let text = ''

          if (typeof op.insert === 'string') {
            text = op.insert
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/\n/g, '<br>')
          } else if (op.insert && typeof op.insert === 'object') {
            if (op.insert.mention) {
              const mention = op.insert.mention
              let mentionValue = ''

              if (mention.value !== undefined && mention.value !== null && mention.value !== '') {
                mentionValue = mention.value
              } else if (mention.id !== undefined && mention.id !== null && mention.id !== '') {
                mentionValue = mention.id
              } else {
                mentionValue = 'unknown'
              }

              text = `@${mentionValue}`
            } else if (op.insert.image) {
              text = `<img src="${op.insert.image}" alt="Image" />`
            }
          }

          if (op.attributes && text) {
            if (op.attributes.bold) text = `<strong>${text}</strong>`
            if (op.attributes.italic) text = `<em>${text}</em>`
            if (op.attributes.underline) text = `<u>${text}</u>`
            if (op.attributes.strike) text = `<del>${text}</del>`
            if (op.attributes.code) text = `<code>${text}</code>`
            if (op.attributes.color) text = `<span style="color: ${op.attributes.color}">${text}</span>`
            if (op.attributes.background)
              text = `<span style="background-color: ${op.attributes.background}">${text}</span>`
            if (op.attributes.link) text = `<a href="${op.attributes.link}">${text}</a>`
          }

          return text
        })
        .join('')
    }

    return content
  } catch (error) {
    console.error('Error parsing content for HTML:', error)
    return content
  }
}

export const getMetadata = (message: Message): Record<string, unknown> | null => {
  try {
    if (message.metadata) {
      if (typeof message.metadata === 'object') {
        return message.metadata
      }
      if (typeof message.metadata === 'string') {
        return safeJsonParse(message.metadata) as Record<string, unknown>
      }
    }
    return null
  } catch (error) {
    console.error('Error parsing metadata:', error)
    return null
  }
}

// Get file name from metadata if available
export const getFileName = (message: Message) => {
  const metadata = getMetadata(message)
  return metadata?.original_filename || null
}

export const getCallType = (message: Message) => {
  const metadata = getMetadata(message)
  return metadata?.call_kind || null
}

export const formatMessagesForCopy = (
  messages: Message[],
  getUserName: (userId: string) => string,
  decryptContent?: (content: string) => string
): string => {
  return messages
    .map((message) => {
      const senderName = getUserName(message.sender_id)
      const timestamp = format(new Date(message.created_at), 'MMM d, yyyy HH:mm')
      let messageContent = ''

      const getDecryptedContent = (content: string | null | undefined): string => {
        if (!content) return ''
        return decryptContent ? decryptContent(content) : content
      }

      switch (message.message_type) {
        case MessageType.Text:
          messageContent = extractFormattedText(getDecryptedContent(message.content))
          break
        case MessageType.Image:
          messageContent = message.content ? extractFormattedText(getDecryptedContent(message.content)) : '[Image]'
          break
        case MessageType.Video:
          messageContent = message.content ? extractFormattedText(getDecryptedContent(message.content)) : '[Video]'
          break
        case MessageType.File:
          messageContent = message.content ? extractFormattedText(getDecryptedContent(message.content)) : '[File]'
          break
        case MessageType.Audio:
          messageContent = message.content ? extractFormattedText(getDecryptedContent(message.content)) : '[Audio]'
          break
        case MessageType.Call:
          messageContent = '[Call]'
          break
        case MessageType.System:
          messageContent = extractFormattedText(getDecryptedContent(message.content))
          break
        default:
          messageContent = getDecryptedContent(message.content) || ''
      }

      return `[${timestamp}] ${senderName}: ${messageContent}`
    })
    .join('\n')
}

export const formatMessagesForHTMLCopy = (
  messages: Message[],
  getUserName: (userId: string) => string,
  decryptContent?: (content: string) => string
): string => {
  return messages
    .map((message) => {
      const senderName = getUserName(message.sender_id)
      const timestamp = format(new Date(message.created_at), 'MMM d, yyyy HH:mm')
      let messageContent = ''

      const getDecryptedContent = (content: string | null | undefined): string => {
        if (!content) return ''
        return decryptContent ? decryptContent(content) : content
      }

      switch (message.message_type) {
        case MessageType.Text:
          messageContent = extractAsHTML(getDecryptedContent(message.content))
          break
        case MessageType.Image:
          messageContent = message.content ? extractAsHTML(getDecryptedContent(message.content)) : '[Image]'
          break
        case MessageType.Video:
          messageContent = message.content ? extractAsHTML(getDecryptedContent(message.content)) : '[Video]'
          break
        case MessageType.File:
          messageContent = message.content ? extractAsHTML(getDecryptedContent(message.content)) : '[File]'
          break
        case MessageType.Audio:
          messageContent = message.content ? extractAsHTML(getDecryptedContent(message.content)) : '[Audio]'
          break
        case MessageType.Call:
          messageContent = '[Call]'
          break
        case MessageType.System:
          messageContent = extractAsHTML(getDecryptedContent(message.content))
          break
        default:
          messageContent = getDecryptedContent(message.content) || ''
      }

      return `<div>[${timestamp}] <strong>${senderName}:</strong> ${messageContent}</div>`
    })
    .join('<br>')
}

export const getConsecutiveSystemMessages = (messages: Message[], currentIndex: number): Message[] => {
  const consecutiveMessages: Message[] = []

  if (!messages || currentIndex < 0 || currentIndex >= messages.length) {
    return consecutiveMessages
  }

  const currentMessage = messages[currentIndex]

  if (currentMessage.message_type !== MessageType.System) {
    return [currentMessage]
  }

  let backwardIndex = currentIndex
  while (backwardIndex >= 0 && messages[backwardIndex].message_type === MessageType.System) {
    consecutiveMessages.unshift(messages[backwardIndex])
    backwardIndex--
  }

  let forwardIndex = currentIndex + 1
  while (forwardIndex < messages.length && messages[forwardIndex].message_type === MessageType.System) {
    consecutiveMessages.push(messages[forwardIndex])
    forwardIndex++
  }

  return consecutiveMessages
}

export const isFirstInSystemMessageGroup = (messages: Message[], currentIndex: number): boolean => {
  if (!messages || currentIndex < 0 || currentIndex >= messages.length) {
    return false
  }

  const currentMessage = messages[currentIndex]

  if (currentMessage.message_type !== MessageType.System) {
    return false
  }

  // Check if the previous message is also a system message
  const prevMessage = messages[currentIndex - 1]
  return !prevMessage || prevMessage.message_type !== MessageType.System
}


export const getRepliedMessagePreview = (message: ReplyMessage | null, plainText: string) => {
  if (!message) return null

  switch (message.message_type) {
    case MessageType.Image:
      return {
        type: MessageType.Image,
        content: message.file_url ? `${ImageBaseUrl}${message.file_url}` : null,
        alt: message.file_name || 'Image',
        text: plainText,
      }
    case MessageType.Video:
      return {
        type: MessageType.Video,
        content: message.file_url ? `${ImageBaseUrl}${message.file_url}` : null,
        alt: message.file_name || 'Video',
        text: plainText,
      }
    case MessageType.Audio:
      return {
        type: MessageType.Audio,
        content: message.file_url ? `${ImageBaseUrl}${message.file_url}` : null,
        alt: message.file_name || 'Audio',
        text: plainText,
      }
    case MessageType.File:
      return {
        type: MessageType.File,
        content: message.file_url ? `${ImageBaseUrl}${message.file_url}` : null,
        alt: message.file_name || 'File',
        text: plainText,
      }
    case MessageType.Call:
      return {
        type: MessageType.Call,
        text: plainText,
      }
    default:
      return {
        type: MessageType.Text,
        content: null,
        alt: null,
        text: plainText,
      }
  }
}