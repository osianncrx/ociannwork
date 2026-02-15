import { User } from "../api"

export interface EditProfileFormValues {
  first_name: string
  last_name: string
  country_code: string
  phone: string
  email?: string
  avatar?: string
}

export interface EditProfileProps {
  profileImageFile: File | null
  removeAvatar?: boolean
  setProfileImageFile?: (file: File | null) => void
  setRemoveAvatar?: (remove: boolean) => void
  setPreviewImage?: (preview: string | null) => void
}

export interface UpdatePasswordFormValues {
  new_password: string
  old_password: string
  confirm_password: string
}

export interface UpdateProfileResponse {
  message?: string
  user?: User
}