import { ImagePath } from '../constants'
import { ExtendedNotificationOptions, FallbackAudioElement, WebkitWindow } from '../types'

export class NotificationService {
  private static notificationSound = new Audio('/assets/sounds/notification.wav')
  private static audioContext: AudioContext | null = null
  private static callSoundBuffer: AudioBuffer | null = null
  private static outgoingCallSoundBuffer: AudioBuffer | null = null
  private static isSoundEnabled = true
  private static isBrowserNotificationEnabled = false
  private static notificationClickHandlers: Map<number, () => void> = new Map()
  private static notificationCounter = 0
  private static isInitialized = false
  private static isRinging = false
  private static isOutgoingRinging = false
  private static ringingSource: AudioBufferSourceNode | null = null
  private static outgoingRingingSource: AudioBufferSourceNode | null = null
  private static waitingCallAudio: HTMLAudioElement | null = null

  // Tab highlighting properties
  private static isTabHighlighted = false
  private static blinkInterval?: NodeJS.Timeout
  private static originalTitle = document.title
  private static originalFavicon = '' 
  private static notificationFavicon = ''
  private static currentNotificationData: {
    unreadCount: number
    senderName: string
    messageText: string
  } | null = null

  private static captureOriginalFavicon() {
    const existingFavicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    if (existingFavicon) {
      this.originalFavicon = existingFavicon.href
    }
  }

  static updateNotificationFavicon(newFaviconUrl: string) {
    this.notificationFavicon = newFaviconUrl
  }

  static {
    this.initialize().catch((error) => console.error('Static initialization failed:', error))
  }

