import { FC } from 'react'
import { SimpleModal } from '../../../../shared/modal'
import { MessageReadByModalProps, Status } from '../../../../types/common'
import UserItem from '../widgets/UserItem'
import { queries } from '../../../../api'
import { ChatType } from '../../../../constants'
import { useAppSelector } from '../../../../store/hooks'

const MessageReadByModal: FC<MessageReadByModalProps> = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { user } = useAppSelector((store) => store.auth)

  const { data: channelData } = queries.useGetChannelById(
    { id: selectedChat?.id },
    { enabled: selectedChat?.type === ChatType.Channel && !!selectedChat?.id },
  )
  const getStatusForUser = (userId: string | number): string => {
    const status = message.statuses?.find((s: Status) => s.user_id === userId)
    return status ? status.status : 'pending'
  }

  let members: any[] = []
  if (selectedChat?.type === ChatType.Channel) {
    const rawMembers = channelData?.channel.members || selectedChat.members || []
    members = rawMembers
      .filter((m: any) => m.user_id !== user.id)
      .map((m: any) => ({
        id: m.user_id,
        name: m.User.name,
        avatar: m.User.avatar || '/default-avatar.png',
        profile_color: m.User.profile_color || null,
        last_active: m.User.last_active,
      }))
  } else if (selectedChat?.type === ChatType.DM) {
    members = [
      {
        id: selectedChat?.id,
        name: selectedChat.name,
        last_active: selectedChat.last_active,
        avatar: selectedChat.avatar || '/default-avatar.png',
      },
    ]
  }

  const seenUsers = members.filter((m) => getStatusForUser(m.id) === 'seen')
  const yetToReadUsers = members.filter((m) => getStatusForUser(m.id) !== 'seen')

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Read By">
      {selectedChat?.type === ChatType.Channel && members.length === 0 && (
        <section className="read-by-message">
          <p>No one has read this message yet.</p>
        </section>
      )}
      {selectedChat?.type === ChatType.Channel && members.length > 0 && (
        <>
          <p className="read-message-title">
            Message read by {seenUsers.length} of {members.length} members
          </p>
          <section className="read-by-message">
            {seenUsers.length === 0 ? (
              <p>No one has read this message yet.</p>
            ) : (
              seenUsers.map((u) => (
                <UserItem
                  key={u.id}
                  chat={{
                    type: ChatType.DM,
                    id: u.id,
                    name: u.name,
                    avatar: u.avatar,
                    profile_color: u.profile_color,
                    latest_message_at: null,
                    pinned: false,
                  }}
                  last_active={u.last_active}
                  hideDot={true}
                />
              ))
            )}
          </section>
          <section className="read-by-message">
            {yetToReadUsers.length > 0 && (
              <p className="read-message-title mt-2">Yet to be read by {yetToReadUsers.length} members</p>
            )}
            {yetToReadUsers.length === 0 ? (
              <p className="read-msg-heading">All members have read this message.</p>
            ) : (
              yetToReadUsers.map((u) => (
                <UserItem
                  key={u.id}
                  chat={{
                    type: ChatType.DM,
                    id: u.id,
                    name: u.name,
                    avatar: u.avatar,
                    profile_color: u.profile_color,
                    latest_message_at: null,
                    pinned: false,
                  }}
                  last_active={u.last_active}
                  hideDot={true}
                />
              ))
            )}
          </section>
        </>
      )}
      {selectedChat?.type === ChatType.DM && (
        <section className="read-by-message">
          {seenUsers.length === 0 ? (
            <p>No one has read this message yet.</p>
          ) : (
            seenUsers.map((u) => (
              <UserItem
                key={u.id}
                chat={{
                  type: ChatType.DM,
                  id: u.id,
                  name: u.name,
                  avatar: u.avatar,
                  profile_color: u.profile_color,
                  latest_message_at: null,
                  pinned: false,
                }}
                last_active={u.last_active}
                hideDot={true}
              />
            ))
          )}
        </section>
      )}
    </SimpleModal>
  )
}

export default MessageReadByModal
