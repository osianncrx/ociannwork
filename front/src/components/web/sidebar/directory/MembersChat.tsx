import { SvgIcon } from '../../../../shared/icons'
import { ChatItem, MembersTabProps } from '../../../../types'
import UserItem from '../../chat/widgets/UserItem'
import SearchInput from './SearchInput'

const MembersTab = ({
  filteredMembers,
  searchTerm,
  isLoading,
  onSearchChange,
  onMemberSelect,
  onResetPagination,
}: MembersTabProps) => {
  return (
    <div className="team-members">
      <SearchInput
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="Search for Members"
        onReset={onResetPagination}
      />

      {isLoading ? (
        <div className="loading">Loading team members...</div>
      ) : filteredMembers.length > 0 ? (
        <ul className="chat-list custom-scrollbar">
          {[...filteredMembers]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((member: ChatItem) => (
              <UserItem
                key={`member_${member.id}`}
                chat={member}
                onSelect={() => onMemberSelect(member)}
                hideDot={false}
              />
            ))}
        </ul>
      ) : searchTerm ? (
        <div className="no-data">
          <div className="no-data-found-svg mt-2">
            <SvgIcon iconId="no-data-available" />
            <span>No members found matching "{searchTerm}"</span>
          </div>
        </div>
      ) : (
        <div className="no-data">
          <div className="no-data-found-svg mt-2">
            <SvgIcon iconId="no-data-available" />
            <span>No team members found</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MembersTab
