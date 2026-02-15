import { useEffect } from 'react'
import { queries } from '../../../api'
import { NotificationService } from '../../../services/notification.service'
import { useAppDispatch } from '../../../store/hooks'
import { setMutedChats } from '../../../store/slices/chatSlice'

export const useNotifications = () => {
  const dispatch = useAppDispatch()
  const { data: mutedChatsData } = queries.useGetMutedChats()

  // Initialize notification service
  useEffect(() => {
    if (typeof window !== 'undefined') {
      NotificationService.loadPreferences()
      NotificationService.initialize().catch((e) => console.error('Notification init error:', e))
    }
  }, [])

  // Initialize muted chats
  useEffect(() => {
    if (mutedChatsData) {
      dispatch(setMutedChats(mutedChatsData))
    }
  }, [mutedChatsData, dispatch])

  return {
    // Expose notification methods if needed
    playSound: NotificationService.playSound,
    showNotification: NotificationService.showBrowserNotification,
  }
}
