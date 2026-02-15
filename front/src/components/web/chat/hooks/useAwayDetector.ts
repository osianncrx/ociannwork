import { useEffect, useRef } from 'react'
import { socket } from '../../../../services/socket-setup'
import { CHAT_CONSTANTS, SOCKET } from '../../../../constants'

const useAwayDetector = (userId: string | null) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isAwayRef = useRef<boolean>(false)

  useEffect(() => {
    if (!userId) return

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // If user was away, set them back to online
      if (isAwayRef.current) {
        isAwayRef.current = false
        socket.emit(SOCKET.Emitters.Set_Online)
      }

      timeoutRef.current = setTimeout(() => {
        isAwayRef.current = true
        socket.emit(SOCKET.Emitters.Set_Away)
      }, CHAT_CONSTANTS.MARK_USER_AWAY) 
    }

    const events: Array<keyof DocumentEventMap> = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ]

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, resetTimer, true)
    })

    resetTimer()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer, true)
      })
    }
  }, [userId])
}

export default useAwayDetector
