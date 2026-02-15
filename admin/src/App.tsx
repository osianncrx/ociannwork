import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { Router } from './routers'
import Store from './store/store'
import { toggleSidebar } from './store/slices/layoutSlice'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { setSetting } from './store/slices/settingSlice'
import { queries } from './api'
import { useDynamicFavicon } from './utils/hooks/useDynamicFavicon'
import { useDynamicMeta } from './utils/hooks/useDynamicMeta'
import { ImageBaseUrl } from './constants'

function ResizeHandler() {
  const { data: settingData } = queries.useGetSettings()
  const dispatch = useAppDispatch()
  const { mixBackgroundLayout } = useAppSelector((store) => store.theme)
  const { favicon_url, site_name, site_description } = useAppSelector((state) => state.setting)
  const completeFaviconUrl = favicon_url ? `${ImageBaseUrl}${favicon_url}` : undefined

  useEffect(() => {
    if (mixBackgroundLayout === 'light') {
      document.body.classList.add('light')
      document.body.classList.remove('dark-sidebar', 'dark')
    } else if (mixBackgroundLayout === 'dark') {
      document.body.classList.add('dark')
      document.body.classList.remove('dark-sidebar', 'light')
    }
  }, [mixBackgroundLayout])

  useDynamicFavicon(completeFaviconUrl)
  useDynamicMeta({ title: site_name, description: site_description })

  useEffect(() => {
    if (settingData) {
      dispatch(setSetting(settingData))
    }
  }, [dispatch, settingData])
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
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

  return null
}

function App() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={Store}>
        <ResizeHandler />
        <RouterProvider router={Router} />
        <ToastContainer />
      </Provider>
    </QueryClientProvider>
  )
}

export default App
