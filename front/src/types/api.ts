import { ChatType, TeamRole } from '../constants'
import { ID, Status } from './common'
import { ChatItem, SearchMessage } from './components'
import { ExtendedChatItem } from './store'

export type ResponseParserWrapper<T> = {
  data: T
  status: number
}

export interface Message {
  code: string
  message: string
  values: string[]
}

export type DefaultErrorResponse = ResponseParserWrapper<Message[]>

export type FormErrorResponse = ResponseParserWrapper<Record<string, { code: string; values: string[] }[]>>

export type CombinedErrorResponse = DefaultErrorResponse | FormErrorResponse

export interface Params {
  [key: string]: unknown
}

export interface Team {
  id: number
  name: string
  role: string
  status: string
  memberCount: number
  teamCustomField?: string | null
  fields?: CustomField[]
}

export interface CustomField {
  id: number
  team_id: number
  field_name: string
  description: string
  value: string
  user_ids: number[] | null
  parent_field_condition: string | null
  is_user_editable: boolean
  is_mandatory: boolean
  is_user_add_value: boolean
  created_at: string
  updated_at: string
}

export type PageStatus = 'active' | 'deactive'

export interface SingleFAQ {
  id: number
  question: string
  answer: string
  status: PageStatus
  created_at: string
  updated_at: string
}

export interface FAQListResponse {
  message: string
  data: {
    total: number
    page: number
    limit: number
    faqs: SingleFAQ[]
  }
}

export interface SinglePage {
  id: number
  title: string
  slug: string
  content: string
  status: PageStatus
  created_at: string
  updated_at: string
  created_by: number
}

export interface PageListResponse {
  message: string
  data: {
    total: number
    page: number
    limit: number
    pages: SinglePage[]
  }
}

export interface TeamListResponse {
  teams: Team[]
}

export interface FindTeamResponse {
  teams: Team[]
}

export interface ChannelResponse {
  total: number
  page: number
  limit: number
  counts: TeamCount
  channels: SingleCustomField[]
  members?: SingleCustomField[]
}

export interface AccountResponse {
  user: {
    name: string
    avatar: string
    phone: string | null
    country: string | null
    country_code: null
    email: string | null
    role: string | null
  }
  member: {
    team_id: ID
    user_id: ID
    role: TeamRole.Admin | TeamRole.Member
    display_name: string
    custom_field: string | null
    do_not_disturb: boolean
    do_not_disturb_until: string
    status: string
    created_at: string
    updated_at: string
  }
}

export interface TeamResponse {
  id: string
  name: string
  avatar: string
  role: string
  status: string
  memberCount: number
}

export interface TeamDetailsResponse {
  team: Team | null
}

export interface AccountPayload {
  name?: string
  avatar?: string
  phone?: string
  country?: string
  country_code?: string
  email?: string
}

export interface ChannelProfilePayload {
  name?: string
  avatar?: string
  description: string
  type: string
  id: ID
}

export interface UpdatePasswordPayload {
  password: string
  old_password: string
}

export interface SettingsResponse {
  settings: {
    sidebar_logo_url: string
    logo_url: string
    app_name: string
    smtp_host: string | null
    support_email: string
    smtp_port: number | string | null
    smtp_user: string | null
    mail_from_name: string | null
    mail_from_email: string | null
    smtp_pass: string | null
    maintenance_mode?: string
  }
}

export interface TeamUser {
  id: number
  name: string
  email: string
}

export interface SingleTeam {
  id: number
  user_id: number
  name: string
  email: string
  created_at: string
  created_by: TeamUser
  total_members: number
  team_role: string
  status: 'active' | 'pending' | 'blocked' | 'deactivated' | string
  display_name: string
  admins: TeamUser[]
  latest_message_at?: string | null
  avatar?: string | null
  profile_color: string
  country_code?: string
}

export interface TeamCount {
  admins: number
  pending: number
  total: number
  deactivated: number
}

export interface TeamsResponse {
  total: number
  page: number
  limit: number
  counts: TeamCount
  members: SingleTeam[]
  data?: SingleTeam[]
}

