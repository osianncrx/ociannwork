import { useEffect, useMemo, useState } from 'react'
import { queries } from '../../../../api'
import { ChatType } from '../../../../constants'
import UserChannelSelector from '../../../../shared/form-fields/UserChannelInput'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setSelectedFavMessages } from '../../../../store/slices/chatSlice'
import { mergeAndGroupMessages, mergeMessagesFromPages } from '../../utils/custom-functions'
import FavMessage from './FavMessage'
import { FavoriteMessageSection, UserChannelOption } from '../../../../types'


const Favorite = () => {
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { selectedFavMessages } = useAppSelector((store) => store.chat)
  const [customChat, setCustomChat] = useState<UserChannelOption | null>(null)
  const [isComponentReady, setIsComponentReady] = useState(false)

  const chatParams = {
    type: customChat ? customChat?.data?.type : selectedChat?.type,
    id: customChat ? customChat?.value : selectedChat?.id,
  }

  const dispatch = useAppDispatch()

  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = queries.useGetSpecialMessagesInfinite({ ...chatParams, filter: 'favorite' })

  // Component ready state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsComponentReady(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (messagesData?.pages) {
      const allMessages = mergeMessagesFromPages(messagesData.pages)
      const processedMessages = mergeAndGroupMessages(allMessages)
      dispatch(setSelectedFavMessages(processedMessages))
    }
  }, [messagesData, fetchNextPage, hasNextPage, isFetchingNextPage])

  const defaultChatOption = useMemo(() => {
    if (!selectedChat) return null
    const isChannel = selectedChat.type === ChatType.Channel
    return {
      value: String(selectedChat.id),
      label: isChannel ? `# ${selectedChat.name}` : selectedChat.name,
      data: {
        ...selectedChat,
        id: String(selectedChat.id),
        type: isChannel ? 'channel' : 'user',
        avatar: selectedChat.avatar,
        profile_color: selectedChat.profile_color,
        email: !isChannel ? selectedChat.email : undefined,
      },
    }
  }, [selectedChat])

  useEffect(() => {
    if (defaultChatOption && !customChat) {
      setCustomChat(defaultChatOption)
    }
  }, [defaultChatOption, customChat])

  // Show loader until component is ready and data is loaded
  if (!isComponentReady || isLoading) {
    return (
      <div className="custom-loader-chat">
        <span className="loader-main-chat"></span>
      </div>
    )
  }

  return (
    <div className="favmsg custom-scrollbar">
      <UserChannelSelector
        name="groupMembers"
        placeholder="Select chat to search in..."
        isMulti={false}
        includeUsers={true}
        includeChannels={true}
        maxInitialItems={6}
        value={customChat}
        onSelectionChange={(selected) => setCustomChat(selected)}
      />
      {selectedFavMessages.length === 0 ? (
        <div className="text-center p-4">
          <p className="text-muted">Favorite the messages/files that are important for the channel.</p>
        </div>
      ) : (
        <>
          {(selectedFavMessages as FavoriteMessageSection[]).map((item, index) =>
            item.messages.map((message, i: number) => (
              <FavMessage key={`${index}-${i}`} message={message} selectedFavMessages={selectedFavMessages} />
            )),
          )}
          {hasNextPage && (
            <button className="border-1 rounded-2 fs-7" onClick={() => fetchNextPage()}>
              Load More
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default Favorite
