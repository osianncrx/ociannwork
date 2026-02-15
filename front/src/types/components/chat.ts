import Quill, { Delta, Op } from 'quill'
import { ChangeEvent, ReactNode, RefObject } from 'react'
import { BaseMessageProps, ID, Message, MessagePin, ReplyMessage, Section } from '../common'
import { EditProfileFormValues, UpdatePasswordFormValues } from './profile'
import { ChatType, UserTeamStatus } from '../../constants'
import { OptionType } from '../shared'
import { AddMembersToChannelPayload, AddMembersToChannelResponse, CombinedErrorResponse, ApiReminder, User } from '../api'
import { UseMutateFunction } from '@tanstack/react-query'

export interface LastMessage {
  id: number | string
  content: string
  sender_id: string
  created_at: string
  mentions?: string[]
  pins?: MessagePin[]
}

export interface ChatItem {
  type: ChatType.DM | ChatType.Channel | string
  id: ID
  profile_color?: string | null
  name: string
  email?: string | null
  avatar?: string | null
  latest_message_at?: string | null
  pinned: boolean
  last_message?: LastMessage | null
  status?: string // Optional status field if you need it
  unread_count?: number
  has_unread_mentions?: boolean
  is_muted?: boolean
  muted_until?: string | null
  mute_duration?: string
  // DND flags for DM chats
  do_not_disturb?: boolean
  do_not_disturb_until?: string | null
  profiler_color?: string | null
  team_member_status?: UserTeamStatus
}

export interface EditorProps {
  onSubmit: ({ body, files, location }: { body: string; files?: File[]; location?: { latitude: number; longitude: number; address: string } }) => void
  onCancel: () => void
  onChange?: () => void
  placeholder?: string
  disabled?: boolean
  defaultValue?: Delta | Op[]
  innerRef?: RefObject<Quill | null>
  variant?: 'create' | 'update'
  maxLength?: number
  draftKey?: string
  enableDraft?: boolean
  draftSaveDelay?: number
  onMaxLengthExceeded?: (currentLength: number, maxLength: number) => void
}

export interface EditorRef {
  clearContent: () => void
  focus: () => void
  getTextLength: () => number
  clearDraft: () => void
  saveDraft: () => void
  insertMention: () => void
  setDragDropFiles?: (files: File[]) => void
  setCursorToEnd?: () => void // Add this line
}

export interface JumpToMenuProps {
  sectionLabel: string
  chatContainerRef: any
  onOpenDateModal: () => void
  scrollToBottom: () => void
  onClose?: () => void
}

export interface EmojiWrapperProps {
  children: ReactNode
  hint?: string
  onEmojiSelect: (emoji: any) => void
  id: string
  onPickerStateChange?: (isOpen: boolean) => void
  onParentHoverChange?: any
  position?: 'top' | 'bottom' | 'right' | 'left'
}

export interface RendererProps {
  value: string
  message?: Message
  mentions?: string[]
  hideTime?: boolean
  hideIcon?: boolean
  findMessageById?: (messageId: string | number) => Message | null
}

export interface CreateChannelProps {
  createChannelModal: boolean
  setCreateChannelModal: (value: boolean) => void
}

export type Screen =
  | 'email'
  | 'forgotPassword'
  | 'password'
  | 'webScreen'
  | 'otp'
  | 'resetPassword'
  | 'createTeam'
  | 'setupProfile'
  | 'discoverTeam'
  | 'welcome'
  | 'termsAndConditions'
  | 'redirectScreen'
  | 'customFields'
  | 'channelBanner'
  | 'createChannel'
  | 'inviteTeam'
  | 'Error403'

export interface MessageActionsProps {
  message: Message
  onReply: (message: Message) => void
  onEdit: (message: Message) => void
  onMessageHoverChange?: (isHovered: boolean) => void
  dropdownOpen: boolean
  setDropdownOpen: (prev: any) => void
}

export interface ChannelsTabProps {
  filteredChannels: ChatItem[]
  searchTerm: string
  onSearchChange: (value: string) => void
  onChannelSelect: (channel: ChatItem) => void
  onResetPagination: () => void
}

export interface ViewMoreButtonProps {
  viewMore: boolean
  onToggle: () => void
  totalItems: number
  limit: number
}

export interface MembersTabProps {
  filteredMembers: ChatItem[]
  searchTerm: string
  isLoading: boolean
  onSearchChange: (value: string) => void
  onMemberSelect: (member: ChatItem) => void
  onResetPagination: () => void
}

export interface DateLabelProps {
  section: Section
  containerRef: RefObject<HTMLElement | null>
  forceScrollToBottom: () => void
}

export interface MessageReactionProps {
  message: Message
  findMessageById?: (messageId: string | number) => Message | null
}

export interface SenderNameProps {
  message: Message
  isLastMessage?: boolean
  customSenderName?: string // optional if not always passed
}

