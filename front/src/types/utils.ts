import { ChatType } from '../constants'
import { ChatItem } from './components/chat'

export type ToastType = 'success' | 'error' | 'warn' | 'info' | 'default'
export interface TableWrapperConfig {
  page: number
  perPage: number
  total: number
  searchText: string
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  onSearchChange: (text: string) => void
  onDelete?: () => void
  handleSetPageSize?: any

  moduleName: string
  refetch?: () => void
  importExportConfig?: {
    importUrl?: string
    exportUrl?: string
    paramsProps?: any
  }

  showImport?: boolean
}

// Hooks
export interface ScrollChat {
  id: string | number
  type: ChatType.Channel | ChatType.DM
  name?: string
}

interface ScrollMessage {
  id: string | number
  sender_id: string | number
  content: string
  created_at: string
}

export interface ScrollMessageSection {
  label: string
  messages: ScrollMessage[]
}

export interface ScrollTypingUser {
  userId: string
  name: string
}

export interface UseScrollManagerReturn {
  containerRef: any
  isUserScrolledUp: boolean
  shouldAutoScroll: boolean
  handleScroll: () => void
  scrollToBottom: () => void
  forceScrollToBottom: () => void
  saveScrollPosition: () => void
  restoreScrollPosition: () => void
  scrollToMessage: (messageId: string) => void
  prepareForOlderMessages?: () => void
  globalRedirectToMessage?: (messageId: string, targetChat?: ChatItem) => void
}

export interface CountryInfo {
  name: string
  code: string
  flag: string
  displayCode: string
}

export interface DeltaOp {
  insert?: string | { mention?: { value?: string; name?: string } }
  [key: string]: unknown
}

export interface DeltaContent {
  ops?: DeltaOp[]
  [key: string]: unknown
}
