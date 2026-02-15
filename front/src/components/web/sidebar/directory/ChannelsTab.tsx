import UserItem from '../../chat/widgets/UserItem'
import SearchInput from './SearchInput'
import { ChannelsTabProps } from '../../../../types'
import { SvgIcon } from '../../../../shared/icons'
import { useTeamPermissions } from '../../../../utils/hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CreateChannel from '../modals/CreateChannel'

const ChannelsTab = ({
  filteredChannels,
  searchTerm,
  onSearchChange,
  onChannelSelect,
  onResetPagination,
}: ChannelsTabProps) => {
  const { checkPermission } = useTeamPermissions()
  const { t } = useTranslation()
  const [createChannelModal, setCreateChannelModal] = useState(false)
  const handleCreateChannelClick = () => {
    const hasPermission = checkPermission('create_public_channel', {
      title: t('Permission Required'),
      content: t('Only admins or specified members can create channels.'),
      variant: 'warning',
    })

    if (hasPermission) {
      setCreateChannelModal(true)
    }
  }

  return (
    <div className="channels">
      <div className="input-aligns">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search for channels"
          onReset={onResetPagination}
        />
        <button type="button" onClick={handleCreateChannelClick} className="btn btn-primary">
          <SvgIcon className="editor-svg-hw" iconId="plus-icon" />
        </button>
      </div>

      <CreateChannel createChannelModal={createChannelModal} setCreateChannelModal={setCreateChannelModal} />

      {filteredChannels.length > 0 ? (
        <ul className="chat-list custom-scrollbar">
          {filteredChannels.map((channel) => (
            <UserItem
              key={`channel_${channel.id}`}
              chat={channel}
              onSelect={() => onChannelSelect(channel)}
              hideDot={true}
            />
          ))}
        </ul>
      ) : searchTerm ? (
        <div className="no-data">
          <div className="no-data-found-svg mt-2">
            <SvgIcon iconId="no-data-available" />
            <span>No channels found matching "{searchTerm}"</span>
          </div>
        </div>
      ) : (
        <div className="no-data">
          <div className="no-data-found-svg mt-2">
            <SvgIcon iconId="no-data-available" />
            <span>No channels found</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChannelsTab
