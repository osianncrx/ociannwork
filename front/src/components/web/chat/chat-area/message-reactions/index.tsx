import { FC, useCallback } from 'react'
import { mutations, queries } from '../../../../../api'
import { Hint } from '../../../../../shared/tooltip'
import { useAppSelector } from '../../../../../store/hooks'
import { MessageReactionProps } from '../../../../../types'
import { ChatType } from '../../../../../constants'

const MessageReactions: FC<MessageReactionProps> = ({ message, findMessageById }) => {
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { user } = useAppSelector((store) => store.auth)
  const { data: channelData } = queries.useGetChannelById(
    { id: selectedChat?.id },
    { enabled: selectedChat?.type === ChatType.Channel && !!selectedChat?.id },
  )
  const { mutate: addReaction } = mutations.useAddReaction()
  const { mutate: removeReaction } = mutations.useRemoveReaction()

  const getUserName = useCallback(
    (uid: string | number): string => {
      const id = String(uid)

      if (String(user?.id) === id) {
        return 'You'
      }

      if (selectedChat?.type === ChatType.Channel && channelData?.channel?.members) {
        const member = channelData.channel.members.find((m) => String(m.user_id) === id)
        if (member) return member.User.name
      }
      if (selectedChat?.type === ChatType.DM) {
        if (message.sender && String(message.sender.id) === id) {
          return message.sender.name
        }
        if (message.recipient && String(message.recipient.id) === id) {
          return message.recipient.name
        }
      }

      return 'Unknown User'
    },
    [channelData?.channel?.members, selectedChat, user?.id, message.sender, message.recipient],
  )

  const handleEmojiReaction = useCallback(
    (messageId: string, emoji: string) => {
      const message = findMessageById?.(messageId)
      if (!message) return
      const reaction = message.reactions?.find((r) => r.emoji === emoji)
      const userReacted = reaction?.users?.some((u) => String(u) === String(user.id)) || false

      if (userReacted) {
        removeReaction({ message_id: Number(message.id), emoji })
      } else {
        addReaction({ message_id: Number(message.id), emoji: { emoji } })
      }
    },
    [findMessageById, user.id, addReaction, removeReaction],
  )
  return (
    <div className="message-reactions">
      {message?.reactions.map((r) => {
        const reactorNames = r.users.map((userId) => getUserName(userId))
        let hintText
        if (r.users.length === 1) {
          const reactorName = reactorNames[0]
          hintText = `${reactorName === 'You' ? 'You' : reactorName} reacted with ${r.emoji}`
        } else {
          const youIndex = reactorNames.indexOf('You')
          if (youIndex !== -1) {
            const otherNames = reactorNames.filter((name) => name !== 'You')
            const formattedNames = ['You', ...otherNames]
            hintText = `${formattedNames.join(', ')} reacted with ${r.emoji}`
          } else {
            hintText = `${reactorNames.join(', ')} reacted with ${r.emoji}`
          }
        }

        return (
          <Hint key={r.emoji} label={hintText}>
            <div
              className={`reaction-emoji ${r.users.some((u) => String(u) === String(user.id)) ? 'my-reaction' : ''}`}
            >
              <div onClick={() => handleEmojiReaction(String(message.id), r.emoji)}>
                <span className="emoji">{r.emoji}</span>
                {r.count > 0 && <span className="count">{r.count}</span>}
              </div>
            </div>
          </Hint>
        )
      })}
    </div>
  )
}

export default MessageReactions
