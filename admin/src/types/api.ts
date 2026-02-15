export type ResponseParserWrapper<T> = {
  data: T
  status: number
}

export type PageStatus = 'active' | 'deactive' | 'inactive'

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
export interface AccountResponse {
  user: {
    name: string
    avatar: string
    phone: string | null
    country: string | null
    country_code: null
    email: string | null
  }
}

export interface AccountPayload {
  name?: string
  avatar?: string
  phone?: string
  country?: string
  country_code?: string
  email?: string
}

export interface UpdatePasswordPayload {
  password: string
  old_password: string
}

export interface ResetPasswordPayload {
  new_password: string
  email: string
  otp: string
}

export interface SettingsResponse {
  settings: {
    // logos
    logo_url: string
    sidebar_logo_url: string
    mobile_logo_url: string
    favicon_url: string
    logo_light_url: string | null
    logo_dark_url: string
    // otp
    otp_digits: string
    otp_expiration_minutes: string
    // maintenance
    maintenance_title: string
    maintenance_mode: boolean
    maintenance_message: string
    maintenance_image_url: string
    // 404
    page_404_title: string
    page_404_content: string
    page_404_image_url: string
    // no internet
    no_internet_title: string
    no_internet_content: string
    no_internet_image_url: string
    // email config
    smtp_host: string | null
    smtp_port: number | string | null
    smtp_user: string | null
    mail_from_name: string | null
    mail_from_email: string | null
    smtp_pass: string | null
    // others
    support_email: string
    site_name: string
    password_min_length: string
    company_address: string
    contact_phone: string
    contact_email: string
    site_description: string
    favicon_notification_logo_url: string
    onboarding_logo_url: string
    landing_logo_url: string
  }
}

export interface SettingsPayload {
  logo_url?: string
  app_name?: string
  smtp_host?: string | null
  support_email?: string
  smtp_port?: number | string | null
  smtp_user?: string | null
  mail_from_name?: string | null
  mail_from_email?: string | null
  smtp_pass?: string | null
}

export interface SingleUser {
  id: number
  action: string
  avatar: string
  name: string
  email: string
  country_code: string
  phone: string
  role: 'super_admin' | 'admin' | 'user' | string
  email_verified: boolean
  last_login: string
  created_at: string
  Teams: SingleTeam[]
  status: string
}

export interface UserListResponse {
  total: number
  page: number
  limit: number
  users: SingleUser[]
}

export interface TeamUser {
  id: number
  name: string
  email: string
}

export interface SingleTeam {
  id: number
  name: string
  created_at: string
  created_by: TeamUser
  total_members: number
  admins: TeamUser[]
}

export interface TeamsResponse {
  total: number
  page: number
  limit: number
  teams: SingleTeam[]
}

export interface SingleTeamMember {
  id: number
  name: string
  email: string
  avatar: string
  phone: TeamUser
  country_code: number
  team_role: string
  status: string
}

export interface RoleCounts {
  admins: number
  pending: number
  deactivated: number
}
export interface TeamMemberResponse {
  total: number
  page: number
  limit: number
  members: SingleTeamMember[]
  counts: RoleCounts
}

export interface ChannelTeam {
  id: number
  name: string
}

export interface SingleChannel {
  id: number
  name: string
  created_at: string
  created_by: TeamUser
  total_members: number
  admins: TeamUser[]
  team: ChannelTeam
  avatar?: string
  description?: string
}

export interface ChannelsResponse {
  total: number
  page: number
  limit: number
  channels: SingleChannel[]
}

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

export interface CreateFAQPayload {
  question: string
  answer: string
  status?: PageStatus
}

