import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import { STORAGE_KEYS, UserStatus, UserTeamStatus } from '../constants'
import { logout } from '../store/slices/authSlice'
import Store from '../store/store'
import { ErrorResponseData, TeamData } from '../types'
import { getStorage, getToken } from '../utils'
import { toaster } from '../utils/custom-functions'

// const excludeScreen = [
//   'email',
//   'forgotPassword',
//   'password',
//   'otp',
//   'resetPassword',
//   'createTeam',
//   'setupProfile',
//   'discoverTeam',
//   'welcome',
//   'termsAndConditions',
//   'redirectScreen',
//   'customFields',
//   'channelBanner',
//   'createChannel',
//   'inviteTeam',
// ]

const bypassMiddlewareEndpoints = ['/settings', '/maintenance'] as const

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

const middleware = (config: AxiosRequestConfig): boolean => {
  if (bypassMiddlewareEndpoints.some((endpoint) => config.url?.includes(endpoint))) {
    return true
  }

  const state = Store.getState()
  const user = state.auth?.user
  const settings = state.setting
  const userTeamData = state.team?.userTeamData

  if (user?.status === UserStatus.Deactivated || userTeamData?.status === UserTeamStatus.Deactivated) {
    toaster('error', 'Your account has been deactivated. Please contact support.')
    setTimeout(() => {
      Store.dispatch(logout())
      window.location.href = '/'
    }, 1500)
    throw new Error('User account deactivated')
  }

  if (settings.maintenance_mode) {
    throw new Error('Application is in maintenance mode')
  }

  return true
}

apiClient.interceptors.request.use(
  (config) => {
    try {
      middleware(config)
    } catch (error) {
      return Promise.reject(error)
    }

    const token = getToken()
    const storage = getStorage()
    const team = storage.getItem(STORAGE_KEYS.Team) as TeamData | null
    const teamId = team?.teamId || team?.id || team?.team?.teamId

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (teamId) {
      config.headers['X-Team-ID'] = teamId
    }

    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json'
    }

    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ErrorResponseData>) => {

    // if (!teamId || error.response?.status === 401 && currentScreen && !excludeScreen.includes(currentScreen)) {
    //   Store.dispatch(logout())
    //   window.location.href = '/'
    //   console.warn('Session expired. Please login again.')
    // }

    const message = error.response?.data?.message || error.message || 'Something went wrong'
    return Promise.reject(new Error(message))
  },
)

export default apiClient
