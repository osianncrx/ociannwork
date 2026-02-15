import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { safeJsonParse } from '../../components/web/utils/custom-functions'
import { PermissionsState, TeamSettingField } from '../../types'

const initialState: PermissionsState = {
  teamSetting: null,
  permissionModal: {
    isOpen: false,
    title: '',
    content: '',
    variant: 'info',
  },
}

const teamSettingSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    setTeamSetting: (state, action: PayloadAction<TeamSettingField>) => {
      state.teamSetting = {
        ...action.payload,
        approved_domains:
          typeof action?.payload?.approved_domains === 'string'
            ? safeJsonParse(action?.payload?.approved_domains || '[]')
            : action?.payload?.approved_domains,
        allowed_public_channel_creator_ids:
          typeof action?.payload?.allowed_public_channel_creator_ids === 'string'
            ? safeJsonParse(action?.payload?.allowed_public_channel_creator_ids || '[]')
            : action?.payload?.allowed_public_channel_creator_ids,
        allowed_private_channel_creator_ids:
          typeof action?.payload?.allowed_private_channel_creator_ids === 'string'
            ? safeJsonParse(action?.payload?.allowed_private_channel_creator_ids || '[]')
            : action?.payload?.allowed_private_channel_creator_ids,
        allowed_file_upload_types:
          typeof action?.payload?.allowed_file_upload_types === 'string'
            ? safeJsonParse(action?.payload?.allowed_file_upload_types || '[]')
            : action?.payload?.allowed_file_upload_types,
        allowed_file_upload_member_ids:
          typeof action?.payload?.allowed_file_upload_member_ids === 'string'
            ? safeJsonParse(action?.payload?.allowed_file_upload_member_ids || '[]')
            : action?.payload?.allowed_file_upload_member_ids,
      }
    },
    clearTeamSetting: (state) => {
      state.teamSetting = null
    },
    showPermissionModal: (
      state,
      action: PayloadAction<{ title: string; content: string; variant?: 'info' | 'warning' | 'success' | 'danger' }>,
    ) => {
      state.permissionModal = {
        isOpen: true,
        title: action?.payload?.title,
        content: action?.payload?.content,
        variant: action?.payload?.variant || 'info',
      }
    },
    hidePermissionModal: (state) => {
      state.permissionModal.isOpen = false
    },
  },
})

export const { setTeamSetting, clearTeamSetting, showPermissionModal, hidePermissionModal } = teamSettingSlice.actions

export default teamSettingSlice.reducer