export interface UpdateFAQPayload {
  question: string
  answer: string
  status?: PageStatus
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

export interface CreatePagePayload {
  title: string
  slug: string
  content: string
  status: PageStatus
  created_by: number
}

export interface UpdatePagePayload {
  title: string
  slug: string
  content: string
  status: PageStatus
}

// dashboard
export interface DashboardResponse {
  data: {
    counts: Counts
    locationWiseUsers: LocationWiseUser[]
    charts: Charts
    insights: Insights
  }
}

export interface Counts {
  totalTeams: number
  totalUsers: number
  totalChannels: number
  newTeamsThisWeek: number
  deactivatedTeams: number
  activatedTeams: number
  totalMembersGrowth: string
  totalChannelsGrowth: string
  totalOnlineUsersGrowth: string
  fileSharedGrowth: string
  totalOnlineUsers: number
  totalFileShared: number
}

export interface LocationWiseUser {
  country: string
  country_code: string
  user_count: number
  percentage: number
}

export interface Charts {
  userGrowthMonthly: UserGrowthMonthly[]
  teamGrowthMonthly: TeamGrowthMonthly[]
}

export interface UserGrowthMonthly {
  month: string
  new_users: number
  total_users: number
}

export interface TeamGrowthMonthly {
  month: string
  new_teams: number
  total_teams: number
}

export interface Insights {
  teamStatusBreakdown: Record<string, unknown>
  recentActivity: RecentActivity[]
  mostActiveUsers: MostActiveUser[]
}

export interface Sender {
  id: number
  name: string
  email: string
  avatar: string | null
  is_online: boolean
  created_at: string
}

export interface MostActiveUser {
  sender_id: number
  message_count: number
  sender: Sender
}

export interface RecentActivity {
  id: number
  avatar: string | null
  name: string
  domain: string
  created_by: number
  created_at: string
  updated_at: string
  Users: UserWithTeamMember[]
}

export interface UserWithTeamMember {
  id: number
  name: string
  email: string
  TeamMember: TeamMember
}

export interface TeamMember {
  team_id: number
  user_id: number
  role: 'admin' | 'member'
  display_name: string
  custom_field: string | null
  do_not_disturb: boolean
  do_not_disturb_until: string | null
  status: 'active' | 'pending'
  created_at: string
  updated_at: string
}

export interface Stats {
  icon: string
  count: number
  label: string
  trendValue: number
  isIncrease: boolean
}

export interface ProgressBarProps {
  seriesValue: number
  title: string
  subtitle: string
  color: string
  backgroundColor?: string
}

export interface Channel {
  id: string
  name: string
  description?: string
  avatar?: string
  admins?: Array<{
    email: string
    name?: string
  }>
  created_at?: string
  updated_at?: string
}

export interface UpdateChannelResponse {
  message: string
  channel: Channel
}

export interface UpdateChannelParams {
  id: string
  name: string
  description: string
  remove_avatar?: string
  avatar?: File
}

export interface ChannelEditFormValues {
  name: string
  description: string
  email: string
}

export interface LocationStateChannel {
  channelData?: Channel
}

export interface UpdateProfileResponse {
  message: string
  user?: {
    id: number
    name: string
    email: string
    avatar?: string
  }
}

export type PlanStatus = 'active' | 'inactive'
export type BillingCycle = 'monthly' | 'yearly' | 'both'

export interface SinglePlan {
  id: number
  name: string
  slug: string
  description: string | null
  price_per_user_per_month: number
  price_per_user_per_year: number | null
  billing_cycle: BillingCycle
  max_storage_mb: number | null
  max_message_search_limit: number
  max_channels: number
  allows_private_channels: boolean
  allows_file_sharing: boolean
  allows_video_calls: boolean
  allows_multiple_delete: boolean
  allows_team_analytics: boolean
  features: Record<string, any>
  display_order: number
  is_default: boolean
  status: PlanStatus
  created_at: string
  updated_at: string
}

export interface PlanListResponse {
  message?: string
  data?: {
    total: number
    page: number
    limit: number
    plans: SinglePlan[]
  }
  plans?: SinglePlan[]
  total?: number
  page?: number
  limit?: number
}

export interface CreatePlanPayload {
  name: string
  slug: string
  description?: string | null
  price_per_user_per_month: number
  price_per_user_per_year?: number | null
  billing_cycle: BillingCycle
  max_channels: number
  max_storage_mb?: number | null
  max_message_search_limit: number
  allows_private_channels: boolean
  allows_file_sharing: boolean
  allows_video_calls: boolean
  allows_multiple_delete: boolean
  features?: Record<string, any>
  display_order?: number
  is_default?: boolean
  status?: PlanStatus
}

export interface UpdatePlanPayload extends CreatePlanPayload {}

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
