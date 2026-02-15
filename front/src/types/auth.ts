import { ReactNode } from 'react'

export interface AuthWrapperProps {
  children: ReactNode
  bg?: string
}

export interface OnboardingWrapperProps {
  children: ReactNode
  showBackButton?: boolean
  onBackClick?: () => void
  wrapperClass?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  showTeamsScreen: boolean
  teamId: number | null
  teamMemberRole: string | null
  teamCustomField: string | null
  isProfileUpdated: boolean
  user?: {
    id: number
    name: string
    email: string
    role: string
  }
}

export interface EmailPayload {
  email: string
}

export interface OtpPayload {
  otp: string
  email?: string | null
}

export interface ResetPasswordFormValues {
  otp?: string
  email?: string
  password: string
}

export interface CreateChannelFormValues {
  name: string
  description: string
  type: 'public' | 'private'
  members?: number[]
}

export interface AuthWrapperProps {
  children: ReactNode
}

export interface EmailFormValues {
  email: string
}

export interface EmailCheckResponse {
  userExists: boolean
  emailVerified: boolean
  isProfileUpdated: boolean
}

export interface ResetPasswordPayload {
  otp?: string
  email?: string
  password: string
}

export interface CreateTeamResponse {
  teamMember?: {
    role: string
  }
  token: string
}

export interface CustomFieldFormProps {
  onSubmit: (values: Record<string, string | string[]>) => void
}

export type CustomFieldFormValues = Record<string, string>

export interface TermsProps {
  isOpen: boolean
  toggle: () => void
}
