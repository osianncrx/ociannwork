import { useEffect } from 'react'
import { NotificationService } from '../../../services/notification.service'

export const useTabVisibility = () => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User switched back to this tab - stop highlighting
        NotificationService.stopTabHighlight()
      }
    }

    const handleFocus = () => {
      // User focused on the window - stop highlighting
      NotificationService.stopTabHighlight()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])
}
