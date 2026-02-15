import { debounce } from 'lodash'
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { queries } from '../../api'
import { ChatType } from '../../constants'
import { useAppSelector } from '../../store/hooks'
import { ChatItem, User, UserChannelOptionType } from '../../types'
import { ID } from '../../types/common'
import ChatAvatar from '../image/ChatAvatar'
import SearchableSelectInput from './SearchableSelectInput'

export interface UserChannelSelectorProps {
  label?: string
  id?: string
  name?: string
  placeholder?: string
  isMulti?: boolean
  isClearable?: boolean
  includeUsers?: boolean
  includeChannels?: boolean
  showAddButton?: boolean
  maxInitialItems?: number
  onSelectionChange?: (selected: any | any[] | null) => void
  onAddClick?: (option: any) => void
  error?: string
  touched?: boolean
  helperText?: string
  formGroupClass?: string
  layout?: 'horizontal' | 'vertical'
  value?: any | any[] | null
  excludeIds?: Array<string | number>
  noWrapper?: boolean
  menuIsOpen?: boolean
  onMenuOpen?: () => void
  onMenuClose?: () => void
  onInputChange?: (option: any) => void
  options?: any
  closeMenuOnSelect?: boolean
  className?: string
}

const isChannelType = (value: ChatType.Channel | ChatType.DM |string) => {
  return value === ChatType.Channel
}

const normalizeId = (id: ID) => String(id)

