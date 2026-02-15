import { UserAvailabilityStatus, UserTeamStatus } from '../constants'
import { TeamSettingField } from './api'
import { ID } from './common'
import { ChatItem, Screen } from './components'

export interface ExtendedChatItem extends ChatItem {
  members?: string[]
  description?: string | null
  created_by?: ID | null
  team_member_status?: UserTeamStatus
  display_name?: string | null
  team_role?: string | null
  custom_field?: string | null
}
export interface PermissionsState {
  teamSetting: TeamSettingField | null
  permissionModal: {
    isOpen: boolean
    title: string
    content: string
    variant: 'info' | 'warning' | 'success' | 'danger'
  }
}

export interface ChatSliceType {
  selectedChat: ExtendedChatItem | any
  allChats: ExtendedChatItem[]
  allTeamMembers: any
  selectedChatMessages: any[]
  selectedPinMessages: any[] 
  selectedFavMessages: any[]
  unreadCounts: any
  lastReadTimestamps: Record<string, string>
  targetMessageId: null | string
  hasUnreadMentions: Record<string, boolean>
  mutedChats: Record<string, { muted_until: string | null; duration: string }>
  currentCallStatus: string
  callParticipants: { participants: any[]; channelId: number | null; chatType: string }
  isMultiSelectMode: boolean
  selectedMessageIds: string[]
}

export interface LoaderState {
  loading: boolean
  pageLoading: Record<string, boolean>
}

export interface ScreenState {
  screen: Screen
  currentTab: string
}

export interface UserStatus {
  status: UserAvailabilityStatus.Online | UserAvailabilityStatus.Offline | UserAvailabilityStatus.Away | string
  lastSeen?: string | null
}

export interface UserStatusState {
  userStatus: Record<string, UserStatus>
}

export interface ShortCutKeyState {
  searchModal: boolean
  searchInput: boolean
}

export interface PublicSettingsResponse {
  message?: string
  settings?: SiteSettings | null
  pages?: Page[]
}

export interface SiteSettings {
  public_site_name?: string
  public_site_description?: string
  support_email?: string
  contact_email?: string
  contact_phone?: string
  company_address?: string
  public_favicon_url?: string | null
  logo_light_url?: string
  logo_dark_url?: string
  sidebar_logo_url?: string | null
  mobile_logo_url?: string | null
  public_otp_digits?: number
  maintenance_mode?: boolean
  maintenance_title?: string
  maintenance_message?: string
  maintenance_image_url?: string | null
  page_404_title?: string
  page_404_content?: string
  page_404_image_url?: string | null
  no_internet_title?: string
  no_internet_content?: string
  no_internet_image_url?: string | null
  settings?: SiteSettings | null
  onboarding_logo?: string
  pages: Page[] | null
  public_loading_logo: string
}

export interface Page {
  id?: number
  title?: string
  slug: string
  content: string
  meta_title?: string | null
  meta_description?: string | null
  status?: 'active' | 'inactive' | string
  created_by?: number
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}
