export interface SettingFormValues {
  logo_url?: string | null
  app_name?: string
  smtp_host?: string | null
  support_email?: string
  smtp_port?: number | string | null
  smtp_user?: string | null
  mail_from_name?: string | null
  mail_from_email?: string | null
  smtp_pass?: string | null
}

export interface SettingFormValues {
  site_name: string
  site_description: string
  logo_light: string | null
  logo_dark: string
  favicon: string
  sidebar_logo: string
  otp_digits: string | number
  otp_expiration_minutes: string
  company_address: string
  contact_email: string
  contact_phone: string
  no_internet_title: string
  no_internet_content: string
  no_internet_image: string
  page_404_title: string
  page_404_content: string
  page_404_image: string
  maintenance_mode: boolean
  maintenance_image: string
  maintenance_title: string
  maintenance_message: string
  favicon_notification_logo: string
  onboarding_logo: string
  landing_logo: string
}
