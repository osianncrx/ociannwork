
import { useEffect, useState } from 'react'

interface UseInternetConnectionReturn {
  isOnline: boolean
  isChecking: boolean
  retry: () => void
}

const useInternetConnection = (): UseInternetConnectionReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine) // Use navigator.onLine as initial state
  const [isChecking, setIsChecking] = useState(true) // Start with checking state

  const checkConnection = async () => {
    setIsChecking(true)
    
    try {
      const endpoints = [
        'https://www.google.com/favicon.ico',
        'https://httpbin.org/status/200',
        '/favicon.ico' // Fallback to local
      ]
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
      
      let success = false
      for (const endpoint of endpoints) {
        try {
          await fetch(endpoint, { 
            method: 'HEAD',
            cache: 'no-cache',
            mode: 'no-cors',
            signal: controller.signal
          })
          success = true
          break
        } catch (e) {
          continue
        }
      }
      
      clearTimeout(timeoutId)
      
      if (success) {
        setIsOnline(true)
      } else {
        setIsOnline(false)
      }
    } catch (error) {
      setIsOnline(false)
    } finally {
      setIsChecking(false)
    }
  }

  const retry = () => {
    checkConnection()
  }

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => {
      // When browser says we're online, verify with actual network request
      checkConnection()
    }

    const handleOffline = () => {
      // When browser says we're offline, we're definitely offline
      setIsOnline(false)
      setIsChecking(false)
    }

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check with small delay to prevent flickering
    const initialCheck = setTimeout(() => {
      checkConnection()
    }, 100)

    // Cleanup
    return () => {
      clearTimeout(initialCheck)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    isChecking,
    retry
  }
}

export default useInternetConnection