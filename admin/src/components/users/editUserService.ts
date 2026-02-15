import { FormikHelpers } from 'formik'
import { toast } from 'react-toastify'
import { NavigateFunction } from 'react-router-dom'
import { CombinedErrorResponse, FormValues, SingleUser, SubmitHandler, UpdateProfileMutation, UpdateProfileResponse } from '../../types'
import { ROUTES } from '../../constants'

export const useEditUserService = () => {
  const handleSubmit: SubmitHandler = async (
    values: FormValues,
    userData: SingleUser | undefined,
    avatar: File | null,
    removeAvatar: boolean,
    navigate: NavigateFunction,
    updateProfile: UpdateProfileMutation,
    { setSubmitting }: FormikHelpers<FormValues>,
  ) => {
    if (!userData?.id) {
      toast.error('User ID is missing')
      setSubmitting(false)
      return
    }

    const formData = new FormData()
    formData.append('id', `${userData.id}`)
    formData.append('name', `${values.first_name} ${values.last_name}`)
    formData.append('phone', values.phone)

    if (removeAvatar) {
      formData.append('remove_avatar', 'true')
    } else if (avatar instanceof File) {
      formData.append('avatar', avatar)
    }

    return new Promise<void>((resolve, reject) => {
      updateProfile(formData, {
        onSuccess: (response: UpdateProfileResponse) => {
          const message = response?.message || 'Profile updated successfully'
          toast.success(message)
          navigate(ROUTES.MANAGE_USERS)
          resolve()
        },
        onError: (err: CombinedErrorResponse) => {
          const errorMessage = Array.isArray(err.data) ? err.data[0]?.message : 'Failed to update profile'
          toast.error(errorMessage)
          reject(new Error(errorMessage))
        },
      })
    })
  }

  return {
    handleSubmit,
  }
}
