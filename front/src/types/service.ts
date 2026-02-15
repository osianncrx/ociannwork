import { ExtendedChatItem } from "./store"

export interface ExtendedNotificationOptions extends NotificationOptions {
    timestamp?: number
    currentSelectedChat?: ExtendedChatItem
  }
  
  export interface WebkitWindow extends Window {
    webkitAudioContext?: typeof AudioContext
  }
  
  export interface FallbackAudioElement {
    play: () => Promise<void>
    currentTime: number
    load: () => void
  }