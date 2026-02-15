import { ChatType } from '../../../../../constants'
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks'
import { addNewChat, selectChat } from '../../../../../store/slices/chatSlice'
import { ExtendedChatItem, SenderNameProps } from '../../../../../types'
import { Message } from '../../../../../types/common'

const SenderName = ({ message, customSenderName }: SenderNameProps) => {
  const dispatch = useAppDispatch()
  const { allChats } = useAppSelector((store) => store.chat)
  const { user } = useAppSelector((store) => store.auth)

  const redirectToChat = (message: Message) => {
    const sender = message.sender
    if (!message.channel_id) return
    const foundChat = allChats.find((chat) => chat.id == sender.id)
    if (foundChat) {
      dispatch(selectChat(foundChat))
    } else {
      const newChat: ExtendedChatItem = {
        type: ChatType.DM,
        id: sender.id,
        name: sender.name,
        email: sender.email,
        avatar: sender.avatar,
        profile_color: sender.profile_color,
        latest_message_at: null,
        pinned: false,
        last_message: null,
      }
      dispatch(addNewChat(newChat))
      dispatch(selectChat(newChat))
    }
  }

  const senderName = message?.sender_id === user?.id ? 'Me' : message?.sender?.name
  return (
    <span className="message-title" onClick={() => redirectToChat(message)}>
      {customSenderName || senderName}
    </span>
  )
}

export default SenderName
