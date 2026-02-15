import { useState } from 'react'
import { DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown } from 'reactstrap'
import { mutations } from '../../../../../api'
import { ChannelRole, SOCKET } from '../../../../../constants'
import { socket } from '../../../../../services/socket-setup'
import { SvgIcon } from '../../../../../shared/icons'
import { ConfirmModal } from '../../../../../shared/modal'
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks'
import { dismissChannelAdmin, makeChannelAdmin, removeChannelMember } from '../../../../../store/slices/channelSlice'
import { removeChannelFromChats, selectChat } from '../../../../../store/slices/chatSlice'
import { ChannelMember, ChatItem, ExtendedChatItem } from '../../../../../types'
import UserItem from '../../widgets/UserItem'

const MembersTab = ({ handleLeaveChannel }: any) => {
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { currentChannel, currentUserRole } = useAppSelector((store) => store.channel)
  const { user: userData } = useAppSelector((store) => store.auth)
  const [confirmRemoveMemberOpen, setConfirmRemoveMemberOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<ChatItem | null>(null)
  const { mutate: removeMemberMutate } = mutations.useRemoveMemberFromChannel()
  const { mutate: updateRoleMutate } = mutations.useUpdateChannelMemberRole()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((store) => store.auth)

  const handleRemoveMember = (user: ChatItem) => {
    setMemberToRemove(user)
    setConfirmRemoveMemberOpen(true)
  }

  const confirmRemoveMember = () => {
    if (!memberToRemove) return

    const isSelfRemoval = memberToRemove?.id === userData?.id

    removeMemberMutate(
      { channel_id: selectedChat.id, user_id: memberToRemove.id.toString() },
      {
        onSuccess: () => {
          dispatch(removeChannelMember(memberToRemove?.id))

          if (isSelfRemoval) {
            dispatch(removeChannelFromChats({ channelId: selectedChat?.id }))
            dispatch(selectChat(null as unknown as ExtendedChatItem))
          }

          // Emit socket event to notify other users
          socket.emit(SOCKET.Emitters.Member_Removed_From_Channel, {
            channelId: selectedChat?.id,
            userId: memberToRemove?.id,
          })

          setConfirmRemoveMemberOpen(false)
          setMemberToRemove(null)
        },
        onError: (error) => {
          console.error('Failed to remove member:', error)
          setConfirmRemoveMemberOpen(false)
          setMemberToRemove(null)
        },
      },
    )
  }

  const updateChannelMemberRole = (user: ChannelMember) => {
    const isAdmin = user?.role === ChannelRole.Admin
    const newRole = isAdmin ? ChannelRole.Member : ChannelRole.Admin

    updateRoleMutate(
      { channel_id: selectedChat?.id, user_id: user.user_id.toString(), new_role: newRole },
      {
        onSuccess: () => {
          if (isAdmin) {
            dispatch(dismissChannelAdmin(user.user_id))
          } else {
            dispatch(makeChannelAdmin(user.user_id))
          }

          // Emit socket event to notify other users
          socket.emit(SOCKET.Emitters.Member_Role_Updated, {
            channelId: selectedChat?.id,
            userId: user?.user_id,
            newRole: newRole,
          })
        },
      },
    )
  }

  return (
    <>
      <div className="members-list custom-scrollbar">
        {currentChannel?.members
          ?.slice()
          .sort((a, b) => {
            if (a.user_id === user.id) return -1
            if (b.user_id === user.id) return 1
            if (a.role === ChannelRole.Admin && b.role !== ChannelRole.Admin) return -1
            if (b.role === ChannelRole.Admin && a.role !== ChannelRole.Admin) return 1
            return a.User.name.localeCompare(b.User.name)
          })
          .map((member: ChannelMember) => {
            const isCurrentUser = member.user_id === userData?.id
            const isCurrentUserAdmin = currentUserRole === ChannelRole.Admin
            const shouldShowMenu = isCurrentUserAdmin && !isCurrentUser

            return (
              <div className="member-item d-flex align-items-center justify-content-between py-2" key={member.user_id}>
                <div className={`member-info d-flex align-items-center flex-grow-1`}>
                  <UserItem chat={member?.User} />
                  {member?.role === ChannelRole.Admin && <span className="badge bg-light text-dark ms-2">Admin</span>}
                </div>

                <div className="member-actions d-flex gap-2">
                  {shouldShowMenu ? (
                    <UncontrolledDropdown direction="start">
                      <DropdownToggle tag="li" className="list-unstyled" caret={false}>
                        <SvgIcon className="common-svg-hw-btn" iconId="more-horizontal" />
                      </DropdownToggle>

                      <DropdownMenu>
                        <DropdownItem onClick={() => updateChannelMemberRole(member)}>
                          {member.role !== ChannelRole.Admin ? 'Make admin' : 'Remove as admin'}
                        </DropdownItem>
                        <DropdownItem onClick={() => handleRemoveMember(member?.User)}>
                          Remove from channel
                        </DropdownItem>
                      </DropdownMenu>
                    </UncontrolledDropdown>
                  ) : (
                    isCurrentUser && (
                      <button className="btn btn-link btn-sm text-danger p-0" onClick={handleLeaveChannel}>
                        <SvgIcon iconId="log-out" className="common-svg-hw" />
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
      </div>
      <ConfirmModal
        isOpen={confirmRemoveMemberOpen}
        onClose={() => {
          setConfirmRemoveMemberOpen(false)
          setMemberToRemove(null)
        }}
        onConfirm={confirmRemoveMember}
        title="Remove Member"
        subtitle={`Are you sure you want to remove "${memberToRemove?.name || 'this member'}" from "${selectedChat?.name}"? They will no longer have access to this channel.`}
        confirmText="Remove Member"
        cancelText="Cancel"
        variant="danger"
        showIcon={true}
        iconId="login"
      />
    </>
  )
}

export default MembersTab
