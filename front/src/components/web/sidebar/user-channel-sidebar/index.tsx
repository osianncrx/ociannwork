import { memo, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { mutations, queries } from '../../../../api'
import { ChatType, STORAGE_KEYS } from '../../../../constants'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setSidebarToggle } from '../../../../store/slices/admin/layoutSlice'
import { addNewChat, selectChat, togglePinChat } from '../../../../store/slices/chatSlice'
import { ChatItem, ExtendedChatItem, User } from '../../../../types'
import { getStorage, sortWithPriorityChannels } from '../../../../utils'
import { useClickOutside, useDebounce } from '../../../../utils/hooks'
import ChatListItem from './ChatListItem'
import SearchBox from './search/SearchBox'
import SearchResultItem from './search/SearchResultItem'
import { SvgIcon } from '../../../../shared/icons'

const UserChannelSidebar = () => {
  const { allChats, selectedChat, unreadCounts } = useAppSelector((store) => store.chat)
  const dispatch = useAppDispatch()
  const storage = getStorage()
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)
  const { mutate: pinUnpinChat } = mutations.usePinUnpinChat()
  const searchRef = useRef<HTMLInputElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const { data: allTeamMembers } = queries.useGetTeamMembersList(
    {
      search: debouncedSearch,
    },
    {
      enabled: !!debouncedSearch,
    },
  )

  const enhancedChats = useMemo(() => {
    return allChats.map((chat) => {
      const chatKey = `${chat.type}_${chat.id}`
      return {
        ...chat,
        unread_count: unreadCounts[chatKey] || 0,
      }
    })
  }, [allChats, unreadCounts])

  const { pinnedChats, unpinnedChats } = useMemo(() => {
    const pinned: ChatItem[] = []
    const unpinned: ChatItem[] = []

    enhancedChats?.forEach((chat) => {
      if (chat.pinned) {
        pinned.push(chat)
      } else {
        unpinned.push(chat)
      }
    })

    return { pinnedChats: pinned, unpinnedChats: sortWithPriorityChannels(unpinned) }
  }, [enhancedChats])

  const filterChats = useCallback(
    (chats: ChatItem[]) => {
      const lowerSearch = search?.toLowerCase() || ''
      return chats.filter(
        (chat) => chat.name?.toLowerCase().includes(lowerSearch) || chat.email?.toLowerCase().includes(lowerSearch),
      )
    },
    [search],
  )

  const filteredPinned = useMemo(() => filterChats(pinnedChats), [filterChats, pinnedChats])
  const filteredUnpinned = useMemo(() => filterChats(unpinnedChats), [filterChats, unpinnedChats])
  const totalFiltered = filteredPinned.length + filteredUnpinned.length

  const handleStartNewChat = useCallback(
    (user: User) => {
      const newChat: ExtendedChatItem = {
        type: ChatType.DM,
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        profile_color: user.profile_color,
        latest_message_at: null,
        pinned: false,
        last_message: null,
      }

      dispatch(addNewChat(newChat))
      dispatch(selectChat(newChat))
      setSearch('')
    },
    [dispatch],
  )

  const handlePinUnpinChat = useCallback(
    (e: MouseEvent, chat: ChatItem) => {
      e.stopPropagation()
      const updatedPinStatus = !chat.pinned
      // dispatch(
      //   toggleP
      // inChat({
      //     id: chat.id,
      //     type: chat.type,
      //     pinned: updatedPinStatus,
      //   }),
      // )

      pinUnpinChat(
        {
          type: chat.type,
          target_id: chat.id,
          pin: updatedPinStatus,
        },
        {
          onError: (error) => {
            dispatch(
              togglePinChat({
                id: chat.id,
                type: chat.type,
                pinned: chat.pinned,
              }),
            )
            console.error('Failed to update pin status:', error)
          },
        },
      )
    },
    [dispatch, pinUnpinChat],
  )

  const handleSelectChat = useCallback(
    (chat: ExtendedChatItem) => {
      dispatch(selectChat(chat))
      const width = window.innerWidth
      dispatch(setSidebarToggle(width >= 768))
      storage.setItem(STORAGE_KEYS.SELECTED_CHAT, chat)
    },
    [dispatch, storage],
  )

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([])
      return
    }

    const newMembers = (allTeamMembers?.members || []).filter(
      (member) => !allChats?.some((chat) => chat.id === member.id && chat.type === ChatType.DM),
    )

    setSearchResults(newMembers)
  }, [debouncedSearch, allChats, allTeamMembers])

  useEffect(() => {
    setSearchResults([])
    setSearch('')
  }, [selectedChat?.id])

  useEffect(() => {
    if (!allChats || allChats.length === 0) return

    const savedChat = storage.getItem(STORAGE_KEYS.SELECTED_CHAT)

    if (!savedChat) {
      if (!selectedChat && allChats.length > 0) {
        const firstChat = allChats.find((chat) => chat.pinned) || allChats[0]
        dispatch(selectChat(firstChat))
        storage.setItem(STORAGE_KEYS.SELECTED_CHAT, firstChat)
      }
      return
    }

    try {
      const existingSavedChat = allChats.find((chat) => chat.id === savedChat.id && chat.type === savedChat.type)

      if (existingSavedChat) {
        if (
          !selectedChat ||
          selectedChat?.id !== existingSavedChat.id ||
          selectedChat.type !== existingSavedChat.type
        ) {
          dispatch(selectChat(existingSavedChat))
        }
      } else {
        storage.removeItem(STORAGE_KEYS.SELECTED_CHAT)
        if (allChats.length > 0) {
          const firstChat = allChats.find((chat) => chat.pinned) || allChats[0]
          dispatch(selectChat(firstChat))
          storage.setItem(STORAGE_KEYS.SELECTED_CHAT, firstChat)
        }
      }
    } catch (e) {
      console.error('Failed to parse saved chat', e)
      storage.removeItem(STORAGE_KEYS.SELECTED_CHAT)
    }
  }, [allChats, dispatch, storage])

  useEffect(() => {
    if (!selectedChat || !allChats) return

    const chatExists = allChats.some((chat) => chat?.id === selectedChat?.id && chat?.type === selectedChat?.type)

    if (!chatExists && allChats.length > 0) {
      const newSelectedChat = allChats.find((chat) => chat.pinned) || allChats[0]

      dispatch(selectChat(newSelectedChat))
      storage.setItem(STORAGE_KEYS.SELECTED_CHAT, newSelectedChat)
    }
  }, [allChats, selectedChat, dispatch, storage])

  useHotkeys(
    'alt+k',
    (event) => {
      event.preventDefault()
      searchRef.current?.focus()
    },
    {
      enableOnFormTags: true,
      preventDefault: true,
    },
  )

  useClickOutside(sidebarRef, () => setSearch(''))

  return (
    <>
      <div className="chat-sidebar" ref={sidebarRef}>
        <SearchBox ref={searchRef} value={search} onChange={setSearch} />
        <div className="custom-scrollbar chat-sidebar-menu">
          {filteredPinned.length > 0 && (
            <>
              <div className="sidebar-header">
                <span>Pinned</span>
              </div>
              <ul className="chat-list custom-scrollbar">
                {filteredPinned.map((chat, i) => (
                  <ChatListItem
                    key={`pinned-${i}`}
                    chat={chat}
                    isActive={selectedChat?.id === chat.id && selectedChat?.type === chat?.type}
                    onSelect={() => handleSelectChat(chat)}
                    onPin={(e) => handlePinUnpinChat(e, chat)}
                  />
                ))}
              </ul>
            </>
          )}

          {filteredUnpinned.length > 0 && (
            <>
              <div className="sidebar-header">
                <span>Chats & Channels</span>
              </div>
              <ul className="chat-list custom-scrollbar">
                {filteredUnpinned.map((chat, i) => (
                  <ChatListItem
                    key={`unpinned-${i}`}
                    chat={chat}
                    isActive={selectedChat?.id === chat.id && selectedChat?.type === chat?.type}
                    onSelect={() => handleSelectChat(chat)}
                    onPin={(e) => handlePinUnpinChat(e, chat)}
                  />
                ))}
              </ul>
            </>
          )}

          {searchResults.length > 0 && (
            <>
              <div className="sidebar-header">Connect with new team members </div>
              <ul className="chat-list custom-scrollbar">
                {searchResults.map((member) => (
                  <SearchResultItem key={member.id} member={member} onStartChat={() => handleStartNewChat(member)} />
                ))}
              </ul>
            </>
          )}

          {search.trim() && debouncedSearch === search && totalFiltered === 0 && searchResults.length === 0 && (
            <div className="sidebar-header">
              <div className="no-data-found-svg">
                <SvgIcon iconId="no-data-available" />
                <span>No Results found</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default memo(UserChannelSidebar)
