import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useImagePreview from '../../utils/hooks/useImagePreview'
import { ImageBaseUrl } from '../../constants'
import { FormValues, LocationState } from '../../types'

export const useEditUser = () => {
  const location = useLocation()
  const userData = (location.state as LocationState)?.userData
  const { previewUrl: avatarPreview, handleFileSelect, clearPreview, setPreviewUrl } = useImagePreview()
  const [removeAvatar, setRemoveAvatar] = useState<boolean>(false)
  const [confirmRemoveMemberOpen, setConfirmRemoveMemberOpen] = useState(false)
  const [avatar, setAvatar] = useState<File | null>(null)
  const hasAvatar = Boolean(avatarPreview && !removeAvatar)

  useEffect(() => {
    if (userData) {
      setPreviewUrl(userData.avatar ? ImageBaseUrl + `${userData.avatar}` : null)
      setRemoveAvatar(false)
      setAvatar(null)
    }
  }, [userData, setPreviewUrl])

  const initialValues: FormValues = {
    first_name: userData?.name?.split(' ')[0] || '',
    last_name: userData?.name?.split(' ')[1] || '',
    phone: userData?.phone || '',
    country_code: userData?.country_code || '',
    email: userData?.email || '',
  }

  const confirmRemoveAvatar = useCallback(() => {
    setAvatar(null)
    clearPreview()
    setRemoveAvatar(true)
    const fileInput = document.getElementById('user-avatar-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
    setConfirmRemoveMemberOpen(false)
  }, [clearPreview])

  const onAvatarChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setAvatar(file)
        setRemoveAvatar(false)
        handleFileSelect(file)
      }
    },
    [handleFileSelect],
  )

  const onRemoveAvatar = () => {
    if (userData?.avatar) {
      setConfirmRemoveMemberOpen(true)
    } else {
      confirmRemoveAvatar()
    }
  }

  return {
    userData,
    initialValues,
    avatarPreview,
    removeAvatar,
    confirmRemoveMemberOpen,
    avatar,
    hasAvatar,
    setConfirmRemoveMemberOpen,
    confirmRemoveAvatar,
    onAvatarChange,
    onRemoveAvatar,
  }
}