export interface TeamResponse {
  id: string
  name: string
  created_by: string
  domain: string
  created_at: string
  updated_at: string
}

export interface TeamCreateResponse {
  teamMember?: {
    role: string
  }
  team?: TeamResponse
}

export interface TeamCreate {
  email: string
  name: string
  team_name: string
  password: string
  country_code: string
  phone: string
  country: string
}

export interface SetupProfile {
  email: string
  name: string
  country_code: string
  phone: string
  password: string
  country: string
}

export interface SetupProfileResponse {
  token: string
  teamMemberRole: string
  fields?: CustomField[]
  message?: string
  user?: {
    id: number
    email: string
    name: string
  }
  showTeamsScreen?: boolean
  teamId?: number
}

export interface MessageMetadata {
  urls?: string[]
  [key: string]: unknown
}

export interface User {
  id: number
  name: string
  email: string
  avatar?: string
  profile_color?: string
  phone?: string
  country?: string
  status?: string
  country_code?: string
}

export interface SingleCustomField {
  id: number
  name: string
  field_name: string
  description: string
  created_at: string
  display_name?: string
  joined_at?: string
  created_by: CustomField
  team_role: string
  role?: string
  status: string
  fields: CustomField[]
  channel_name?: string
  channel_id?: number
  user?: User
}

export interface CustomFieldListResponse {
  total: number
  page: number
  limit: number
  fields: CustomField[]
}

export interface TeamSettingField {
  approved_domains: string | string[]
  block_all_other_domains: boolean
  channel_creation_limit_per_user: number
  direct_join_enabled: boolean
  email_notifications_enabled: boolean
  file_sharing_access: string
  file_sharing_type_scope: string
  allowed_file_upload_types: string | string[]
  invite_only: boolean
  invitation_permission: string
  member_file_upload_limit_mb: number
  members_can_create_channels: boolean
  message_retention_days: number
  notifications_default: string
  private_channel_creation_permission: string
  public_channel_creation_permission: string
  require_approval_to_join: boolean
  team_file_upload_limit_mb: number
  display_full_names: boolean
  auto_joined_channel: number[] | null
  timezone: string
  visibility: string
  allowed_public_channel_creator_ids: string | (string | number)[]
  allowed_file_upload_member_ids: string | (string | number)[]
  allowed_private_channel_creator_ids: string | (string | number)[]
  video_calls_enabled: boolean
  audio_calls_enabled: boolean
  audio_messages_enabled: boolean
  screen_sharing_in_calls_enabled: boolean
  maximum_message_length: number
  default_theme_mode: string
}

export type TeamSettingFormValues = TeamSettingField

export interface SingleTeamSettingField {
  approved_domains: string
  block_all_other_domains: boolean
  channel_creation_limit_per_user: number
  direct_join_enabled: boolean
  email_notifications_enabled: boolean
  file_sharing_access: string
  file_sharing_type_scope: string
  allowed_file_upload_types: string
  invite_only: boolean
  invitation_permission: string
  member_file_upload_limit_mb: number
  members_can_create_channels: boolean
  message_retention_days: number
  notifications_default: string
  private_channel_creation_permission: string
  public_channel_creation_permission: string
  require_approval_to_join: boolean
  team_file_upload_limit_mb: number
  display_full_names: boolean
  timezone: string
  visibility: string
  message: string
  allowed_public_channel_creator_ids: string | (string | number)[]
  allowed_file_upload_member_ids: string | (string | number)[]
  allowed_private_channel_creator_ids: string | (string | number)[]
  video_calls_enabled: boolean
  audio_calls_enabled: boolean
  audio_messages_enabled: boolean
  screen_sharing_in_calls_enabled: boolean
  maximum_message_length: string | number
  default_theme_mode: string
  teamSetting: TeamSettingField
}

export interface TeamSettingResponse {
  teamSetting: TeamSettingField
}

