import CryptoJS from 'crypto-js'
import { ChatType, PRIORITY_CHANNELS, STORAGE_KEYS } from '../constants'
import { ChatItem } from '../types'

export const getTokenFromUrl = () => {
  const hash = window.location.hash
  if (hash) {
    const hashParams = new URLSearchParams(hash.substring(1))
    const tokenFromHash = hashParams.get('token')
    if (tokenFromHash) {
      return tokenFromHash
    }
  }
  const params = new URLSearchParams(window.location.search)
  return params.get('token')
}

export const stringify = (value: unknown): string => {
  try {
    return JSON.stringify(value)
  } catch (err) {
    console.error('Stringify error:', err)
    return ''
  }
}

export const capitalizeFirstLetter = (text: string) => {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const getParam = (key: string): string | null => {
  const href = window.location.href
  const url = new URL(href)
  return url.searchParams.get(key) ?? null
}

export const getStorage = () => ({
  getItem: (key: string) => {
    const encryptedValue = localStorage.getItem(key)
    if (!encryptedValue) return null

    try {
      // Decrypt
      const bytes = CryptoJS.AES.decrypt(encryptedValue, import.meta.env.VITE_STORAGE_SECRET_KEY)
      const decryptedValue = bytes.toString(CryptoJS.enc.Utf8)
      // Parse JSON if it's a JSON string
      try {
        return JSON.parse(decryptedValue)
      } catch {
        return decryptedValue
      }
    } catch (e) {
      console.error('Decryption error:', e)
      return null
    }
  },
  setItem: (key: string, value: any) => {
    try {
      const stringValue = stringify(value)
      const encryptedValue = CryptoJS.AES.encrypt(stringValue, import.meta.env.VITE_STORAGE_SECRET_KEY).toString()
      localStorage.setItem(key, encryptedValue)
    } catch (e) {
      console.error('Encryption error:', e)
    }
  },
  removeItem: (key: string) => localStorage.removeItem(key),
  clear: () => localStorage.clear(),
})

//get token
export const getToken = () => {
  const storage = getStorage()
  const token = storage.getItem(STORAGE_KEYS.TOKEN)
  return token
}

export const getInitials = (str?: string) => {
  if (typeof str !== 'string' || str.trim() === '') {
    return 'NA' // Default fallback
  }
  return str
    .split(' ')
    .filter((word) => word.length)
    ?.slice(0, 1)
    .map((word) => word[0].toUpperCase())
    .join('')
}
// Date/Time Formatters
export const formatDate = (
  date: Date | string | number,
  format: 'full' | 'long' | 'medium' | 'short' | string = 'medium',
  options?: {
    locale?: string
    timeZone?: string
    calendar?:
      | 'gregory'
      | 'buddhist'
      | 'chinese'
      | 'coptic'
      | 'ethiopic'
      | 'hebrew'
      | 'indian'
      | 'islamic'
      | 'iso8601'
      | 'japanese'
      | 'persian'
      | 'roc'
    numberingSystem?:
      | 'arab'
      | 'arabext'
      | 'bali'
      | 'beng'
      | 'deva'
      | 'fullwide'
      | 'gujr'
      | 'guru'
      | 'hanidec'
      | 'khmr'
      | 'knda'
      | 'laoo'
      | 'latn'
      | 'limb'
      | 'mlym'
      | 'mong'
      | 'mymr'
      | 'orya'
      | 'tamldec'
      | 'telu'
      | 'thai'
      | 'tibt'
    customFormat?: Intl.DateTimeFormatOptions
  },
): string => {
  try {
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) return 'Invalid Date'

    const locale = options?.locale || 'en-US'
    const timeZone = options?.timeZone || undefined

    // Handle predefined format styles
    if (['full', 'long', 'medium', 'short'].includes(format)) {
      return parsedDate.toLocaleDateString(locale, {
        dateStyle: format as 'full' | 'long' | 'medium' | 'short',
        timeZone,
        calendar: options?.calendar,
        numberingSystem: options?.numberingSystem,
      })
    }

    // Handle custom format patterns (e.g., 'YYYY-MM-DD')
    if (typeof format === 'string') {
      const formatMap: Record<string, Intl.DateTimeFormatOptions> = {
        'YYYY-MM-DD': { year: 'numeric', month: '2-digit', day: '2-digit' },
        'DD/MM/YYYY': { day: '2-digit', month: '2-digit', year: 'numeric' },
        'MMM DD, YYYY': { year: 'numeric', month: 'short', day: 'numeric' },
        'MMMM D, YYYY': { year: 'numeric', month: 'long', day: 'numeric' },
        'YYYY-MM': { year: 'numeric', month: '2-digit' },
        Weekday: { weekday: 'long' },
      }

      const formatOptions = formatMap[format] ||
        options?.customFormat || {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }

      return parsedDate.toLocaleDateString(locale, {
        ...formatOptions,
        timeZone,
        calendar: options?.calendar,
        numberingSystem: options?.numberingSystem,
      })
    }

    // Default fallback
    return parsedDate.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone,
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

export const formatTime = (
  time: Date | string | number,
  options?: {
    locale?: string
    hour12?: boolean
    showSeconds?: boolean
    timeStyle?: Intl.DateTimeFormatOptions['timeStyle']
    customFormat?: {
      hour?: 'numeric' | '2-digit'
      minute?: 'numeric' | '2-digit'
      second?: 'numeric' | '2-digit'
      hourCycle?: 'h11' | 'h12' | 'h23' | 'h24'
      timeZone?: string
    }
  },
): string => {
  try {
    const date = new Date(time)
    if (isNaN(date.getTime())) return 'Invalid Date'

    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: options?.hour12 ?? true,
    }

    if (options?.showSeconds) {
      defaultOptions.second = '2-digit'
    }

    if (options?.timeStyle) {
      return date.toLocaleTimeString(options?.locale || 'en-US', {
        timeStyle: options.timeStyle,
        hour12: options?.hour12,
        timeZone: options?.customFormat?.timeZone,
      })
    }

    return date.toLocaleTimeString(options?.locale || 'en-US', {
      ...defaultOptions,
      ...options?.customFormat,
    })
  } catch (error) {
    console.error('Error formatting time:', error)
    return 'Invalid Date'
  }
}

export const formatDateTime = (
  date: Date | string | number,
  dateFormat: 'full' | 'long' | 'medium' | 'short' | string = 'medium',
  timeFormat: {
    locale?: string
    hour12?: boolean
    showSeconds?: boolean
    timeStyle?: Intl.DateTimeFormatOptions['timeStyle']
    customFormat?: {
      hour?: 'numeric' | '2-digit'
      minute?: 'numeric' | '2-digit'
      second?: 'numeric' | '2-digit'
      hourCycle?: 'h11' | 'h12' | 'h23' | 'h24'
      timeZone?: string
    }
  } = {},
  options?: {
    locale?: string
    timeZone?: string
    separator?: string
  },
): string => {
  try {
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) return 'Invalid Date'

    const formattedDate = formatDate(parsedDate, dateFormat, {
      locale: options?.locale,
      timeZone: options?.timeZone,
    })

    const formattedTime = formatTime(parsedDate, {
      locale: timeFormat.locale || options?.locale,
      hour12: timeFormat.hour12,
      showSeconds: timeFormat.showSeconds,
      timeStyle: timeFormat.timeStyle,
      customFormat: {
        ...timeFormat.customFormat,
        timeZone: timeFormat.customFormat?.timeZone || options?.timeZone,
      },
    })

    return `${formattedDate}${options?.separator || ' '}${formattedTime}`
  } catch (error) {
    console.error('Error formatting date-time:', error)
    return 'Invalid Date'
  }
}