  static async initialize() {
    if (typeof window === 'undefined' || this.isInitialized) return

    this.captureOriginalFavicon()

    try {
      const AudioContextConstructor = window.AudioContext || (window as WebkitWindow).webkitAudioContext
      if (!AudioContextConstructor) {
        throw new Error('AudioContext not supported')
      }
      this.audioContext = new AudioContextConstructor()

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch((e) => console.warn('Initial AudioContext resume failed:', e))
      }

      const resumeAudio = async () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          await this.audioContext.resume()
        }
        document.removeEventListener('click', resumeAudio)
        document.removeEventListener('touchstart', resumeAudio)
        document.removeEventListener('keydown', resumeAudio)
      }

      document.addEventListener('click', resumeAudio, { once: true, passive: true })
      document.addEventListener('touchstart', resumeAudio, { once: true, passive: true })
      document.addEventListener('keydown', resumeAudio, { once: true, passive: true })

      if (!('Notification' in window)) {
        console.warn('Browser does not support notifications')
        return
      }

      this.loadPreferences()

      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        this.isBrowserNotificationEnabled = permission === 'granted'
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('browserNotificationsEnabled', String(this.isBrowserNotificationEnabled))
        }
      } else {
        this.isBrowserNotificationEnabled = Notification.permission === 'granted'
      }

      try {
        this.notificationSound.volume = 0.5
        this.notificationSound.preload = 'auto'

        const loadPromise = new Promise((resolve, reject) => {
          this.notificationSound.addEventListener('canplaythrough', resolve, { once: true })
          this.notificationSound.addEventListener('error', reject, { once: true })
        })

        this.notificationSound.load()
        await loadPromise
      } catch (e) {
        console.warn('Notification sound preload failed:', e)
        this.createFallbackSound()
      }

      try {
        const response = await fetch('/assets/sounds/incoming-call.wav')
        const arrayBuffer = await response.arrayBuffer()
        this.callSoundBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      } catch (e) {
        console.warn('Incoming call sound preload failed:', e)
        this.createFallbackCallSound()
      }

      try {
        const outgoingResponse = await fetch('/assets/sounds/incoming-call.wav')
        const outgoingArrayBuffer = await outgoingResponse.arrayBuffer()
        this.outgoingCallSoundBuffer = await this.audioContext.decodeAudioData(outgoingArrayBuffer)
      } catch (e) {
        console.warn('Outgoing call sound preload failed:', e)
        this.createFallbackOutgoingCallSound()
      }

      this.isInitialized = true
    } catch (error) {
      console.error('Notification initialization failed:', error)
      this.createFallbackCallSound()
    }
  }

  private static createFallbackSound() {
    try {
      const AudioContextConstructor = window.AudioContext || (window as WebkitWindow).webkitAudioContext
      if (!AudioContextConstructor) {
        throw new Error('AudioContext not supported')
      }
      const audioContext = new AudioContextConstructor()

      const fallbackAudio: FallbackAudioElement = {
        play: () => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)

          oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

          oscillator.start()
          oscillator.stop(audioContext.currentTime + 0.5)
          return Promise.resolve()
        },
        currentTime: 0,
        load: () => {},
      }

      this.notificationSound = fallbackAudio as unknown as HTMLAudioElement
    } catch (e) {
      console.warn('Fallback sound creation failed:', e)
    }
  }

  private static createFallbackCallSound() {
    try {
      if (!this.audioContext) {
        const AudioContextConstructor = window.AudioContext || (window as WebkitWindow).webkitAudioContext
        if (!AudioContextConstructor) {
          throw new Error('AudioContext not supported')
        }
        this.audioContext = new AudioContextConstructor()
      }
      this.callSoundBuffer = null
      this.startCallRingtone = async () => {
        if (!this.isSoundEnabled || this.isRinging || !this.audioContext) return

        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume()
        }
        this.isRinging = true
        const playTone = () => {
          if (!this.isRinging || !this.audioContext) return

          const oscillator = this.audioContext.createOscillator()
          const gainNode = this.audioContext.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(this.audioContext.destination)

          oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime)
          gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3)

          oscillator.start()
          oscillator.stop(this.audioContext.currentTime + 0.3)

          setTimeout(() => {
            if (!this.isRinging || !this.audioContext) return
            const oscillator2 = this.audioContext.createOscillator()
            const gainNode2 = this.audioContext.createGain()
            oscillator2.connect(gainNode2)
            gainNode2.connect(this.audioContext.destination)
            oscillator2.frequency.setValueAtTime(600, this.audioContext.currentTime)
            gainNode2.gain.setValueAtTime(0.1, this.audioContext.currentTime)
            gainNode2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3)
            oscillator2.start()
            oscillator2.stop(this.audioContext.currentTime + 0.3)

            setTimeout(playTone, 1000)
          }, 400)
        }

        playTone()
      }
    } catch (e) {
      console.warn('Fallback incoming call sound creation failed:', e)
    }
  }

  private static createFallbackOutgoingCallSound() {
    try {
      if (!this.audioContext) {
        const AudioContextConstructor = window.AudioContext || (window as WebkitWindow).webkitAudioContext
        if (!AudioContextConstructor) {
          throw new Error('AudioContext not supported')
        }
        this.audioContext = new AudioContextConstructor()
      }

      this.outgoingCallSoundBuffer = null
      this.startOutgoingCallRingtone = async () => {
        if (!this.isSoundEnabled || this.isOutgoingRinging || !this.audioContext) return
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume()
        }
        this.isOutgoingRinging = true
        const playTone = () => {
          if (!this.isOutgoingRinging || !this.audioContext) return
          const oscillator = this.audioContext.createOscillator()
          const gainNode = this.audioContext.createGain()
          oscillator.connect(gainNode)
          gainNode.connect(this.audioContext.destination)
          oscillator.frequency.setValueAtTime(700, this.audioContext.currentTime)
          gainNode.gain.setValueAtTime(0.08, this.audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4)
          oscillator.start()
          oscillator.stop(this.audioContext.currentTime + 0.4)

          setTimeout(() => {
            if (!this.isOutgoingRinging || !this.audioContext) return
            const oscillator2 = this.audioContext.createOscillator()
            const gainNode2 = this.audioContext.createGain()
            oscillator2.connect(gainNode2)
            gainNode2.connect(this.audioContext.destination)
            oscillator2.frequency.setValueAtTime(500, this.audioContext.currentTime)
            gainNode2.gain.setValueAtTime(0.08, this.audioContext.currentTime)
            gainNode2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4)
            oscillator2.start()
            oscillator2.stop(this.audioContext.currentTime + 0.4)
            setTimeout(playTone, 1200)
          }, 500)
        }

        playTone()
      }
    } catch (e) {
      console.warn('Fallback outgoing call sound creation failed:', e)
    }
  }

  static playSound() {
    if (!this.isSoundEnabled) return
    try {
      this.notificationSound.currentTime = 0
      const playPromise = this.notificationSound.play()

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Notification sound played successfully')
          })
          .catch((e) => {
            console.warn('Sound play failed, attempting user interaction fallback:', e)
            this.addUserInteractionListener()
          })
      }
    } catch (error) {
      console.error('Sound playback error:', error)
      this.addUserInteractionListener()
    }
  }

  static async startCallRingtone() {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.isSoundEnabled || this.isRinging || !this.audioContext) {
      if (!this.callSoundBuffer) {
        this.createFallbackCallSound()
        await this.startCallRingtone()
      }
      return
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      this.isRinging = true
      const source = this.audioContext.createBufferSource()
      source.buffer = this.callSoundBuffer
      source.loop = true
      source.connect(this.audioContext.destination)
      source.start()
      this.ringingSource = source
      source.onended = () => {
        if (this.isRinging && this.audioContext && this.callSoundBuffer) {
          const newSource = this.audioContext.createBufferSource()
          newSource.buffer = this.callSoundBuffer
          newSource.loop = true
          newSource.connect(this.audioContext.destination)
          newSource.start()
          this.ringingSource = newSource
        }
      }
    } catch (error) {
      console.error('Incoming call ringtone playback error:', error)
      this.createFallbackCallSound()
      this.addUserInteractionListenerForCall()
    }
  }

  static async startOutgoingCallRingtone() {
    if (!this.isInitialized) {
      await this.initialize()
    }
    if (!this.isSoundEnabled || this.isOutgoingRinging || !this.audioContext || !this.outgoingCallSoundBuffer) {
      if (!this.outgoingCallSoundBuffer) {
        this.createFallbackOutgoingCallSound()
        await this.startOutgoingCallRingtone()
      }
      return
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      this.isOutgoingRinging = true
      const source = this.audioContext.createBufferSource()
      source.buffer = this.outgoingCallSoundBuffer
      source.loop = true
      source.connect(this.audioContext.destination)
      source.start()
      this.outgoingRingingSource = source

      source.onended = () => {
        if (this.isOutgoingRinging && this.audioContext && this.outgoingCallSoundBuffer) {
          const newSource = this.audioContext.createBufferSource()
          newSource.buffer = this.outgoingCallSoundBuffer
          newSource.loop = true
          newSource.connect(this.audioContext.destination)
          newSource.start()
          this.outgoingRingingSource = newSource
        }
      }
    } catch (error) {
      console.error('Outgoing call ringtone playback error:', error)
      this.addUserInteractionListenerForOutgoingCall()
    }
  }

  static stopCallRingtone() {
    this.isRinging = false

    if (this.ringingSource) {
      try {
        this.ringingSource.stop()
        this.ringingSource.disconnect()
        this.ringingSource = null
      } catch (e) {
        console.warn('Error stopping incoming call ringtone:', e)
      }
    }
  }

  static stopOutgoingCallRingtone() {
    this.isOutgoingRinging = false
    if (this.outgoingRingingSource) {
      try {
        this.outgoingRingingSource.stop()
        this.outgoingRingingSource.disconnect()
        this.outgoingRingingSource = null
      } catch (e) {
        console.warn('Error stopping outgoing call ringtone:', e)
      }
    }
  }

  static playCallSound() {
    this.startCallRingtone()
  }

  static playWaitingCallNotification() {
    if (!this.isSoundEnabled) return

    this.stopWaitingCallNotification()

    try {
      this.waitingCallAudio = new Audio('/assets/sounds/incoming-call.wav')
      this.waitingCallAudio.volume = 0.5
      this.waitingCallAudio.loop = false // Play once

      this.waitingCallAudio.play().catch((error) => {
        console.warn('Waiting call notification play failed:', error)
      })
    } catch (error) {
      console.error('Error playing waiting call notification:', error)
    }
  }

  static stopWaitingCallNotification() {
    if (this.waitingCallAudio) {
      try {
        this.waitingCallAudio.pause()
        this.waitingCallAudio.currentTime = 0
        this.waitingCallAudio = null
      } catch (error) {
        console.warn('Error stopping waiting call notification:', error)
      }
    }
  }

  static stopCallSound() {
    this.stopCallRingtone()
    this.stopOutgoingCallRingtone()
    this.stopWaitingCallNotification()
  }

  private static addUserInteractionListenerForCall() {
    const playOnInteraction = async () => {
      if (this.isRinging) {
        await this.startCallRingtone()
      }
    }

    ;['click', 'touchstart', 'keydown'].forEach((event) => {
      document.addEventListener(event, playOnInteraction, { once: true, passive: true })
    })
  }

  private static addUserInteractionListenerForOutgoingCall() {
    const playOnInteraction = async () => {
      await this.startOutgoingCallRingtone()
    }

    ;['click', 'touchstart', 'keydown'].forEach((event) => {
      document.addEventListener(event, playOnInteraction, { once: true, passive: true })
    })
  }

  private static addUserInteractionListener() {
    const playOnInteraction = () => {
      try {
        this.notificationSound.currentTime = 0
        this.notificationSound
          .play()
          .then(() => console.log('Sound played after user interaction'))
          .catch((e) => console.warn('Fallback sound play failed:', e))
      } catch (e) {
        console.warn('User interaction sound play failed:', e)
      }
    }

    const events = ['click', 'touchstart', 'keydown']
    const addListeners = () => {
      events.forEach((event) => {
        document.addEventListener(event, playOnInteraction, { once: true, passive: true })
      })
    }

    events.forEach((event) => {
      document.removeEventListener(event, playOnInteraction)
    })
    addListeners()
  }

  static startTabHighlight(
    unreadCount?: number,
    senderName?: string,
    messageText?: string,
  ) {
    if (this.isTabHighlighted) {
      // Update the notification data if already highlighted
      if (unreadCount !== undefined && senderName && messageText) {
        this.currentNotificationData = {
          unreadCount,
          senderName,
          messageText,
        }
      }
      return
    }

    this.isTabHighlighted = true
    this.originalTitle = document.title

    // Store notification data if provided
    if (unreadCount !== undefined && senderName && messageText) {
      this.currentNotificationData = {
        unreadCount,
        senderName,
        messageText,
      }
    }

    let showNotificationIcon = true
    this.setFavicon(this.notificationFavicon)

    this.blinkInterval = setInterval(() => {
      if (showNotificationIcon) {
        this.setFavicon(this.notificationFavicon)
        // Format: "Aaron stone - Heyyy"
        if (this.currentNotificationData) {
          const { senderName, messageText } = this.currentNotificationData
          const displayText = messageText && messageText.trim() ? messageText : '[Message]'
          const truncatedMessage = displayText.length > 30 ? displayText.substring(0, 30) + '...' : displayText
          document.title = `${senderName} - ${truncatedMessage}`
        } else {
          document.title = `New Message`
        }
      } else {
        this.setFavicon(this.originalFavicon)
        document.title = this.originalTitle
      }
      showNotificationIcon = !showNotificationIcon
    }, 1000)
  }

  static stopTabHighlight() {
    if (!this.isTabHighlighted) return

    this.isTabHighlighted = false
    this.currentNotificationData = null

    if (this.blinkInterval) {
      clearInterval(this.blinkInterval)
      this.blinkInterval = undefined
    }

    // Restore original state
    this.setFavicon(this.originalFavicon)
    document.title = this.originalTitle
  }

  static updateOriginalFavicon(newFaviconUrl: string) {
    this.originalFavicon = newFaviconUrl

    if (!this.isTabHighlighted) {
      this.setFavicon(newFaviconUrl)
    }
  }

  static updateOriginalTitle(newTitle: string) {
    // Always update originalTitle so when highlighting stops, it restores the correct title
    this.originalTitle = newTitle
    // Only update document.title if tab is not currently highlighted
    if (!this.isTabHighlighted) {
      document.title = newTitle
    }
  }

  static getIsTabHighlighted(): boolean {
    return this.isTabHighlighted
  }

  private static setFavicon(url: string) {
    const links = document.querySelectorAll("link[rel*='icon']")
    links.forEach((link) => link.remove())

    const getImageType = (url: string) => {
      const lowerUrl = url.toLowerCase()
      if (lowerUrl.includes('.png')) return 'image/png'
      if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) return 'image/jpeg'
      if (lowerUrl.includes('.svg')) return 'image/svg+xml'
      if (lowerUrl.includes('.gif')) return 'image/gif'
      if (lowerUrl.includes('.webp')) return 'image/webp'
      if (lowerUrl.includes('.ico')) return 'image/x-icon'
      return 'image/png'
    }

    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = getImageType(url)
    link.href = url
    document.head.appendChild(link)
  }

  static async showBrowserNotification(
    title: string,
    options?: ExtendedNotificationOptions,
  ): Promise<Notification | null> {
    if (!this.isBrowserNotificationEnabled) {
      await this.initialize()
      if (!this.isBrowserNotificationEnabled) {
        return null
      }
    }

    if (document.hidden) {
      this.startTabHighlight()
    }

    // Only show notifications when tab is not active
    if (!document.hidden) {
      return null
    }

    try {
      const notification = new Notification(title, {
        icon: `${ImagePath}/layout/1.png`,
        badge: `${ImagePath}/layout/1.png`,
        requireInteraction: false,
        silent: false,
        timestamp: Date.now(),
        ...options,
      })

      const notificationId = ++this.notificationCounter
      const currentSelectedChat = options?.currentSelectedChat

      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        const handler = this.notificationClickHandlers.get(notificationId)
        if (handler) handler()
        if (currentSelectedChat) {
          const selectChatEvent = new CustomEvent('selectChat', { detail: { currentSelectedChat } })
          window.dispatchEvent(selectChatEvent)
        }
        // Stop highlighting when notification is clicked
        this.stopTabHighlight()
        notification.close()
        this.notificationClickHandlers.delete(notificationId)
      }

      notification.onclose = () => {
        this.notificationClickHandlers.delete(notificationId)
      }

      notification.onerror = (error) => {
        console.error('Notification error:', error)
        this.notificationClickHandlers.delete(notificationId)
      }

      setTimeout(() => {
        try {
          notification.close()
        } catch (e) {
          console.warn('Error closing notification:', e)
        }
      }, 5000)

      return notification
    } catch (error) {
      console.error('Notification creation failed:', error)
      return null
    }
  }

  static addNotificationClickHandler(notificationId: number, handler: () => void) {
    this.notificationClickHandlers.set(notificationId, handler)
  }

  static toggleSound(enabled: boolean) {
    this.isSoundEnabled = enabled

    if (!enabled) {
      this.stopCallRingtone()
      this.stopOutgoingCallRingtone()
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('notificationSoundEnabled', String(enabled))
    }
  }

  static async toggleBrowserNotifications(enabled: boolean) {
    if (enabled && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      this.isBrowserNotificationEnabled = permission === 'granted'
    } else {
      this.isBrowserNotificationEnabled = enabled && Notification.permission === 'granted'
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('browserNotificationsEnabled', String(this.isBrowserNotificationEnabled))
    }
  }

  static loadPreferences() {
    if (typeof localStorage === 'undefined') return

    const soundPref = localStorage.getItem('notificationSoundEnabled')
    if (soundPref !== null) {
      this.isSoundEnabled = soundPref === 'true'
    }

    const notificationPref = localStorage.getItem('browserNotificationsEnabled')
    if (notificationPref !== null) {
      this.isBrowserNotificationEnabled = notificationPref === 'true' && Notification.permission === 'granted'
    }
  }

  static getStatus() {
    return {
      soundEnabled: this.isSoundEnabled,
      browserNotificationEnabled: this.isBrowserNotificationEnabled,
      notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
      isInitialized: this.isInitialized,
      isRinging: this.isRinging,
      isOutgoingRinging: this.isOutgoingRinging,
    }
  }
}
