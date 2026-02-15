import { RefObject } from 'react'
import { Params } from './api'
import { ChatType, MessageType } from '../constants'

export type ID = string | number

export interface Status {
  status: string
  user_id?: string
}

export interface Section {
  label: string
}

export interface Reaction {
  emoji: string
  count: number
  users: Array<string | number>
  created_at?: string
}

export interface MessagePin {
  pinned_by: number
}

export interface Message {
  type: ChatType.DM | ChatType.Channel
  id: string | number
  sender_id: string
  recipient_id: string
  content: string
  created_at: string
  parent_id?: string
  statuses?: Status[]
  edited?: boolean
  reactions: Reaction[]
  sender: {
    first_name: string
    last_name: string
    name: string
    id: string
    avatar: string
    profile_color: string
    email: string
  }
  recipient: {
    first_name: string
    last_name: string
    name: string
    id: string | number
    avatar: string
    profile_color: string
    email: string
  }
  parent?: Message | null
  file_url?: string | null
  file_name?: string | null
  file_size?: number | null
  isPinned: boolean
  isFavorite: boolean
  channel_id: string
  metadata: Record<string, unknown> | null
  file_type: string | null
  message_type:
    | MessageType.Audio
    | MessageType.Video
    | MessageType.Text
    | MessageType.System
    | MessageType.Document
    | MessageType.File
    | MessageType.Reminder
    | MessageType.Call
    | MessageType.Image
    | MessageType.Link
    | MessageType.Location
  isEdited: boolean
  updated_at: string
  pins: MessagePin[]
}
export interface ReplyMessage {
  id: string
  content: string
  message_type?: string
  file_url?: string | null
  file_name?: string | null
  created_at?: string
  sender: {
    id: string
    name: string
    email: string
  }
}

export interface ChatAreaProps {
  onReply: (message: Message) => void
  onEdit: (message: Message | null) => void
  replyingTo?: ReplyMessage | null
}

export interface ExtendedChatAreaProps extends ChatAreaProps {
  onLoadMore: () => void
  hasMore: boolean
  isLoadingMore: boolean
  isLoading: boolean
  targetMessageId?: string | null
  scrollToMessageRef?: RefObject<(messageId: string) => void>
  scrollToBottomRef?: RefObject<() => void>
}

export interface MessageReadByModalProps {
  isOpen: boolean
  onClose: () => void
  channelMembers?: Array<{
    id: string
    name: string
    avatar: string
    profile_color: string
  }>
  message: Message
}

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  onReset?: () => void
}

export interface EditProfileModalProps {
  isOpen: boolean
  toggle: () => void
}

export interface BaseMessageProps {
  message: Message
  sectionLabel: string
  msgIndex: number
  messages: Message[]
  isLastMessage: boolean
  isEditing: boolean
  groupWithPrevious: boolean
  parentMessage?: Message | null
  allMessages?: Message[]
  onReply: (message: Message) => void
  onEdit: (message: Message) => void
  getUserName: (uid: string | number) => string
  getUserNameForPin: (uid: string | number, pinData?: any) => string
  findMessageById: (messageId: string | number) => Message | null
  redirectToParentMes: (parentMessage: Message | null) => void
  handleEditMessage: (message: Message) => void
  handleCancelEdit: () => void
  hideTime?: boolean
  isMultiSelectMode?: boolean
  isSelected?: boolean
  onSelect?: (messageId: string) => void
}
export interface MessageTypeProps {
  message: Message
  allMessages?: any[]
  hideIcon?: boolean
  allChatMessages?: any[]
  findMessageById?: (messageId: string | number) => Message | null
}

export interface DeletedChannelPayload {
  channelId: string | number
  deletedBy?: string | number
  reason?: string
}

export interface FileItem {
  id: string
  content: string
  type: 'image' | 'video' | 'file' | 'link'
  fileName: string
  fileUrl: string
  fileSize?: number
  fileType?: string
  createdAt: string
  senderId: string
  senderName: string
  messageId: string
}

export interface GalleryItem {
  src: string
  alt: string
  messageId: string
  fileName: string
  type?: string
}

export interface ChatParams extends Params {
  id: string | number
  type: string
  filter?: 'fav' | 'favorite' | 'pin' | 'pinned' | 'all'
}

export interface ProgressBarProps {
  seriesValue: number
  title: string
  subtitle: string
  color: string
  backgroundColor?: string
}

export interface Stats {
  icon: string
  count: number
  label: string
  trendValue: number
  isIncrease: boolean
}

export interface MessagesResponse {
  messages: Message[]
  pagination?: {
    total: number
    page: number
    per_page: number
  }
}

export type FieldCondition = {
  field: string
  value: string
}

export type CustomFieldsFormValues = {
  field_name: string
  description: string
  values: string[]
  user_ids?: number
  parent_field_condition: FieldCondition[] | null
  is_mandatory: boolean
  is_user_editable: boolean
  use_parent_condition?: boolean
  allow_custom_domains: boolean
  approved_domains: string | string[]
}

export interface TeamSettingsFormValues {
  // General tab
  timezone: string
  visibility: string
  direct_join_enabled: boolean

  // Permissions tab
  invitation_permission: string
  require_approval_to_join: boolean
  public_channel_creation_permission: string
  private_channel_creation_permission: string
  allowed_public_channel_creator_ids: string[]
  allowed_private_channel_creator_ids: string[]
  invite_only: boolean
  approved_domains: string[]
  block_all_other_domains: boolean
  channel_creation_limit_per_user: number
  auto_joined_channel:number[] | null

  // Messages tab
  email_notifications_enabled: boolean
  message_retention_days: number
  notifications_default: string

  // File sharing tab
  file_sharing_access: string
  file_sharing_type_scope: string
  allowed_file_upload_types: string[]
  allowed_file_upload_member_ids: string[]
  team_file_upload_limit_mb: number
  member_file_upload_limit_mb: number

  // General tab (features)
  audio_calls_enabled: boolean
  video_calls_enabled: boolean
  audio_messages_enabled: boolean
  screen_sharing_in_calls_enabled: boolean
  maximum_message_length: string | number
  default_theme_mode: string
}

export interface ChatSection {
  messages?: Message[]
}