export const formatNumber = (value: number, decimalPlaces?: number, thousandSeparator = true): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
    useGrouping: thousandSeparator,
  }).format(value)
}

// Status Helper
export const getStatusBadgeClass = (status: string, statusMap?: Record<string, string>): string => {
  const defaultClasses: Record<string, string> = {
    active: 'bg-success',
    inactive: 'bg-secondary',
    pending: 'bg-warning',
    rejected: 'bg-danger',
    completed: 'bg-info',
  }

  return statusMap?.[status] || defaultClasses[status] || 'bg-secondary'
}

const storage = getStorage()

export const clearStorageExcept = (keysToKeep: string[]) => {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key && !keysToKeep.includes(key)) {
      storage.removeItem(key)
    }
  }
}

export interface MentionData {
  id: string
  value: string
  name?: string
  special?: boolean
  currentUserId?: string
}

export const extractTextWithMentions = (deltaContent: string): string => {
  try {
    const delta = JSON.parse(deltaContent)

    if (!delta.ops || !Array.isArray(delta.ops)) {
      return deltaContent
    }

    let text = ''

    delta.ops.forEach((op: any) => {
      if (typeof op.insert === 'string') {
        text += op.insert
      } else if (op.insert?.mention) {
        const mentionText = `@${op.insert.mention.value || op.insert.mention.name || 'Unknown'}`
        text += mentionText
      }
    })

    return text.trim()
  } catch (error) {
    return deltaContent
  }
}