export interface UserChatAvatarProps {
  message: Message
  customIcon?: string
  onMessageUser?: () => void
  onPinChat?: () => void
}

export interface UserChatPopoverProps {
  message: Message
  onMessageUser?: () => void
}

export interface MessageStatusProps {
  message: Message
  isLastMessage: boolean
}

export interface MessageRendererProps extends BaseMessageProps {
  allChatMessages?: Message[]
  sectionMessages?: Message[]
}

export interface MessageWrapperProps extends BaseMessageProps {
  children: ReactNode
  customIcon?: string
  customSenderName?: string
  hideAvatar?: boolean
  hideSenderName?: boolean
  hideActions?: boolean
  hideStatus?: boolean
}

export interface PinFavRendererProps {
  allChatMessages?: Message[]
  message: Message
}

export interface SystemMessageProps extends Pick<BaseMessageProps, 'message'> {
  consecutiveSystemMessages?: Message[]
  isGrouped?: boolean
  isFirstInGroup?: boolean
  currentMessageIndex?: number
}

export interface EditMessageInputProps {
  message: Message
  onCancel: () => void
  onSave: (content: string) => void
}

export interface FilePreviewProps {
  files: File[]
  onRemoveFile: (index: number) => void
  setFiles: (files: File[]) => void
}

export interface UploadAttachmentsProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

export interface ShareLocationProps {
  onLocationSelected: (location: { latitude: number; longitude: number; address: string }) => void
  disabled?: boolean
}

export interface ReplyMessageProps {
  parentMessage: Message
  onClick: () => void
  message: Message
  isLastMessage: boolean
}

export interface MessageInputProps {
  replyingTo?: ReplyMessage | null
  onCancelReply?: () => void
  editingMessage?: () => void
  onCancelEdit?: () => void
  scrollToBottomRef?: RefObject<() => void>
  dragDropFiles?: File[]
  onDragDropFilesCleared?: () => void
}

export interface ChangePasswordProps {
  onSubmit: (values: UpdatePasswordFormValues) => Promise<void>
  isPending: boolean
}

export interface PersonalDetailsProps {
  user: User
  hasAvatar: boolean
  avatarPreview: string | null
  onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void
  onRemoveAvatar: () => void
  onSubmit: (values: EditProfileFormValues) => Promise<void>
  isPending: boolean
}

export interface UserCustomFieldsProps {
  customFieldValues: Record<string, any>
  toggle: () => void
}

export interface DoNotDisturbModalProps {
  isOpen: boolean
  toggle: () => void
  toggleModal: () => void
}

export interface DateJumpModalProps {
  isOpen: boolean
  onClose: () => void
  forceScrollToBottom: () => void
}

export interface MuteChatModalProps {
  isOpen: boolean
  toggle: () => void
  targetId: string | number
  targetType: string
  onMuteSuccess?: () => void
}

export interface UserSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  submitButtonText?: string
  onSubmit: (selectedItems: { id: string; type: ChatType.DM | ChatType.Channel }[]) => void
  initialSelectedUsers?: string[]
  isMulti?: boolean
  excludeUsers?: string[]
}

export interface AudioRecorderProps {
  onDirectSend: (audioFile: File) => Promise<void>
  onCancel: () => void
  disabled?: boolean
}

export interface DragDropWrapperProps {
  onFilesSelected: (files: File[]) => void
}

export interface EmojiMartPicker {
  el: HTMLElement
}

export interface RestrictChatWrapperProps {
  selectedChat: ChatItem
  children: ReactNode
  team_member_status?: UserTeamStatus
}

export interface MentionUser {
  id: string
  value: string
  name?: string
  email?: string
  avatar?: string
  special?: boolean
  className?: string
}

export interface FavMessageProps {
  message: Message
  selectedFavMessages?: Message[]
}

export interface PinMessageProps {
  message: Message
  selectedPinMessages: Message[]
}

export interface AlarmTimePickerProps {
  selectedHour: OptionType | null
  selectedMinute: OptionType | null
  selectedPeriod: OptionType | null
  onHourChange: (hour: OptionType | null) => void
  onMinuteChange: (minute: OptionType | null) => void
  onPeriodChange: (period: OptionType | null) => void
}

export interface CustomDatePickerProps {
  customDate: Date | null
  onDateChange: (date: Date | null) => void
}

export interface ReminderForData {
  type: string
  id: string
}

export interface OptionTypeWithData extends OptionType {
  data: ReminderForData
}
export interface TimeOption {
  value: string
  label: string
  unit: string
}

export interface QuickTimeOptionsProps {
  selectedTime: string
  selectedTimeUnit: string
  onTimeSelection: (value: string, unit: string) => void
}

export interface RepeatSelectorProps {
  repeatOption: OptionType | null
  onRepeatChange: (option: OptionType | null) => void
}

export interface TimePreviewProps {
  previewText: string
}

