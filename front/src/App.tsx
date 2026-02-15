import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Provider, useDispatch } from 'react-redux'
import { BrowserRouter, RouterProvider } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { queries } from './api'
import ComponentNavigation from './components/ComponentNavigation'
import HelpSection from './components/web/help'
import RecordingDetail from './pages/RecordingDetail'
import RecordingPublic from './pages/RecordingPublic'
import { ImageBaseUrl, STORAGE_KEYS } from './constants'
import InternetConnectionWrapper from './layout/InternetConnectionWrapper'
import SocketProvider from './layout/web/components/SocketProvider'
import MaintenancePage from './pages/Maintenance'
import Router from './routers'
import { AcknowledgementModal } from './shared/modal'
import { useAppSelector } from './store/hooks'
import { setSidebarToggle, setToolSidebarToggle, toggleSidebar } from './store/slices/admin/layoutSlice'
import { impersonateLogin, loginSuccess, logout, setUserData } from './store/slices/authSlice'
import { setPublicSetting } from './store/slices/publicSettingSlice'
import { setSetting } from './store/slices/settingSlice'
import { setSearchInput, setSearchModal } from './store/slices/shortCutKeySlice'
import { clearSubscription, setSubscription } from './store/slices/subscriptionSlice'
import { hidePermissionModal, setTeamSetting } from './store/slices/teamSettingSlice'
import { setTeam, setUserTeamData } from './store/slices/teamSlice'
import Store from './store/store'
import { getStorage, getTokenFromUrl } from './utils'
import { useAccountSockets, useEnsurePublicKey } from './utils/hooks'
import { useDynamicFavicon } from './utils/hooks/useDynamicFavicon'
import { useDynamicMeta } from './utils/hooks/useDynamicMeta'