export interface MessagePayload {
  channel_id: number | null
  recipient_id: number | null
  content: string
  message_type: 'text' | 'image' | 'video' | 'file' | string
  file_url: string | null
  file_type: string | null
  metadata: Record<string, any> | null
  parent_id: string | number | null
  sender_id?: string | number | null
  statuses?: Status[]
  sender?: User
  mentions?: string[]
  is_encrypted?: boolean
}

export interface PinConversationPayload {
  type: ChatType.DM | ChatType.Channel | string
  target_id: number | string
  pin: boolean
}

export interface ChannelMember {
  user_id: number | string
  role: string
  User: ChatItem
}
export interface AddToChannelPayload {
  channel_id: number | string
  members: ChannelMember[]
}

export interface RemoveChannelMemberPayload {
  channel_id: number | string
  user_id?: string
  new_role?: string
  user_ids?: string[]
  role?: string
}

export interface Channel {
  id: number
  name: string
  members: ChannelMember[]
  description: string
  created_at: string
  type?: string
  created_by?: string
  avatar?: string
}

export interface ChannelState {
  currentChannel: Channel | null
  currentUserRole: string
  isChannelAdmin: boolean
}
export interface SetReminderPayload {
  channel_id?: ID
  recipient_id?: ID
  message_id?: ID
  remind_at: string
  note: string
}

export interface CancelReminderPayload {
  reminder_id: ID
}

export interface FindChannelResponse {
  channel: {
    id: number
    name: string
    type: string
    members: ChannelMember[]
    description: string
    created_at: string
  }
}

export interface ChannelMember {
  user_id: string | number
  User: ChatItem
}

export interface ChannelUpdateData {
  id: string | number
  name: string
  description: string
  type: string
}

// Add these types to your types file
export interface ChannelMemberToAdd {
  user_id: string | number
  role?: string
}

export interface AddMembersToChannelPayload {
  channel_id: string | number
  members: ChannelMemberToAdd[]
}

export interface AddMembersToChannelResponse {
  message: string
  added: Array<{ user_id: string | number; role: string }>
  skipped: Array<string | number>
}

export interface ApiReminder {
  id: number
  note: string
  remind_at: string
  channel_id?: number
  recipient_id?: number
  is_sent?: number
}

export interface MuteChatPayload {
  target_id: string | number
  target_type: string
  duration?: '1h' | '8h' | '1w' | 'forever'
  value?: boolean
}

export interface DoNotDisturbPayload {
  duration?: '1h' | '8h' | '1w' | 'forever'
  value: boolean
}

export interface UnmuteChatPayload {
  target_id: string | number
  target_type: string
}

export interface CustomFieldPayload {
  value: string
}

export interface ReminderApiResponse {
  message: string
  data: ApiReminder[]
}

export interface AppSettingsResponse {
  message: string
  settings: AppSettings
}

export interface AppSettings {
  banned_ips?: string[]
  allowed_domains?: string[]
  maintenance_allowed_ips?: string[]
  id?: number
  site_name?: string
  site_description?: string
  support_email?: string
  contact_email?: string
  contact_phone?: string
  company_address?: string
  favicon_url?: string
  logo_light_url?: string
  logo_dark_url?: string
  sidebar_logo_url?: string
  mobile_logo_url?: string
  otp_digits?: number
  otp_expiration_minutes?: number
  max_login_attempts?: number
  session_timeout_minutes?: number
  password_min_length?: number
  password_require_special_char?: boolean
  ip_ban_enabled?: boolean
  enable_captcha?: boolean
  captcha_site_key?: string
  maintenance_mode?: boolean
  maintenance_title?: string
  maintenance_message?: string
  maintenance_image_url?: string
  maintenance_start_time?: string | null
  maintenance_end_time?: string | null
  page_404_title?: string
  page_404_content?: string
  page_404_image_url?: string
  no_internet_title?: string
  no_internet_content?: string
  no_internet_image_url?: string
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  mail_from_name?: string
  mail_from_email?: string
  email_encryption?: 'tls' | 'ssl' | string
  enable_email_notifications?: boolean
  enable_push_notifications?: boolean
  new_user_welcome_email?: boolean
  created_at?: string
  updated_at?: string
  favicon_notification_logo?: string
  onboarding_logo?: string
  loading_logo?: string
  settings: AppSettingsResponse | null
}

