import { STORAGE_KEYS } from '../constants'

type JsonValue = string | number | boolean | null | JsonObject | JsonArray
interface JsonObject {
  [key: string]: JsonValue
}
type JsonArray = Array<JsonValue>

export const stringify = (value: unknown): string => {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}
export const getStorage = () => {
  return localStorage
}

export const getToken = () => {
  const storage = getStorage()
  const token = storage.getItem(STORAGE_KEYS.TOKEN)
  return token
}

export const getParam = (key: string): string | null => {
  const href = window.location.href
  const url = new URL(href)
  return url.searchParams.get(key) ?? null
}

export const truncateEmail = (email: string | null) => {
  if (!email) return null
  const [localPart, domain] = email.split('@')

  if (localPart.length <= 3) {
    return `${localPart[0]}${'*'.repeat(localPart.length - 1)}@${domain}`
  }

  const visible = localPart.slice(0, 3)
  const masked = '*'.repeat(localPart.length - 3)
  return `${visible}${masked}@${domain}`
}

export const getInitials = (str?: string) => {
  if (typeof str !== 'string' || str.trim() === '') {
    return 'N/A'
  }
  return str
    .split(' ')
    .filter((word) => word.length)
    ?.slice(0, 1)
    .map((word) => word[0].toUpperCase())
    .join('')
}

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
    if (['full', 'long', 'medium', 'short'].includes(format)) {
      return parsedDate.toLocaleDateString(locale, {
        dateStyle: format as 'full' | 'long' | 'medium' | 'short',
        timeZone,
        calendar: options?.calendar,
        numberingSystem: options?.numberingSystem,
      })
    }
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

export const dynamicNumber = (totalLength: number): number[] => {
  return Array.from({ length: totalLength }, (_, index) => index + 1)
}