const AppContent = () => {
  const isAdminRoute = window.location.pathname.startsWith('/admin')
  const isHelpsRoute = window.location.pathname === '/help'
  const isRecordingRoute = /^\/recordings\/\d+/.test(window.location.pathname)
  const isPublicRecordingRoute = /^\/r\/[a-f0-9]+/.test(window.location.pathname)
  const dispatch = useDispatch()
  const storage = getStorage()
  const { permissionModal } = useAppSelector((state) => state.teamSetting)
  const { screen } = useAppSelector((store) => store.screen)
  const { team } = useAppSelector((store) => store.team)
  const { mixBackgroundLayout } = useAppSelector((store) => store.theme)
  const { toolSidebarToggle } = useAppSelector((store) => store.admin_layout)
  const { maintenance_mode, site_name, site_description, favicon_url } = useAppSelector((state) => state.setting)
  const { public_favicon_url, public_site_name, public_site_description } = useAppSelector(
    (state) => state.publicSetting,
  )
  const { token } = useAppSelector((store) => store.auth)

  // const impersonationDispatched = useRef(false)
  const { data: publicSettings } = queries.useGetPublicSettings()
  const { data: teamData, refetch: refetchCurrentTeam } = queries.useGetTeamDetails({
    enabled: !!token && screen === 'webScreen',
  })
  const { data: settingData } = queries.useGetSettings({
    enabled: !!token && screen === 'webScreen',
  })
  const { data: teamSettingData, refetch: refetchTeamSettings } = queries.useGetTeamSetting({ enabled: false })
  const {
    data: subscriptionData,
    refetch: refetchSubscription,
    isError: subscriptionError,
  } = queries.useGetCurrentSubscription({ enabled: !!team?.id && screen === 'webScreen', retry: false })

  const completeFaviconUrl =
    public_favicon_url || favicon_url ? `${ImageBaseUrl}${public_favicon_url || favicon_url}` : undefined

  useDynamicFavicon(completeFaviconUrl)
  useDynamicMeta({ title: site_name || public_site_name, description: public_site_description || site_description })

  const impersonationTokenFromUrl = getTokenFromUrl()

  const isImpersonation =
    typeof sessionStorage !== 'undefined' &&
    (sessionStorage.getItem('isImpersonation') == 'true' || !!impersonationTokenFromUrl)

  const { data: currentUserData } = queries.useGetUserDetails({
    enabled: !!token,
    retry: isImpersonation ? 3 : 1,
    retryDelay: isImpersonation ? 1000 : 0,
  })

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tokenFromUrl = urlParams.get('token')
    const personateLocal = urlParams.get('personate-local')
    const teamIdFromUrl = urlParams.get('team-id')

    if (tokenFromUrl) {
      sessionStorage.setItem('isImpersonation', 'true')
      if (personateLocal !== null) {
        storage.setItem(STORAGE_KEYS.PERSONATING_LOCAL, personateLocal)
      }
      if (teamIdFromUrl) {
        const teamObj = { id: Number(teamIdFromUrl) }
        storage.setItem(STORAGE_KEYS.Team, teamObj)
        dispatch(setTeam(teamObj))
      }
      dispatch(impersonateLogin(tokenFromUrl))
      // Set screen to webScreen immediately during impersonation
      const newUrl = window.location.pathname + window.location.hash
      window.history.replaceState({}, document.title, newUrl)
    }
  }, [])

  useEffect(() => {
    if (currentUserData) {
      dispatch(loginSuccess({ token: token, user: currentUserData }))
    }
  }, [currentUserData])

  useEffect(() => {
    if (publicSettings) {
      dispatch(setPublicSetting(publicSettings))
    }
  }, [publicSettings, settingData])

  useEffect(() => {
    const storedTeam = storage.getItem(STORAGE_KEYS.Team)
    if (storedTeam && !team) {
      try {
        dispatch(setTeam(storedTeam))
      } catch (e) {
        console.error('Error parsing stored team:', e)
      }
    }
  }, [dispatch, team])

  useEffect(() => {
    if (currentUserData) {
      dispatch(setUserTeamData(currentUserData?.member))
      dispatch(setUserData(currentUserData?.user))
      if (screen === 'webScreen') {
        refetchCurrentTeam()
      }
    }
    if (teamData?.team) {
      dispatch(setTeam(teamData.team))
      if (screen === 'webScreen') {
        refetchTeamSettings()
        refetchSubscription()
      }
    } else if (teamData && !teamData.team && !isImpersonation) {
      // Prevent logout during impersonation flow
      dispatch(logout())
    }
    if (teamData?.team && teamSettingData) {
      dispatch(setTeamSetting(teamSettingData?.teamSetting))
    }
  }, [currentUserData, teamData, teamSettingData, isImpersonation, screen])

  useEffect(() => {
    if (subscriptionData?.data) {
      dispatch(setSubscription(subscriptionData.data))
    }
    if (subscriptionError) {
      dispatch(clearSubscription())
    }
  }, [dispatch, subscriptionData, subscriptionError])

  useEffect(() => {
    if (settingData) {
      dispatch(setSetting(settingData))
    }
  }, [settingData])

  useEffect(() => {
    if (mixBackgroundLayout === 'light') {
      document.body.classList.add('light')
      document.body.classList.remove('dark-sidebar', 'dark')
    } else if (mixBackgroundLayout === 'dark') {
      document.body.classList.add('dark')
      document.body.classList.remove('dark-sidebar', 'light')
    }
  }, [mixBackgroundLayout])

  useAccountSockets()

  useEnsurePublicKey()

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      dispatch(setSidebarToggle(width >= 768))
      dispatch(setToolSidebarToggle(width >= 768))
      if (width <= 1200) {
        dispatch(toggleSidebar(true))
        if (width <= 992) {
          dispatch(toggleSidebar(false))
        }
      } else {
        dispatch(toggleSidebar(false))
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [dispatch])

  useHotkeys('ctrl+shift+f', () => dispatch(setSearchModal()))
  useHotkeys(
    'ctrl+f',
    (event) => {
      event.preventDefault()
      dispatch(setSearchInput())
    },
    {
      enableOnFormTags: true,
      preventDefault: true,
    },
  )

  const onToolSidebarToggle = () => {
    dispatch(setToolSidebarToggle(!toolSidebarToggle))
  }

  if (maintenance_mode && !isHelpsRoute) {
    return (
      <InternetConnectionWrapper>
        <SocketProvider>
          <MaintenancePage />
          <ToastContainer />
        </SocketProvider>
      </InternetConnectionWrapper>
    )
  }

  return (
    <InternetConnectionWrapper>
      <SocketProvider>
        {screen === 'webScreen' && (
          <div onClick={onToolSidebarToggle} className={`bg-overlay ${toolSidebarToggle ? 'show' : ''}`} />
        )}
        {isPublicRecordingRoute ? (
          <RecordingPublic />
        ) : isRecordingRoute ? (
          <BrowserRouter><RecordingDetail /></BrowserRouter>
        ) : isAdminRoute ? (
          <RouterProvider router={Router} />
        ) : (
          <BrowserRouter>{isHelpsRoute ? <HelpSection /> : <ComponentNavigation />}</BrowserRouter>
        )}
        <ToastContainer />
        <AcknowledgementModal
          isOpen={permissionModal.isOpen}
          onClose={() => dispatch(hidePermissionModal())}
          title={permissionModal.title}
          content={permissionModal.content}
          variant={permissionModal.variant}
          okText="Got it"
        />
      </SocketProvider>
    </InternetConnectionWrapper>
  )
}

function App() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={Store}>
        <AppContent />
      </Provider>
    </QueryClientProvider>
  )
}

export default App
