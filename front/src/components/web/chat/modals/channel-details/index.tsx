import { useEffect, useMemo, useState } from 'react'
import { TabContent, TabPane } from 'reactstrap'
import { mutations } from '../../../../../api'
import { ChannelRole, ChatType, SOCKET } from '../../../../../constants'
import { socket } from '../../../../../services/socket-setup'
import { ConfirmModal, SimpleModal } from '../../../../../shared/modal'
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks'
import {
  dismissChannelAdmin,
  makeChannelAdmin,
  removeChannelMember,
  setCurrentChannel,
  setCurrentUserRoleInChannel,
} from '../../../../../store/slices/channelSlice'
import { removeChannelFromChats, selectChat } from '../../../../../store/slices/chatSlice'
import { ChannelDetailsModalProps, ExtendedChatItem } from '../../../../../types'
import { Channel } from '../../../../../types/api'
import AddChannelMember from '../AddChannelMember'
import AboutTab from './AboutTab'
import MembersTab from './MembersTab'
import SettingsTab from './SettingsTab'
import TabNavigation from './TabNavigation'

const ChannelDetailsModal = ({ detailsModal, setDetailModal, addMembersModal, setAddMembersModal }: ChannelDetailsModalProps) => {
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { currentChannel, currentUserRole } = useAppSelector((store) => store.channel)
  const [activeTab, setActiveTab] = useState('1')
  const { user: userData } = useAppSelector((store) => store.auth)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const { mutate: leaveChannel } = mutations.useLeaveChannel()
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!selectedChat?.id || selectedChat.type !== ChatType.Channel) return

    const handleMemberAddedToChannel = ({
      channelId,
      channel,
      userIds,
    }: {
      channelId: string
      userIds?: string[]
      channel?: Partial<Channel>
    }) => {
      if (channelId === selectedChat.id && channel?.members && currentChannel?.id) {
        const updatedChannel = {
          ...currentChannel,
          id: currentChannel.id,
          members: channel.members,
        }

        dispatch(setCurrentChannel(updatedChannel))
        if (userIds?.includes(String(userData?.id))) {
          dispatch(setCurrentUserRoleInChannel({ userId: userData?.id }))
        }
      }
    }

    const handleMemberRemovedFromChannel = ({ channelId, userId }: { channelId: string; userId: string }) => {
      if (channelId === selectedChat.id) {
        dispatch(removeChannelMember(userId))
        if (userId === userData?.id) {
          setDetailModal(false)
        }
      }
    }

    const handleMemberRoleUpdated = ({
      channelId,
      userId,
      newRole,
    }: {
      channelId: string
      userId: string
      newRole: string
    }) => {
      if (channelId === selectedChat.id) {
        if (newRole === ChannelRole.Admin) {
          dispatch(makeChannelAdmin(userId))
        } else {
          dispatch(dismissChannelAdmin(userId))
        }
        if (userId === userData?.id) {
          dispatch(setCurrentUserRoleInChannel({ userId: userData?.id }))
        }
      }
    }

    const handleMemberLeftChannel = ({ channelId, userId }: { channelId: string; userId: string }) => {
      if (channelId === selectedChat?.id && userId) {
        dispatch(removeChannelMember(userId))
      }
    }

    const handleChannelLeft = ({ channelId, userId }: { channelId: string; userId: string }) => {
      if (userId === userData?.id && channelId === selectedChat?.id) {
        setDetailModal(false)
      }
    }

    socket.on(SOCKET.Listeners.Member_Added_To_Channel, handleMemberAddedToChannel)
    socket.on(SOCKET.Listeners.Member_Removed_From_Channel, handleMemberRemovedFromChannel)
    socket.on(SOCKET.Listeners.Member_Role_Updated, handleMemberRoleUpdated)
    socket.on(SOCKET.Listeners.Member_Left_Channel, handleMemberLeftChannel)
    socket.on(SOCKET.Listeners.Channel_Left, handleChannelLeft)

    return () => {
      socket.off(SOCKET.Listeners.Member_Added_To_Channel, handleMemberAddedToChannel)
      socket.off(SOCKET.Listeners.Member_Removed_From_Channel, handleMemberRemovedFromChannel)
      socket.off(SOCKET.Listeners.Member_Role_Updated, handleMemberRoleUpdated)
      socket.off(SOCKET.Listeners.Member_Left_Channel, handleMemberLeftChannel)
      socket.off(SOCKET.Listeners.Channel_Left, handleChannelLeft)
    }
  }, [selectedChat?.id, currentChannel, dispatch, userData?.id])
  
  useEffect(() => {
    if (detailsModal && currentChannel && userData?.id) {
      dispatch(setCurrentUserRoleInChannel({ userId: userData.id }))
    }
  }, [detailsModal, currentChannel, currentChannel?.members, userData?.id, dispatch])
  useEffect(() => {
    if (activeTab === '2' && currentChannel && userData?.id) {
      dispatch(setCurrentUserRoleInChannel({ userId: userData.id }))
    }
  }, [activeTab, currentChannel, userData?.id, dispatch])

  const handleLeaveChannel = () => {
    setConfirmLeaveOpen(true)
  }

  const confirmLeaveChannel = () => {
    leaveChannel(
      { channel_id: selectedChat?.id },
      {
        onSuccess: () => {
          dispatch(removeChannelMember(userData.id))
          dispatch(removeChannelFromChats({ channelId: selectedChat?.id }))
          dispatch(selectChat(null as unknown as ExtendedChatItem))

          socket.emit(SOCKET.Emitters.Member_Left_Channel, {
            channelId: selectedChat?.id,
            userId: userData.id,
          })

          setDetailModal(false)
          setConfirmLeaveOpen(false)
        },
      },
    )
  }

  const modalActions = useMemo(() => [], [setDetailModal])

  return (
    <>
      <SimpleModal
        isOpen={detailsModal}
        onClose={() => setDetailModal(false)}
        title={`${currentChannel?.name || selectedChat?.name || 'Channel'}`}
        size="lg"
        className="channel-details-modal"
        actions={modalActions}
        closeOnBackdrop={true}
        closeOnEscape={true}
        closable={true}
        subtitle={currentChannel?.description || `${currentChannel?.type} Channel`}
      >
        <div className="login-form custom-channel-details">
          <TabNavigation setAddMembersModal={setAddMembersModal} activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabContent activeTab={activeTab}>
            <TabPane tabId="1">
              <AboutTab
                detailsModal={detailsModal}
                setDetailModal={setDetailModal}
                handleLeaveChannel={handleLeaveChannel}
              />
            </TabPane>
            <TabPane tabId="2">
              <MembersTab handleLeaveChannel={handleLeaveChannel} />
            </TabPane>
            {currentUserRole === ChannelRole.Admin && (
              <TabPane tabId="3">
                <SettingsTab setDetailModal={setDetailModal} />
              </TabPane>
            )}
          </TabContent>
        </div>
      </SimpleModal>
      <SimpleModal
        className="custom-channel profile-setting add-members"
        isOpen={addMembersModal}
        onClose={() => setAddMembersModal(false)}
        title={`Add Members to Channel (${selectedChat?.name})`}
      >
        <AddChannelMember setAddMembersModal={setAddMembersModal} />
      </SimpleModal>
      <ConfirmModal
        isOpen={confirmLeaveOpen}
        onClose={() => setConfirmLeaveOpen(false)}
        onConfirm={confirmLeaveChannel}
        title="Leave Channel"
        subtitle={`Are you sure you want to leave "${selectedChat?.name}"? You won't be able to see messages or participate in this channel anymore.`}
        confirmText="Leave Channel"
        cancelText="Cancel"
        variant="danger"
        showIcon={true}
        iconId="login"
      />
    </>
  )
}

export default ChannelDetailsModal
