import { CHAT_CONSTANTS, TeamRole } from '../../constants'
import { fileTypes } from '../../data'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import usePlanFeatures from './usePlanFeatures'
import { hidePermissionModal, showPermissionModal } from '../../store/slices/teamSettingSlice'

type FileTypeKey = keyof typeof fileTypes

const useTeamPermissions = () => {
  const dispatch = useAppDispatch()
  const { isTeamAdmin } = useAppSelector((store) => store.team)
  const { user } = useAppSelector((state) => state.auth)
  const { teamSetting } = useAppSelector((state) => state.teamSetting)
  const { isFeatureEnabled } = usePlanFeatures()

  const hasPermission = (action: string): boolean => {
    if (!teamSetting || !user) return false
    const currentUserId = user.id

    switch (action) {
      case 'upload_file':
        if (!isFeatureEnabled('allows_file_sharing', false)) return false
        const fileAccess = teamSetting.file_sharing_access
        if (fileAccess === TeamRole.Admin && !isTeamAdmin) return false
        const allowedMemberIds = Array.isArray(teamSetting.allowed_file_upload_member_ids) 
          ? teamSetting.allowed_file_upload_member_ids 
          : []
        if (
          fileAccess === 'specified_members' &&
          !allowedMemberIds.includes(currentUserId)
        )
          return false
        return true
      case 'upload_file_with_limit':
        if (!isFeatureEnabled('allows_file_sharing', false)) return false
        const fileAccessLimit = teamSetting.file_sharing_access
        if (fileAccessLimit === TeamRole.Admin && !isTeamAdmin) return false
        const allowedMemberIdsLimit = Array.isArray(teamSetting.allowed_file_upload_member_ids) 
          ? teamSetting.allowed_file_upload_member_ids 
          : []
        if (
          fileAccessLimit === 'specified_members' &&
          !allowedMemberIdsLimit.includes(currentUserId)
        )
          return false

        const userFileLimit = teamSetting.member_file_upload_limit_mb || 0
        if (userFileLimit <= 0) return true

        return true
      case 'create_public_channel':
        const pubPerm = teamSetting.public_channel_creation_permission
        if (pubPerm === TeamRole.Admin && !isTeamAdmin) return false
        const allowedPublicCreators = Array.isArray(teamSetting.allowed_public_channel_creator_ids) 
          ? teamSetting.allowed_public_channel_creator_ids 
          : []
        if (
          pubPerm === 'specified_members' &&
          !allowedPublicCreators.includes(currentUserId)
        )
          return false
        return true
      case 'create_private_channel':
        if (!isFeatureEnabled('allows_private_channels', false)) return false
        const privPerm = teamSetting.private_channel_creation_permission
        if (privPerm === TeamRole.Admin && !isTeamAdmin) return false
        const allowedPrivateCreators = Array.isArray(teamSetting.allowed_private_channel_creator_ids) 
          ? teamSetting.allowed_private_channel_creator_ids 
          : []
        if (
          privPerm === 'specified_members' &&
          !allowedPrivateCreators.includes(currentUserId)
        )
          return false
        return true
      case 'invite_member':
        return teamSetting.invitation_permission === 'all' || isTeamAdmin
      default:
        return isTeamAdmin
    }
  }

  const checkPermission = (
    action: string,
    modalConfig?: { title: string; content: string; variant?: 'info' | 'warning' | 'success' | 'danger' },
  ) => {
    const allowed = hasPermission(action)
    if (!allowed && modalConfig) {
      dispatch(showPermissionModal(modalConfig))
    }
    return allowed
  }

  const hideModal = () => {
    dispatch(hidePermissionModal())
  }

  const checkFileSizeLimit = (
    files: File[],
  ): { validFiles: File[]; invalidFiles: { file: File; reason: string }[] } => {
    const userFileLimit = teamSetting?.member_file_upload_limit_mb || 0
    const maxSize = userFileLimit * 1024 * 1024

    const totalSize = files.reduce((sum, file) => sum + file.size, 0)

    const validFiles: File[] = []
    const invalidFiles: { file: File; reason: string }[] = []

    if (userFileLimit > 0 && totalSize > maxSize) {
      files.forEach((file) => {
        invalidFiles.push({
          file,
          reason: `Total file size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds the limit of ${userFileLimit}MB.`,
        })

      })
    } else {
      validFiles.push(...files)
    }

    return { validFiles, invalidFiles }
  }
  
  const getAllowedFileTypes = (): string[] => {
  const allowedTypesRaw = teamSetting?.allowed_file_upload_types || []
  const allowedTypes = Array.isArray(allowedTypesRaw) ? allowedTypesRaw : []

  if (allowedTypes.length === 0) {
    return Object.values(fileTypes)
      .flatMap((type) => type?.mime || [])
      .filter((mime, index, self) => self.indexOf(mime) === index)
  }

  const mimeTypes: Set<string> = new Set()

  allowedTypes.forEach((type: string) => {
    const normalizedType = type.toLowerCase().trim()

    if (normalizedType.includes('/')) {
      mimeTypes.add(normalizedType)
      return
    }

    const fileType = fileTypes[normalizedType as FileTypeKey]
    if (fileType && fileType.mime) {
      fileType.mime.forEach((mime: string) => mimeTypes.add(mime))
      return
    }

    if (normalizedType.startsWith('.')) {
      Object.values(fileTypes).forEach((ft) => {
        if (
          ft &&
          ft.extensions &&
          ft.mime &&
          ft.extensions.split(',').some((ext: string) => ext.trim() === normalizedType)
        ) {
          ft.mime.forEach((mime: string) => mimeTypes.add(mime))
        }
      })
    }
  })

  return Array.from(mimeTypes)
}
  const getAcceptAttribute = (): string => {
    const allowedTypesRaw = teamSetting?.allowed_file_upload_types || []
    const allowedTypes = Array.isArray(allowedTypesRaw) ? allowedTypesRaw : []

    if (allowedTypes.length === 0) {
      return CHAT_CONSTANTS.FILE_TYPE_ALLOWANCE
    }

    const extensions: Set<string> = new Set()

    allowedTypes.forEach((type: string) => {
      const normalizedType = type.toLowerCase().trim()

      if (normalizedType.startsWith('.')) {
        extensions.add(normalizedType)

        const fileType = fileTypes[normalizedType as FileTypeKey]
        if (fileType && fileType.extensions) {
          fileType.extensions.split(',').forEach((ext: string) => extensions.add(ext.trim()))
        } else {
          Object.values(fileTypes).forEach((ft) => {
            if (ft && ft.extensions && ft.extensions.split(',').some((ext: string) => ext.trim() === normalizedType)) {
              ft.extensions.split(',').forEach((ext: string) => extensions.add(ext.trim()))
            }
          })
        }
      } else {
        const fileType = fileTypes[normalizedType as FileTypeKey]
        if (fileType && fileType.extensions) {
          fileType.extensions.split(',').forEach((ext: string) => extensions.add(ext.trim()))
        } else if (normalizedType.includes('/')) {
          Object.values(fileTypes).forEach((ft) => {
            if (ft && ft.mime && ft.extensions && ft.mime.includes(normalizedType)) {
              ft.extensions.split(',').forEach((ext: string) => extensions.add(ext.trim()))
            }
          })
        }
      }
    })

    return Array.from(extensions).join(',')
  }

  const validateFileType = (file: File): { isValid: boolean; reason?: string } => {
    const allowedMimeTypes = getAllowedFileTypes()

    const isValid = allowedMimeTypes.some((type) => file.type.startsWith(type) || file.type === type)

    if (!isValid) {
      const allowedCategoriesRaw = teamSetting?.allowed_file_upload_types || []
      const allowedCategories = Array.isArray(allowedCategoriesRaw) ? allowedCategoriesRaw : []
      const categoryList = allowedCategories.length > 0 ? allowedCategories.join(', ') : 'all supported types'

      return {
        isValid: false,
        reason: `File type '${file.type}' is not allowed. Allowed types: ${categoryList}.`,
      }
    }

    return { isValid: true }
  }

  return {
    hasPermission,
    checkPermission,
    hidePermissionModal: hideModal,
    checkFileSizeLimit,
    getAllowedFileTypes,
    getAcceptAttribute,
    validateFileType,
  }
}

export default useTeamPermissions