export const getPlainTextFromMessage = (content: string): string => {
  try {
    const delta = JSON.parse(content)

    if (!delta.ops || !Array.isArray(delta.ops)) {
      return content.replace(/<[^>]*>/g, '').trim()
    }

    return extractTextWithMentions(content)
  } catch (error) {
    return content.replace(/<[^>]*>/g, '').trim()
  }
}

export const extractMentionIds = (deltaContent: any, channelMembers?: any[]): string[] => {
  const mentionIds: string[] = []

  if (deltaContent && deltaContent.ops) {
    deltaContent.ops.forEach((op: any) => {
      if (op.insert && typeof op.insert === 'object' && op.insert.mention) {
        const mention: MentionData = op.insert.mention
        if (mention.id === 'all' && channelMembers) {
          const allMemberIds = channelMembers.map((member) => String(member.user_id))
          mentionIds.push(...allMemberIds)
        } else if (mention.id !== 'all') {
          mentionIds.push(mention.id)
        }
      }
    })
  }

  return [...new Set(mentionIds)]
}

export const isChatMuted = (
  mutedChats: Record<string, { muted_until: string | null; duration: string }>,
  chatId: string | number,
  chatType: string,
): boolean => {
  const chatKey = chatType === ChatType.Channel ? `${ChatType.Channel}_${chatId}` : `${ChatType.DM}_${chatId}`
  const muteInfo = mutedChats[chatKey]

  if (!muteInfo) return false

  // Check if mute has expired
  const now = new Date()
  const mutedUntil = new Date(muteInfo.muted_until || '')

  return mutedUntil > now
}

export const getMuteDurationText = (duration: string): string => {
  switch (duration) {
    case '1h':
      return '1 hour'
    case '8h':
      return '8 hours'
    case '1w':
      return '1 week'
    case 'forever':
      return 'Forever'
    default:
      return 'Unknown'
  }
}

export const getRemainingMuteTime = (mutedUntil: string | null): string => {
  if (!mutedUntil) return ''

  const now = new Date()
  const muteEnd = new Date(mutedUntil)

  if (muteEnd <= now) return ''

  const diffMs = muteEnd.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`
  } else {
    return `${diffMinutes}m`
  }
}

/**
 * Ordena una lista de chats colocando los canales prioritarios primero
 * según el orden definido en PRIORITY_CHANNELS, manteniendo el orden
 * original para el resto de los chats.
 */
export const sortWithPriorityChannels = <T extends ChatItem>(chats: T[]): T[] => {
  const priorityMap = new Map<string, number>()
  PRIORITY_CHANNELS.forEach((name, index) => {
    priorityMap.set(name.toLowerCase(), index)
  })

  const priorityChats: T[] = []
  const otherChats: T[] = []

  for (const chat of chats) {
    const name = chat.name?.toLowerCase() || ''
    if (chat.type === ChatType.Channel && priorityMap.has(name)) {
      priorityChats.push(chat)
    } else {
      otherChats.push(chat)
    }
  }

  priorityChats.sort((a, b) => {
    const aIdx = priorityMap.get(a.name?.toLowerCase() || '') ?? 0
    const bIdx = priorityMap.get(b.name?.toLowerCase() || '') ?? 0
    return aIdx - bIdx
  })

  return [...priorityChats, ...otherChats]
}

// Export encryption utilities
export * from './encryption-utils'
