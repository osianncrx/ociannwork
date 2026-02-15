export interface LoaderState {
  loading: boolean
  pageLoading: Record<string, boolean>
}

export interface ScreenState {
  screen: Screen
  currentTab: string
}

export interface UserStatus {
  status: 'online' | 'offline' | 'away' | string
  lastSeen?: string | null
}

export interface UserStatusState {
  userStatus: Record<string, UserStatus>
}

export interface ShortCutKeyState {
  searchModal: boolean
  searchInput: boolean
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
  logo_light_url?: string | null
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
  maintenance_image?: string
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
  settings: AppSettingsResponse | null
}

export interface User {
  id: string | number
  email: string
  name?: string
  role?: string
}

export interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isImpersonating?: boolean
  impersonator?: { id: string | number; name: string; email: string; role: string } | null
}

export interface LoginPayload {
  token: string
  user: User
}
