import { useEffect, useMemo, useState } from 'react'
import { queries } from '../../../../api'
import { ChatType, TeamRole } from '../../../../constants'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setSidebarToggle } from '../../../../store/slices/admin/layoutSlice'
import { setCurrentChannel, setCurrentUserRoleInChannel } from '../../../../store/slices/channelSlice'
import { useMessageSelection } from '../chat-area/message-actions/useMessageSelection'
import ChannelDetailsModal from '../modals/channel-details'
import Calling from './Calling'
import HeaderInfo from './ChatInformation'
import Mute from './Mute'
import Search from './Search'

const ChatHeader = () => {
  const { selectedChat, selectedChatMessages } = useAppSelector((store) => store.chat)
  const dispatch = useAppDispatch()
  const { isSelectionMode, clearSelection, enterEmptySelectionMode } = useMessageSelection()

  const [addMembersModal, setAddMembersModal] = useState(false)
  const { sidebarToggle } = useAppSelector((store) => store.admin_layout)
  const [detailModal, setDetailModal] = useState(false)
  const { currentUserRole } = useAppSelector((store) => store.channel)
  const { user: userData } = useAppSelector((store) => store.auth)

  const hasMessages = useMemo(() => {
    if (!selectedChatMessages || selectedChatMessages.length === 0) return false
    return selectedChatMessages.some((section) => section.messages && section.messages.length > 0)
  }, [selectedChatMessages])

  const { isMultiSelectMode } = useAppSelector((store) => store.chat)

  const { data: channelData } = queries.useGetChannelById(
    { id: selectedChat?.id },
    { enabled: selectedChat?.type === ChatType.Channel && !!selectedChat?.id },
  )

  const onToggle = () => {
    dispatch(setSidebarToggle(!sidebarToggle))
  }

  useEffect(() => {
    if (channelData?.channel) {
      dispatch(setCurrentChannel(channelData?.channel))
      dispatch(setCurrentUserRoleInChannel({ userId: userData.id }))
    }
  }, [channelData, selectedChat, dispatch])

  const handleToggleMultiSelect = () => {
    if (isSelectionMode) {
      clearSelection()
    } else {
      enterEmptySelectionMode()
    }
  }

  return (
    <div className="user-profile-header">
      <div className={`apps-toggle ${!sidebarToggle ? 'close-toggle' : 'open-toggle'}`}>
        <div className="apps-toggle-icon" onClick={onToggle}>
          <SvgIcon iconId="arrow-right" className="apps-menu-icon" />
        </div>
      </div>
      <HeaderInfo setDetailModal={setDetailModal} />

      <div className="common-flex header-utilities">
        <Search />
        <Calling />
        <Mute />
        {selectedChat?.type === ChatType.Channel && currentUserRole === TeamRole.Admin && (
          <button className="settings" onClick={() => setAddMembersModal(true)}>
            <SvgIcon iconId="user-add" className="common-svg-hw user-add" />
          </button>
        )}
        {!isMultiSelectMode && hasMessages && (
          <div className="multi-select-toggle">
            <button
              className="btn-toggle-select"
              onClick={() => handleToggleMultiSelect()}
              title="Select messages"
              type="button"
            >
              {!isSelectionMode ? <SvgIcon iconId="more-horizontal" className="common-svg-md" />:
              <SvgIcon iconId="checkbox" className="common-svg-md" />}
            </button>
          </div>
        )}
      </div>
      <ChannelDetailsModal
        detailsModal={detailModal}
        setDetailModal={setDetailModal}
        addMembersModal={addMembersModal}
        setAddMembersModal={setAddMembersModal}
      />
    </div>
  )
}

export default ChatHeader
