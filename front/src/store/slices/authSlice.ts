import { createSlice } from '@reduxjs/toolkit'
import { STORAGE_KEYS } from '../../constants'
import { getStorage, getToken } from '../../utils'

const storage = getStorage()
const token = getToken()

const initialState = {
  token: token || null,
  user: storage.getItem(STORAGE_KEYS.USER) || null,
  isAuthenticated: !!token,
  isImpersonating: false,
  impersonator: null as { id: number | string; name: string; email: string; role: string } | null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true
      storage.setItem(STORAGE_KEYS.USER, action.payload.user)
      storage.setItem(STORAGE_KEYS.TOKEN, action.payload.token)
    },
    impersonateLogin: (state, action) => {
      state.token = action.payload
      state.isAuthenticated = true
      storage.setItem(STORAGE_KEYS.TOKEN, action.payload)
    },

    logout: (state) => {
      state.token = null
      state.user = null
      state.isAuthenticated = false
      storage.clear()
      window.location.reload()
      state.isImpersonating = false
      sessionStorage.removeItem('isImpersonation')
    },
    emailCheckSuccess: (_, action) => {
      storage.setItem(STORAGE_KEYS.CHECK_EMAIL, action.payload)
    },
    setForgotPasswordEmail: (_, action) => {
      storage.setItem(STORAGE_KEYS.FORGOT_PASSWORD_EMAIL, action.payload)
      storage.removeItem(STORAGE_KEYS.CHECK_EMAIL)
    },
    createTeamSuccess: (state, action) => {
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true
      storage.setItem(STORAGE_KEYS.USER, action.payload.user)
      storage.setItem(STORAGE_KEYS.TOKEN, action.payload.token)
    },
    clearForgotPasswordEmail: () => {
      storage.removeItem(STORAGE_KEYS.FORGOT_PASSWORD_EMAIL)
      storage.removeItem(STORAGE_KEYS.OTP)
    },
    setUserData: (state, action) => {
      storage.setItem(STORAGE_KEYS.USER, action.payload)
      state.user = action.payload
    },
    removeUserData: (state) => {
      storage.removeItem(STORAGE_KEYS.USER)
      state.user = null
    },
    startImpersonation: (state, action) => {
      state.isImpersonating = true
      state.impersonator = action.payload.impersonator
      state.token = action.payload.token
      state.user = action.payload.targetUser
      storage.setItem(STORAGE_KEYS.TOKEN, action.payload.token)
      storage.setItem(STORAGE_KEYS.USER, action.payload.targetUser)
    },
    stopImpersonation: (state, action) => {
      state.isImpersonating = false
      state.impersonator = null
      state.token = action.payload.token
      state.user = action.payload.originalUser
      storage.setItem(STORAGE_KEYS.TOKEN, action.payload.token)
      storage.setItem(STORAGE_KEYS.USER, action.payload.originalUser)
    },
    setImpersonationStatus: (state, action) => {
      state.isImpersonating = action.payload.isImpersonating
      state.impersonator = action.payload.impersonator || null
    },
  },
})

export const {
  emailCheckSuccess,
  loginSuccess,
  logout,
  setForgotPasswordEmail,
  clearForgotPasswordEmail,
  createTeamSuccess,
  setUserData,
  removeUserData,
  startImpersonation,
  stopImpersonation,
  setImpersonationStatus,
  impersonateLogin,
} = authSlice.actions

export default authSlice.reducer