export interface SearchParams {
  query?: string
  channel_id?: string | number | null
  recipient_id?: string | number | null
  date_from?: string
  date_to?: string
  sender_id?: string | number | null
  scope?: ChatType.Channel | ChatType.DM | 'global'
  limit?: number
  offset?: number
  _timestamp?: string | number
}

export interface SearchMessage {
  id: string | number
  content: string
  timestamp: string
  created_at: string
  sender_id?: string | number
  sender?: { id: ID; name?: string; avatar?: string }
  recipient?: { id?: string | number; name?: string; avatar?: string }
  channel?: { id: string | number; name: string }
}

export interface SearchResponse {
  messages: SearchMessage[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  searchInfo: {
    query: string
    searchType: string
    scope: string
    resultsFound: number
  }
}

export interface InviteMembersModalProps {
  isOpen: boolean
  toggle: () => void
}

export interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
}
export interface FilesProps {
  selectedChatId?: string
}

interface DirectoryTabItem {
  id: string
  label: string
}

export interface DirectoryTabsProps {
  activeTab: string
  onTabChange: (tabId: string) => void
  tabItems: DirectoryTabItem[]
}

export interface RecentChatsTabProps {
  recentDMs: ChatItem[]
  recentChannels: ChatItem[]
  onChatSelect: (chat: ChatItem) => void
}

export interface CallModalProps {
  isOpen: boolean
  onClose: () => void
  isMinimized: boolean
  onMinimize: () => void
  onMaximize: () => void
}

export interface CallNotificationProps {
  onAccept: () => void
  onDecline: () => void
  onEndAndAccept?: () => void
  isVisible: boolean
}

export interface SetupProfileFormValues {
  firstName: string
  lastName: string
  password: string
  phoneNumber: string
  countryCode: string
}

export interface TypingEventData {
  userId: string
  userName: string
  isTyping: boolean
  channelId?: string
  senderId?: string
  recipientId?: string
}
export interface EmojiData {
  emoji?: string
  unified?: string
  native?: string
  [key: string]: unknown
}

export interface DeltaOperation {
  insert?: string | { mention?: unknown; image?: unknown; video?: unknown; embed?: unknown }
  attributes?: Record<string, unknown>
  [key: string]: unknown
}

export interface MesageInputChannelMember {
  user_id: string | number
  User: {
    name: string
    email: string
    avatar?: string | null
  }
}

export interface SelectedMember {
  value: string | number
  label: string
  data: {
    id: string | number
    name: string
    email: string
    avatar?: string | null
    [key: string]: unknown
  }
}

export interface AddChannelMemberProps {
  setAddMembersModal: (value: boolean) => void
  addMembersToChannelMutate?: UseMutateFunction<
    AddMembersToChannelResponse,
    CombinedErrorResponse,
    AddMembersToChannelPayload,
    unknown
  >
  isAddingMembers?: boolean
  channelId?: number | undefined
}

export interface SelectedUserItem {
  value: string | number
  label: string
  data: {
    id: string | number
    type: ChatType.Channel | 'user'
    name?: string
    [key: string]: unknown
  }
}

export interface ChannelDetailsModalProps {
  detailsModal: boolean
  setDetailModal: (value: boolean) => void
  addMembersModal: boolean
  setAddMembersModal: (value: boolean) => void
}
export interface ChannelAboutTabProps {
  detailsModal: boolean
  setDetailModal: (value: boolean) => void
  handleLeaveChannel: () => void
}

export interface UserChannelOption {
  value: string
  label: string
  data: {
    id: string
    type: string
    avatar?: string | null
    profile_color?: string | null
    email?: string
  }
}

export interface FavoriteMessageSection {
  label: string
  messages: Message[]
}

export interface PinMessageSection {
  label: string
  messages: Message[]
}

export interface MessageSelectionActionsProps {
  selectedCount: number
  onClear: () => void
  onDelete: () => void
  onForward: () => void
  onStar: () => void
  selectedMessages: Message[]
  canDelete?: boolean
}

export interface StorageLimitModalProps {
  isOpen: boolean
  onClose: () => void
  currentUsageMB?: number
  maxStorageMB?: number
  message?: string
}

export interface BulkActionsToolbarProps {
  selectedMessageIds: string[]
  onMessagesUpdated?: () => void
}

export interface CallMetadata {
  call_kind?: 'audio' | 'video'
  call_id?: string
  call_accepted_time?: string
  duration_sec?: number
  recipient_view?: 'missed' | string
  participant_count?: number
  accepted_users?: (string | number)[]
  call_status?: 'ongoing' | 'ended' | 'calling' | 'ringing' | 'connected' | 'missed' | 'no_answer'
  [key: string]: unknown
}

export interface UpdatedMessage {
  id: string | number
  metadata?: string | CallMetadata
  [key: string]: unknown
}

export interface Reminder extends ApiReminder {
  channel?: {
    name?: string
  }
  recipient?: {
    name?: string
    username?: string
  }
}