export interface settings {}

export interface TeamData {
  teamId?: string
  id?: string
  team?: {
    teamId?: string
  }
}

export interface ErrorResponseData {
  message?: string
}

export interface ImportCsvResponse {
  message: string
  imported_count?: number
  failed_count?: number
  errors?: Array<{
    row: number
    message: string
  }>
}

export interface ExportCsvParams {
  filters?: Record<string, string | number | boolean>
  columns?: string[]
  start_date?: string
  end_date?: string
  search?: string
}

export interface UpdateChannelResponse {
  message: string
  channel: {
    id: number
    name: string
    description: string
    type: string
    avatar: string | null
    created_at: string
    updated_at: string
  }
}

export interface FindTeamParams extends Params {
  term?: string
  email: string
}

export interface GetMessagesParams {
  recipient_id?: string | number | null
  channel_id?: string | number | null
  me_chat?: boolean
  limit?: number
  offset?: number
  filter?: 'fav' | 'favorite' | 'pin' | 'pinned' | 'all' | null
}

export interface MessagePageResponse {
  messages: Message[]
  nextOffset: number | null
  hasMore: boolean
  isFirstPage: boolean
  offset: number
  totalCount: number
  chat_type: 'me' | 'channel' | 'dm'
  chat_id: string | number
  filter: string
}

export interface SearchMessagesParams {
  query: string
  scope?: ChatType
  channel_id?: string | number | null
  recipient_id?: string | number | null
  sender_id?: string | number | null
  limit?: number
  offset?: number
  // _timestamp: string |number
}

export interface SearchMessagesResponse {
  messages: SearchMessage[]
  pagination: {
    offset: number
    limit: number
    total: number
    hasMore: boolean
  }
}

export interface SearchMessagesPageResponse {
  messages: SearchMessage[]
  nextOffset: number
  hasMore: boolean
  isFirstPage: boolean
  offset: number
  total: number
}

export interface GetConversationsResponse extends Array<ExtendedChatItem> {}

export type ActionData =
  | SingleCustomField
  | {
      user_id: number
      action: string
      fields: CustomField[]
    }

export interface UpdateTeamResponse {
  message: string
  team: {
    name: string
    avatar: string
    profile_color: string
    domain?: string
    created_by?: string | number
  }
}

export interface CreateChannelResponse {
  message: string
  channel: {
    name: string
    type: string
    id: ID
    created_at: string
    profile_color: string
    avatar: string
    members: string[]
  }
}

export interface MutedChatInfo {
  muted_until: string
  duration: string
}

export type MutedChatsMap = Record<string, MutedChatInfo>

// Impersonation Types
export interface ImpersonationUser {
  id: number | string
  name: string
  email: string
  role: string
  teamId?: number
  teamRole?: string
  canImpersonate?: boolean
}

export interface AvailableUsersResponse {
  success: boolean
  availableUsers: ImpersonationUser[]
  total: number
}

export interface ImpersonationStatusResponse {
  success: boolean
  isImpersonating: boolean
  impersonator?: {
    id: number | string
    name: string
    email: string
    role: string
  } | null
  originalRole?: string
  message?: string
}

export interface StartImpersonationPayload {
  targetUserId: number | string
}

export interface StartImpersonationResponse {
  success: boolean
  message: string
  token: string
  targetUser: {
    id: number | string
    name: string
    email: string
    role: string
  }
  impersonator: {
    id: number | string
    name: string
    email: string
    role: string
  }
  teamId?: number
  targetRole?: string
  session_id?: number | string
}

export interface StopImpersonationResponse {
  success: boolean
  message: string
  token: string
  originalUser: {
    id: number | string
    name: string
    email: string
    role: string
  }
}

export interface TeamMembership {
  id: number
  team_id: number
  user_id: number | string
  role: string
  status: string
  display_name?: string
  createdAt?: string
  updatedAt?: string
}

export interface MyTeamsResponse {
  success: boolean
  teams: TeamMembership[]
  total: number
}