const UserChannelSelector: FC<UserChannelSelectorProps> = ({
  label = 'Select Users/Channels',
  id,
  name = 'userChannelSelector',
  placeholder = 'Search users or channels...',
  isMulti = true,
  isClearable = true,
  includeUsers = true,
  includeChannels = true,
  showAddButton = false,
  maxInitialItems = 6,
  onSelectionChange,
  onAddClick,
  error,
  touched,
  helperText,
  formGroupClass = '',
  layout = 'horizontal',
  value,
  excludeIds = [],
  noWrapper = true,
  closeMenuOnSelect,
  className,
  ...rest
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  const { allChats, allTeamMembers } = useAppSelector((state) => state.chat)

  // Search API for additional users when needed
  const { data: searchedUsersRaw, isLoading: isSearchingUsers } = queries.useGetTeamMembersList(
    {
      search: debouncedSearchTerm,
      limit: 6,
    },
    {
      enabled: includeUsers && debouncedSearchTerm.length > 0,
    },
  )

  // Debounce search term
  const debouncedSearch = useMemo(() => debounce((term: string) => setDebouncedSearchTerm(term), 300), [])

  useEffect(() => {
    debouncedSearch(searchTerm)
    return () => debouncedSearch.cancel()
  }, [searchTerm, debouncedSearch])

  const searchedUsers: any[] = useMemo(() => {
    if (!searchedUsersRaw) return []
    if (Array.isArray(searchedUsersRaw)) return searchedUsersRaw
    if (Array.isArray(searchedUsersRaw.members)) return (searchedUsersRaw)?.members
    if (Array.isArray(searchedUsersRaw.data)) return searchedUsersRaw.data
    return []
  }, [searchedUsersRaw])

  // Transform data to options
  const transformToOption = useCallback((item: ChatItem): UserChannelOptionType => {
    const rawType = item.type ?? (item.email ? 'user' : ChatType.Channel)
    const isChannel = isChannelType(rawType)
    const idStr = normalizeId(item.id)
    const label = isChannel ? `# ${item.name}` : item.name
    return {
      value: idStr,
      label,
      data: {
        ...item,
        id: idStr,
        type: isChannel ? ChatType.Channel : 'user',
        avatar: item.avatar || null,
        profile_color: item.profile_color,
        email: !isChannel ? item.email : null,
      },
    }
  }, [])

  const options = useMemo(() => {
    const allOptions: UserChannelOptionType[] = []
    const seenIds = new Set<string>()
    const excluded = new Set<string>(excludeIds.map(normalizeId))

    const addUniqueItem = (item: any) => {
      const idStr = normalizeId(item.id)
      if (!idStr) return
      if (seenIds.has(idStr)) return
      if (excluded.has(idStr)) return
      seenIds.add(idStr)
      allOptions.push(transformToOption(item))
    }

    // Channels from allChats
    if (includeChannels && Array.isArray(allChats)) {
      const channels = allChats.filter((chat) => isChannelType(chat.type))
      if (searchTerm) {
        channels
          .filter((channel) => channel.name?.toLowerCase().includes(searchTerm.toLowerCase()))
          .forEach(addUniqueItem)
      } else {
        channels.slice(0, Math.max(0, Math.floor(maxInitialItems / 2))).forEach(addUniqueItem)
      }
    }

    // Users from team members
    const teamMembers = Array.isArray(allTeamMembers?.members) ? allTeamMembers.members : []
    if (includeUsers) {
      if (searchTerm) {
        teamMembers
          .filter(
            (m: User) =>
              m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              m.email?.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          .forEach(addUniqueItem)
      } else {
        teamMembers.slice(0, Math.max(0, Math.floor(maxInitialItems / 2))).forEach(addUniqueItem)
      }
    }

    // Add searched users (avoiding duplicates)
    if (includeUsers && debouncedSearchTerm) {
      searchedUsers
        .filter((u) => !isChannelType(u.type)) 
        .forEach(addUniqueItem)
    }

    // Add users from conversations (avoid duplicates)
    if (includeUsers && Array.isArray(allChats) && (searchTerm || allOptions.length < maxInitialItems)) {
      const conversationUsers = allChats.filter((chat) => !isChannelType(chat.type))
      if (searchTerm) {
        conversationUsers
          .filter(
            (u) =>
              u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              u.email?.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          .forEach(addUniqueItem)
      } else {
        const remainingSlots = Math.max(0, maxInitialItems - allOptions.length)
        conversationUsers.slice(0, remainingSlots).forEach(addUniqueItem)
      }
    }

    return allOptions.sort((a, b) => {
      const aIsChannel = a?.data?.type === ChatType.Channel
      const bIsChannel = b?.data?.type === ChatType.Channel
      if (aIsChannel && !bIsChannel) return -1
      if (!aIsChannel && bIsChannel) return 1
      return a.label.localeCompare(b.label)
    })
  }, [
    allChats,
    allTeamMembers,
    searchedUsers,
    searchTerm,
    debouncedSearchTerm,
    includeUsers,
    includeChannels,
    maxInitialItems,
    excludeIds,
    transformToOption,
  ])

  const filterOption = useCallback(() => true, [])

  const handleInputChange = useCallback((inputValue: string) => {
    setSearchTerm(inputValue)
    return inputValue
  }, [])

  const handleSelectionChange = useCallback(
    (selected: any | any[]) => {
      onSelectionChange?.(selected)
    },
    [onSelectionChange],
  )

  const formatOptionLabel = useCallback((option: any) => {
    const isChannel = option.data?.type === ChatType.Channel
    return (
      <div className="d-flex align-items-center">
        <div className="me-2">
          <div
            className="rounded-circle flex-center group-avtar-profile"
            style={{
              backgroundColor: option.data?.profile_color ? option.data?.profile_color : '#5579F8',
            }}
          >
            <ChatAvatar
              customClass="avatar-sm rounded-circle text-white flex-center"
              data={option.data}
              name={option.data}
            />
          </div>
        </div>
        <div>
          <div className="fw-medium lh-1">{option.label.replace(/^#/, '')}</div>
          {!isChannel && option.data?.email && <small className="text-muted">{option.data.email}</small>}
        </div>
      </div>
    )
  }, [])

  // Custom noOptionsMessage based on selection state
  const noOptionsMessage = useCallback(
    ({ inputValue }: { inputValue: string }) => {
      const allOptionsSelected = options.length === 0 && !inputValue && Array.isArray(value) && value.length > 0
      if (allOptionsSelected) {
        return 'All available options selected'
      }
      return inputValue ? `No results found for "${inputValue}"` : 'Start typing to search...'
    },
    [options, value],
  )

  return (
    <SearchableSelectInput
      label={label}
      id={id}
      name={name}
      placeholder={placeholder}
      isMulti={isMulti}
      isClearable={isClearable}
      showAddButton={showAddButton}
      options={options}
      value={value}
      onOptionChange={handleSelectionChange}
      onAddClick={onAddClick}
      error={error}
      touched={touched}
      helperText={helperText}
      formGroupClass={formGroupClass}
      layout={layout}
      formatOptionLabel={formatOptionLabel}
      filterOption={filterOption}
      onInputChange={handleInputChange}
      isLoading={isSearchingUsers}
      noWrapper={noWrapper}
      noOptionsMessage={noOptionsMessage}
      closeMenuOnSelect={closeMenuOnSelect}
      className={className}
      {...rest}
    />
  )
}

export default UserChannelSelector
