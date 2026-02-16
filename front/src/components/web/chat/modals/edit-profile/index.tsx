import { ChangeEvent, FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { TabContent, TabPane } from 'reactstrap'
import { mutations, queries } from '../../../../../api'
import { ImageBaseUrl } from '../../../../../constants'
import { ConfirmModal, SimpleModal } from '../../../../../shared/modal'
import TabHeader from '../../../../../shared/tab/TabHeader'
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks'
import { selectChat, setAllChats } from '../../../../../store/slices/chatSlice'
import { EditProfileFormValues, UpdatePasswordFormValues } from '../../../../../types'
import { EditProfileModalProps } from '../../../../../types/common'
import { toaster } from '../../../../../utils/custom-functions'
import { useImagePreview } from '../../../../../utils/hooks'
import { useCountry } from '../../../../../utils/hooks/useCountry'
import { safeJsonParse } from '../../../utils/custom-functions'
import ChangePassword from './ChangePassword'
import PersonalDetails from './PersonalDetails'
import UserCustomFields from './UserCustomFields'

const EditProfileModal: FC<EditProfileModalProps> = ({ isOpen, toggle }) => {
  const { refetch } = queries.useGetUserDetails()
  const { user } = useAppSelector((store) => store.auth)
  const { userTeamData } = useAppSelector((store) => store.team)
  const { mutate: updateProfile, isPending } = mutations.useUpdateProfile()
  const { mutate: updatePassword, isPending: isPasswordPending } = mutations.useUpdatePassword()
  const [avatar, setAvatar] = useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState<boolean>(false)
  const { t } = useTranslation()
  const { previewUrl: avatarPreview, handleFileSelect, clearPreview, setPreviewUrl } = useImagePreview()
  const [activeTab, setActiveTab] = useState('1')
  const [confirmRemoveMemberOpen, setConfirmRemoveMemberOpen] = useState(false)
  const dispatch = useAppDispatch()
  const { selectedChat, allChats } = useAppSelector((store) => store.chat)
  const { getCountryNameByCode } = useCountry()

  const rawCustomField = userTeamData?.custom_field
  const { data: customFieldList } = queries.useGetCustomFieldList()
  console.log(customFieldList)
  const customFieldValues = useMemo<Record<string, string>>(() => {
    if (!rawCustomField) return {}
    if (typeof rawCustomField === 'object') {
      try {
        return Object.entries(rawCustomField as Record<string, unknown>).reduce<Record<string, string>>(
          (acc, [k, v]) => ({ ...acc, [k]: v == null ? '' : String(v) }),
          {},
        )
      } catch {
        return {}
      }
    }
    if (typeof rawCustomField === 'string') {
      try {
        const parsed = safeJsonParse(rawCustomField)
        if (parsed && typeof parsed === 'object') {
          return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, string>>(
            (acc, [k, v]) => ({ ...acc, [k]: v == null ? '' : String(v) }),
            {},
          )
        }
        return {}
      } catch {
        return {}
      }
    }
    return {}
  }, [rawCustomField])

 const hasCustomFields =
  customFieldList?.fields && customFieldList.fields.length > 0

  useEffect(() => {
    if (isOpen && user) {
      setPreviewUrl(user.avatar ? ImageBaseUrl + `${user.avatar}` : null)
      setRemoveAvatar(false)
      setAvatar(null)
    }
  }, [isOpen, user, setPreviewUrl])

  const handleAvatarChange = useCallback(
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

  const confirmRemoveAvatar = useCallback(() => {
    setAvatar(null)
    clearPreview()
    setRemoveAvatar(true)
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
    setConfirmRemoveMemberOpen(false)
  }, [clearPreview])

  const handleRemoveAvatar = () => {
    if (user.avatar) {
      setConfirmRemoveMemberOpen(true)
    } else {
      confirmRemoveAvatar()
    }
  }

  const handleProfileSubmit = useCallback(
    async (values: EditProfileFormValues) => {
      const countryName = getCountryNameByCode(values.country_code)
      const formData = new FormData()
      formData.append('name', `${values.first_name} ${values.last_name}`)
      formData.append('country_code', values.country_code)
      formData.append('country', countryName)
      formData.append('phone', values.phone)

      if (removeAvatar) {
        formData.append('remove_avatar', 'true')
      } else if (avatar instanceof File) {
        formData.append('avatar', avatar)
      }

      return new Promise<void>((resolve, reject) => {
        updateProfile(formData, {
          onSuccess: (response) => {
            const message = response?.message || 'Perfil actualizado exitosamente'
            toast.success(message)
            refetch()
            toggle()
            resolve()
            if (selectedChat.id === user.id) {
              dispatch(selectChat({ ...selectedChat, ...response.user }))
            }
            const foundChat = allChats.find((chat) => chat.id == user.id)
            if (foundChat) {
              const updatedChats = allChats.map((item) => (item.id == user.id ? { ...item, ...response?.user } : item))
              dispatch(setAllChats(updatedChats))
            }
          },
          onError: (err: any) => {
            toast.error(err.message || 'Error al actualizar perfil')
            reject(err)
          },
        })
      })
    },
    [avatar, removeAvatar, updateProfile, refetch, toggle],
  )

  const handlePasswordSubmit = useCallback(
    async (values: UpdatePasswordFormValues) => {
      return new Promise<void>((resolve, reject) => {
        updatePassword(
          {
            password: values?.new_password,
            old_password: values?.old_password,
          },
          {
            onSuccess: (response) => {
              const message = response?.message || t('password_updated_successfully')
              toaster('success', message)
              resolve()
              toggle()
            },
            onError: (err: any) => {
              toaster('error', err.message || 'Error al actualizar contraseña')
              reject(err)
            },
          },
        )
      })
    },
    [updatePassword],
  )

  const hasAvatar = Boolean(avatarPreview && !removeAvatar)

  const tabItems = useMemo(() => {
    const items = [
      { id: '1', icon: 'security-user-tick', label: 'Datos Personales' },
      { id: '2', icon: 'security-password', label: 'Cambiar Contraseña' },
    ] as { id: string; icon: string; label: string }[]
    if (hasCustomFields) items.push({ id: '3', icon: 'security-password', label: 'Otros Datos' })
    return items
  }, [hasCustomFields])

  return (
    <>
      <SimpleModal
        isOpen={isOpen}
        onClose={toggle}
        title="Preferencias"
        size="lg"
        className="edit-profile-modal custom-form-modal-input"
        closeOnBackdrop={!isPending && !isPasswordPending}
        closeOnEscape={!isPending && !isPasswordPending}
        closable={!isPending && !isPasswordPending}
      >
        <TabHeader
          activeId={activeTab}
          setActiveId={(id) => {
            setActiveTab(id)
          }}
          tabs={tabItems}
        />
        <TabContent activeTab={activeTab}>
          <TabPane tabId="1">
            <PersonalDetails
              user={user}
              hasAvatar={hasAvatar}
              avatarPreview={avatarPreview}
              onAvatarChange={handleAvatarChange}
              onRemoveAvatar={handleRemoveAvatar}
              onSubmit={handleProfileSubmit}
              isPending={isPending}
            />
          </TabPane>

          <TabPane tabId="2">
            <ChangePassword onSubmit={handlePasswordSubmit} isPending={isPasswordPending} />
          </TabPane>
          {hasCustomFields && (
            <TabPane tabId="3" className="other-details-tab">
              <UserCustomFields customFieldValues={customFieldValues} toggle={toggle} />
            </TabPane>
          )}
        </TabContent>
      </SimpleModal>
      <ConfirmModal
        isOpen={confirmRemoveMemberOpen}
        onClose={() => {
          setConfirmRemoveMemberOpen(false)
        }}
        onConfirm={confirmRemoveAvatar}
        title="Eliminar Foto de Perfil"
        subtitle={`¿Estás seguro de que quieres eliminar tu foto de perfil?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        showIcon={true}
        iconId="edit-profile"
      />
    </>
  )
}

export default EditProfileModal
