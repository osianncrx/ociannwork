import { useEffect, ReactNode } from 'react'
import { queries } from '../../../api'
import { NotificationService } from '../../../services/notification.service'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { selectChat, setMutedChats } from '../../../store/slices/chatSlice'
import { ExtendedChatItem } from '../../../types'
import { useTabVisibility } from '../hooks/useTabVisibility'
import { ImageBaseUrl } from '../../../constants'

interface NotificationProviderProps {
  children: ReactNode
}

const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const dispatch = useAppDispatch()
  const { data: mutedChatsData } = queries.useGetMutedChats()
  const { favicon_url, favicon_notification_logo } = useAppSelector((state) => state.setting)

  useTabVisibility()

  // Initialize notification service
  useEffect(() => {
    if (typeof window !== 'undefined') {
      NotificationService.loadPreferences()
      NotificationService.initialize().catch((e) => console.error('Notification init error:', e))
    }
  }, [])

  useEffect(() => {
    const completeFaviconUrl = favicon_url ? `${ImageBaseUrl}${favicon_url}` : undefined
    const completeFaviconNotiUrl = favicon_notification_logo ? `${ImageBaseUrl}${favicon_notification_logo}` : undefined

    if (completeFaviconUrl) {
      setTimeout(() => {
        NotificationService.updateOriginalFavicon(completeFaviconUrl)
      }, 100)
    }
    if (completeFaviconNotiUrl) {
      setTimeout(() => {
        NotificationService.updateNotificationFavicon(completeFaviconNotiUrl)
      }, 100)
    }
  }, [favicon_url, favicon_notification_logo])

  // Initialize muted chats
  useEffect(() => {
    if (mutedChatsData) {
      dispatch(setMutedChats(mutedChatsData))
    }
  }, [mutedChatsData, dispatch])

  useEffect(() => {
    const handleSelectChat = (event: Event) => {
      const customEvent = event as CustomEvent<{ currentSelectedChat: ExtendedChatItem }>
      const chat = customEvent.detail.currentSelectedChat
      if (chat) {
        dispatch(selectChat(chat))
        // Stop highlighting when user selects a chat
        NotificationService.stopTabHighlight()
      } else {
        console.warn('No chat provided in selectChat event') // Debug log
      }
    }

    window.addEventListener('selectChat', handleSelectChat)
    return () => {
      window.removeEventListener('selectChat', handleSelectChat)
    }
  }, [dispatch])

  return <>{children}</>
}

export default NotificationProvider
