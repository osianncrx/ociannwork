import { useEffect, useState } from 'react'
import { SOCKET } from '../../../../constants'
import { socket } from '../../../../services/socket-setup'
import { useAppSelector } from '../../../../store/hooks'
import Store from '../../../../store/store'
import { TypingEventData } from '../../../../types'

const useTypingIndicator = () => {
  const [typingUsers, setTypingUsers] = useState<{ userId: string; name: string }[]>([])
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { user } = useAppSelector((store) => store.auth)

  const currentUserId = user?.id

  useEffect(() => {
    setTypingUsers([])
  }, [selectedChat?.id])

  useEffect(() => {
    const handleTyping = (data: TypingEventData) => {
      console.log("🚀 ~ handleTyping ~ data:", data)
      const currentState = Store.getState().chat
      const currentSelectedChat = currentState?.selectedChat

      if (!currentSelectedChat) return
      if (data.userId == currentUserId) return

      let isTypingForCurrentChat = false

      if (data.channelId) {
        isTypingForCurrentChat = data.channelId == currentSelectedChat.id
      } else if (data.senderId && data.recipientId && currentSelectedChat.type !== 'Channel') {
        isTypingForCurrentChat = data.recipientId == currentUserId && currentSelectedChat?.id == data?.senderId
      }

      if (!isTypingForCurrentChat) return

      setTypingUsers((prev) => {
        if (data.isTyping) {
          if (!prev.some((user) => user.userId == data.userId)) {
            return [...prev, { userId: data.userId, name: data.userName }]
          }
          return prev
        } else {
          return prev.filter((user) => user.userId != data.userId)
        }
      })
    }

    socket.on(SOCKET.Emitters.Typing, handleTyping)
    return () => {
      socket.off(SOCKET.Emitters.Typing, handleTyping)
    }
  }, [currentUserId])

  const getTypingText = () => {
    if (typingUsers.length === 0) return null
    if (typingUsers.length === 1) return `${typingUsers[0].name} is typing`
    if (typingUsers.length === 2) return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
    return 'Several people are typing'
  }

  return { typingUsers, getTypingText }
}

export default useTypingIndicator
