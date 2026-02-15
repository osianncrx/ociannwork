import { useCallback, useEffect, useMemo, useState } from 'react'
import { queries } from '../../api'
import { ChatType } from '../../constants'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { selectChat, setAllTeamMembers } from '../../store/slices/chatSlice'
import { ChatItem, SingleTeam } from '../../types'
import { sortWithPriorityChannels } from '../../utils'

export const useDirectoryData = (activeTab: string) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [channelSearchTerm, setChannelSearchTerm] = useState('')

  const { allChats, allTeamMembers } = useAppSelector((store) => store.chat)
  const dispatch = useAppDispatch()

  const { data: teamMembersData, isLoading: isLoadingMembers } = queries.useGetTeamMembersList(
    { all: true },
    { enabled: activeTab == '2' },
  )

  useEffect(() => {
    if (teamMembersData) {
      dispatch(setAllTeamMembers(teamMembersData))
    }
  }, [teamMembersData, dispatch])

  useEffect(() => {
    setSearchTerm('')
    setChannelSearchTerm('')
  }, [activeTab])

  const getRecentChats = useCallback(() => {
    return allChats
      .filter((chat) => chat.latest_message_at)
      .sort((a, b) => {
        const aTime = a.latest_message_at ? new Date(a.latest_message_at).getTime() : 0
        const bTime = b.latest_message_at ? new Date(b.latest_message_at).getTime() : 0
        return bTime - aTime
      })
      .slice(0, 20)
  }, [allChats])

  const getRecentDMs = useCallback(() => getRecentChats().filter((chat) => chat.type === ChatType.DM), [getRecentChats])

  const getRecentChannels = useCallback(
    () => getRecentChats().filter((chat) => chat.type === ChatType.Channel),
    [getRecentChats],
  )

  const getChannels = useCallback(() => allChats.filter((chat) => chat.type === ChatType.Channel), [allChats])

  const getTeamMembers = useCallback((): ChatItem[] => {
    if (!Array.isArray(allTeamMembers.members)) return []
    return allTeamMembers.members.map(
      (member: SingleTeam): ChatItem => ({
        type: ChatType.DM,
        id: member.id,
        name: member.name || `User ${member.id}`,
        email: member.email || null,
        avatar: member.avatar || null,
        latest_message_at: null,
        pinned: false,
        profile_color: member.profile_color,
      }),
    )
  }, [allTeamMembers])

  const getFilteredTeamMembers = useMemo(() => {
    const allMembers: ChatItem[] = getTeamMembers()
    const filteredMembers: ChatItem[] = searchTerm
      ? allMembers.filter(
          (member: ChatItem) =>
            member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : allMembers

    return filteredMembers
  }, [getTeamMembers, searchTerm])

  const getFilteredChannels = useMemo(() => {
    const allChannelList = getChannels()
    const filtered = channelSearchTerm
      ? allChannelList.filter((c) => c.name && c.name.toLowerCase().includes(channelSearchTerm.toLowerCase()))
      : allChannelList

    return sortWithPriorityChannels(filtered)
  }, [getChannels, channelSearchTerm])

  const handleChatSelect = useCallback(
    (selectedItem: ChatItem) => {
      if (selectedItem.type === ChatType.DM) {
        const existingDMChat = allChats.find((chat) => chat.type === ChatType.DM && chat.id === selectedItem.id)
        if (existingDMChat) {
          dispatch(selectChat(existingDMChat))
        } else {
          const dmChat: ChatItem = {
            id: selectedItem.id,
            name: selectedItem.name,
            type: ChatType.DM,
            avatar: selectedItem.avatar,
            profile_color: selectedItem.profile_color,
            email: selectedItem.email,
            latest_message_at: null,
            pinned: false,
          }
          dispatch(selectChat(dmChat))
        }
      } else {
        dispatch(selectChat(selectedItem))
      }
    },
    [allChats, dispatch],
  )

  return {
    // State
    searchTerm,
    setSearchTerm,
    channelSearchTerm,
    setChannelSearchTerm,
    isLoadingMembers,

    // Data
    recentDMs: getRecentDMs(),
    recentChannels: getRecentChannels(),
    allMembers: getTeamMembers(),
    filteredMembers: getFilteredTeamMembers,
    allChannels: getChannels(),
    filteredChannels: getFilteredChannels,

    // Actions
    handleChatSelect,
  }
}
