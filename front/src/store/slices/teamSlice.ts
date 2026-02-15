import { createSlice } from '@reduxjs/toolkit'
import { STORAGE_KEYS, TeamRole } from '../../constants'
import { getStorage } from '../../utils'

const storage = getStorage()

const initialState = {
  teamName: storage.getItem(STORAGE_KEYS.TEAM_NAME) || null,
  team: storage.getItem(STORAGE_KEYS.Team) || null,
  teamRole: storage.getItem(STORAGE_KEYS.Team_Member_Role) || null,
  isTeamAdmin: storage.getItem(STORAGE_KEYS.Team_Member_Role) == TeamRole.Admin || false,
  userTeamData: storage.getItem(STORAGE_KEYS.USER_TEAM_DATA) || null,
}

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    setTeamName: (state, action) => {
      storage.setItem(STORAGE_KEYS.TEAM_NAME, action.payload)
      state.teamName = action.payload
    },
    removeTeamName: (state) => {
      storage.removeItem(STORAGE_KEYS.TEAM_NAME)
      state.teamName = null
    },
    setTeam: (state, action) => {
      state.team = action.payload
      storage.setItem(STORAGE_KEYS.Team, action.payload)
    },
    removeTeam: (state) => {
      state.team = null
      storage.removeItem(STORAGE_KEYS.Team)
    },
    setTeamRole: (state, action) => {
      state.teamRole = action.payload
      storage.setItem(STORAGE_KEYS.Team_Member_Role, action.payload)
      const isAdmin = action.payload == TeamRole.Admin
      state.isTeamAdmin = isAdmin
    },
    removeTeamRole: (state) => {
      state.teamRole = null
      storage.removeItem(STORAGE_KEYS.Team_Member_Role)
    },
    setUserTeamData: (state, action) => {
      state.userTeamData = action.payload
      storage.setItem(STORAGE_KEYS.USER_TEAM_DATA, action.payload)
      const isAdmin = action?.payload?.role == TeamRole.Admin
      state.isTeamAdmin = isAdmin
      state.teamRole = action.payload?.role
      storage.setItem(STORAGE_KEYS.Team_Member_Role, action?.payload?.role)
    },
    updateDndState: (
      state,
      action: {
        payload: { userId: string | number; teamId: string | number; do_not_disturb: boolean; do_not_disturb_until: string | null }
      },
    ) => {
      const { userId, do_not_disturb, do_not_disturb_until } = action.payload
      if (state.userTeamData && String(state.userTeamData.user_id) === String(userId)) {
        state.userTeamData = {
          ...state.userTeamData,
          do_not_disturb,
          do_not_disturb_until,
        }
        storage.setItem(STORAGE_KEYS.USER_TEAM_DATA, state.userTeamData)
      }
    },
    removeUserTeamData: (state) => {
      state.userTeamData = null
      storage.removeItem(STORAGE_KEYS.USER_TEAM_DATA)
    },
    updateMemberRoleLocal: (
      state,
      action: { payload: { userId: string | number; role: 'admin' | 'member' | string } },
    ) => {
      const { userId, role } = action.payload
      if (state.userTeamData && String(state.userTeamData.user_id) === String(userId)) {
        state.userTeamData = { ...state.userTeamData, role }
        storage.setItem(STORAGE_KEYS.USER_TEAM_DATA, state.userTeamData)
      }
    },
  },
})

export const {
  setUserTeamData,
  updateDndState,
  updateMemberRoleLocal,
  removeUserTeamData,
  setTeamName,
  removeTeamName,
  setTeam,
  removeTeam,
  setTeamRole,
  removeTeamRole,
} = teamSlice.actions

export default teamSlice.reducer
