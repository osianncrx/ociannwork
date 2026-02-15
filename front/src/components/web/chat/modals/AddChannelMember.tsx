import { useState } from 'react'
import { mutations } from '../../../../api'
import { socket } from '../../../../services/socket-setup'
import { SolidButton } from '../../../../shared/button'
import UserChannelSelector from '../../../../shared/form-fields/UserChannelInput'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { addChannelMember } from '../../../../store/slices/channelSlice'
import { ChannelRole, SOCKET } from '../../../../constants'
import { ChannelMember } from '../../../../types/api'
import { AddChannelMemberProps, SelectedMember } from '../../../../types'

const AddChannelMember = ({ setAddMembersModal }: AddChannelMemberProps) => {
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([])
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { mutate: addMembersToChannel } = mutations.useAddMembersToChannel()
  const { currentChannel } = useAppSelector((store) => store.channel)
  const dispatch = useAppDispatch()

  const handleAddMembersToChannel = () => {
    if (selectedMembers.length === 0 || !selectedChat?.id) return

    const membersPayload: ChannelMember[] = selectedMembers.map((member) => ({
      user_id: member?.value,
      role: ChannelRole.Member,
      User: member?.data as unknown as ChannelMember['User'],
    }))

    addMembersToChannel(
      {
        channel_id: selectedChat?.id,
        members: membersPayload,
      },
      {
        onSuccess: () => {
          membersPayload.forEach((member) => {
            dispatch(addChannelMember(member))
          })

          socket.emit(SOCKET.Listeners.Member_Added_To_Channel, {
            channelId: selectedChat?.id,
            userIds: selectedMembers.map((m) => m.value),
            channel: {
              id: selectedChat?.id,
              name: selectedChat?.name,
              description: selectedChat?.description,
              type: selectedChat?.type,
            },
          })
          setSelectedMembers([])
          setAddMembersModal(false)
        },
      },
    )
  }

  return (
    <div>
      <UserChannelSelector
        name="groupMembers"
        placeholder="Select members..."
        isMulti={true}
        includeUsers={true}
        includeChannels={false}
        closeMenuOnSelect={false}
        excludeIds={currentChannel?.members?.map((member) => member.user_id)}
        value={selectedMembers}
        onSelectionChange={(selected) => setSelectedMembers(selected)}
      />

      <SolidButton
        title={'Add Members'}
        onClick={handleAddMembersToChannel}
        color="primary"
        className="w-100"
        disabled={selectedMembers.length === 0}
      />
    </div>
  )
}

export default AddChannelMember
