import { useCallback, useEffect, useRef, useState } from 'react'
import {  ChatType } from '../../../../constants'
import { useAppDispatch } from '../../../../store/hooks'
import { clearTargetMessageId, selectChat, setTargetMessageId } from '../../../../store/slices/chatSlice'
import { ChatItem, ScrollMessageSection, ScrollTypingUser, UseScrollManagerReturn } from '../../../../types'

const useChatScroll = (
  selectedChat: ChatItem | null,
  messages: ScrollMessageSection[] | null,
  typingUsers: ScrollTypingUser[],
): UseScrollManagerReturn & {
  maintainScrollPosition: () => void
  globalRedirectToMessage: (messageId: string, targetChat?: ChatItem) => void
} => {
  const dispatch = useAppDispatch()
  const containerRef = useRef<any>(null)
  const scrollPositions = useRef<Map<string, number>>(new Map())
  const [isUserScrolledUp, setIsUserScrolledUp] = useState<boolean>(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(true)
  const lastMessageCount = useRef<number>(0)
  const previousScrollHeight = useRef<number>(0)
  const isLoadingOlderMessages = useRef<boolean>(false)

  const getChatId = useCallback((chat: ChatItem | null): string | null => {
    if (!chat) return null
    return chat.type === ChatType.Channel ? `${ChatType.Channel}_${chat.id}` : `${ChatType.DM}_${chat.id}`
  }, [])

  const isNearBottom = useCallback((container: HTMLElement | null, threshold: number = 100): boolean => {
    if (!container) return true
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }, [])

  const isNearTop = useCallback((container: HTMLElement | null, threshold: number = 100): boolean => {
    if (!container) return false
    return container.scrollTop < threshold
  }, [])

  const maintainScrollPosition = useCallback(() => {
    if (!containerRef.current || !isLoadingOlderMessages.current) return

    const container = containerRef.current
    const currentScrollHeight = container.scrollHeight
    const heightDifference = currentScrollHeight - previousScrollHeight.current

    if (heightDifference > 0) {
      // Adjust scroll position to maintain visual position when older messages are loaded
      const newScrollTop = container.scrollTop + heightDifference
      container.scrollTop = newScrollTop
    }

    previousScrollHeight.current = currentScrollHeight
    isLoadingOlderMessages.current = false
  }, [])

  const scrollToMessage = useCallback((messageId: string, retries = 5, delay = 300) => {
    if (!containerRef.current) {
      return
    }

    const attemptScroll = () => {
      if (!containerRef.current) return false
      
      const messageElement = containerRef.current.querySelector(`[data-message-id="${messageId}"]`)

      if (messageElement && messageElement instanceof HTMLElement) {
        const scrollPosition = messageElement.offsetTop - 100
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: scrollPosition,
            behavior: 'smooth',
          })
        }
        const chatContent = messageElement.querySelector('.chat-messages')
        if (chatContent) {
          chatContent.classList.add('highlight-message')
          setTimeout(() => {
            chatContent.classList.remove('highlight-message')
          }, 2000)
        }
        return true 
      }
      return false // Message not found
    }

    // Try immediately first
    if (attemptScroll()) return

    // If not found, retry with delay
    if (retries > 0) {
      setTimeout(() => {
        scrollToMessage(messageId, retries - 1, delay)
      }, delay)
    }
  }, [])

  const globalRedirectToMessage = useCallback(
    (messageId: string, targetChat?: ChatItem) => {
      if (targetChat && (!selectedChat || selectedChat.id !== targetChat.id || selectedChat.type !== targetChat.type)) {
        dispatch(selectChat(targetChat))
        setTimeout(() => {
          dispatch(setTargetMessageId(messageId))
          setTimeout(() => {
            dispatch(clearTargetMessageId())
          }, 3000)
        }, 500)
      } else {
        dispatch(setTargetMessageId(messageId))
        setTimeout(() => {
          dispatch(clearTargetMessageId())
        }, 3000)
      }
    },
    [selectedChat, dispatch],
  )

  const saveScrollPosition = useCallback((): void => {
    const chatId = getChatId(selectedChat)
    if (chatId && containerRef.current) {
      scrollPositions.current.set(chatId, containerRef.current.scrollTop)
    }
  }, [selectedChat, getChatId])

  const scrollToBottom = useCallback((): void => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
      setIsUserScrolledUp(false)
      setShouldAutoScroll(true)
    }
  }, [])

  const restoreScrollPosition = useCallback((): void => {
    const chatId = getChatId(selectedChat)
    if (chatId && containerRef.current) {
      const savedPosition = scrollPositions.current.get(chatId)
      if (savedPosition !== undefined) {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = savedPosition
            setIsUserScrolledUp(!isNearBottom(containerRef.current))
            setShouldAutoScroll(isNearBottom(containerRef.current))
          }
        })
      } else {
        requestAnimationFrame(() => {
          scrollToBottom()
        })
      }
    }
  }, [selectedChat, getChatId, isNearBottom, scrollToBottom])

  const handleScroll = useCallback((): void => {
    if (!containerRef.current) return

    const container = containerRef.current
    const nearBottom = isNearBottom(container)
    const nearTop = isNearTop(container)

    setIsUserScrolledUp(!nearBottom)
    setShouldAutoScroll(nearBottom)
    saveScrollPosition()

    previousScrollHeight.current = container.scrollHeight

    if (nearTop && !isLoadingOlderMessages.current) {
      isLoadingOlderMessages.current = true
    }
  }, [isNearBottom, isNearTop, saveScrollPosition])

  const forceScrollToBottom = useCallback((): void => {
    setShouldAutoScroll(true)
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
      setIsUserScrolledUp(false)
    }
  }, [])

  const prepareForOlderMessages = useCallback(() => {
    if (containerRef.current) {
      isLoadingOlderMessages.current = true
      previousScrollHeight.current = containerRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    if (selectedChat) {
      restoreScrollPosition()
      lastMessageCount.current = messages?.reduce((total, section) => total + section.messages.length, 0) || 0
      previousScrollHeight.current = containerRef.current?.scrollHeight || 0
    }
  }, [selectedChat?.id, restoreScrollPosition, messages])

  useEffect(() => {
    if (!messages) return

    const currentMessageCount = messages.reduce((total, section) => total + section.messages.length, 0)
    const hasNewMessages = currentMessageCount > lastMessageCount.current

    // Only auto-scroll if we're at the bottom and there are truly new messages (not older ones)
    if (hasNewMessages && shouldAutoScroll && !isLoadingOlderMessages.current) {
      requestAnimationFrame(() => {
        scrollToBottom()
      })
    } else if (hasNewMessages && isLoadingOlderMessages.current) {
      requestAnimationFrame(() => {
        maintainScrollPosition()
      })
    }

    lastMessageCount.current = currentMessageCount
  }, [messages, shouldAutoScroll, scrollToBottom, maintainScrollPosition])

  useEffect(() => {
    if (typingUsers?.length > 0 && shouldAutoScroll) {
      requestAnimationFrame(() => {
        scrollToBottom()
      })
    }
  }, [typingUsers, shouldAutoScroll, scrollToBottom])

  useEffect(() => {
    return () => {
      saveScrollPosition()
    }
  }, [saveScrollPosition])

  return {
    containerRef,
    isUserScrolledUp,
    shouldAutoScroll,
    handleScroll,
    scrollToBottom,
    forceScrollToBottom,
    saveScrollPosition,
    restoreScrollPosition,
    scrollToMessage,
    maintainScrollPosition,
    prepareForOlderMessages,
    globalRedirectToMessage,
  }
}

export default useChatScroll
