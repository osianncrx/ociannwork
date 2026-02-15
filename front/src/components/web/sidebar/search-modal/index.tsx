import { useEffect, useState } from 'react'
import DatePicker from 'react-datepicker'
import { Col, Row } from 'reactstrap'
import { queries } from '../../../../api'
import { ChatType } from '../../../../constants'
import { messageEncryptionService } from '../../../../services/message-encryption.service'
import UserChannelSelector from '../../../../shared/form-fields/UserChannelInput'
import { SimpleModal } from '../../../../shared/modal'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setSearchModal } from '../../../../store/slices/shortCutKeySlice'
import { ExtendedChatItem, SearchMessage, SearchParams, SearchResponse } from '../../../../types'
import { getPlainTextFromMessage } from '../../../../utils'
import { useGlobalRedirect } from '../../../../utils/hooks/useGlobalRedirect'

const SearchModal = ({ searchModal }: { searchModal: boolean }) => {
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [searchedChat, setSearchedChat] = useState<any>(null)
  const [selectedSender, setSelectedSender] = useState<any>(null)
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)
  const [searchParams, setSearchParams] = useState<SearchParams>({})
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [allMessages, setAllMessages] = useState<SearchMessage[]>([])
  const [pagination, setPagination] = useState<SearchResponse['pagination'] | null>(null)
  const [searchTimestamp, setSearchTimestamp] = useState<string |number>(0)
  const dispatch = useAppDispatch()
  const maxDate = new Date()

  const {
    data: searchResults,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = queries.useSearchMessages({ ...searchParams, _timestamp: searchTimestamp })

  const { user } = useAppSelector((store) => store.auth)
  const { redirectToMessage } = useGlobalRedirect()
  const { data: e2eStatus } = queries.useGetE2EStatus()
  const isE2EEnabled = e2eStatus?.e2e_enabled || false

  // Helper function to decrypt message content for search results
  const decryptMessageContent = (message: SearchMessage): string => {
    if (!isE2EEnabled || !message.content) {
      return message.content || ''
    }

    try {
      return messageEncryptionService.decryptMessage(message.content)
    } catch (error) {
      console.error('Error decrypting search message content:', error)
      return message.content || ''
    }
  }

  useEffect(() => {
    if (!searchModal) {
      resetModalState()
    }
  }, [searchModal])

  useEffect(() => {
    if (hasSearched && searchTerm) {
      const timeoutId = setTimeout(() => {
        handleSearch()
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [searchedChat, selectedSender, fromDate, toDate])

  useEffect(() => {
    if (searchResults && hasSearched) {
      const allMessagesFromPages = searchResults.pages.flatMap((page) => page.messages || [])
      setAllMessages(allMessagesFromPages)

      const lastPage = searchResults.pages[searchResults.pages.length - 1]
      if (lastPage) {
        setPagination({
          total: lastPage.total || 0,
          limit: searchParams.limit || 20,
          offset: lastPage.offset || 0,
          hasMore: hasNextPage || false,
        })
      }
    }
  }, [searchResults, hasSearched, hasNextPage])

  useEffect(() => {
    if (searchTerm === '') {
      setHasSearched(false)
      setSearchParams({})
      setAllMessages([])
      setPagination(null)
    }
  }, [searchTerm])

  const resetModalState = () => {
    setSearchTerm('')
    setSearchedChat(null)
    setSelectedSender(null)
    setFromDate(null)
    setToDate(null)
    setSearchParams({})
    setHasSearched(false)
    setAllMessages([])
    setPagination(null)
    setIsDatePickerOpen(false)
    setSearchTimestamp(0)
  }

  const handleFromDateChange = (date: Date | null) => {
    setFromDate(date)
    if (date && toDate && date > toDate) {
      setToDate(date)
    }
  }

  const handleToDateChange = (date: Date | null) => {
    setToDate(date)
    if (fromDate && date && date < fromDate) {
      setFromDate(date)
    }
  }

  const handleSearch = () => {
    const params: SearchParams = {
      query: searchTerm,
      channel_id: searchedChat?.data?.type === ChatType.Channel ? searchedChat?.data?.id : undefined,
      recipient_id: searchedChat?.data?.type !== ChatType.Channel ? searchedChat?.data?.id : undefined,
      date_from: fromDate ? fromDate.toISOString().split('T')[0] : undefined,
      date_to: toDate ? toDate.toISOString().split('T')[0] : undefined,
      sender_id: selectedSender?.data?.id || undefined,
      scope: searchedChat ? (searchedChat?.data?.type === ChatType.Channel ? ChatType.Channel : ChatType.DM) : 'global',
      limit: 20,
      offset: 0,
    }

    Object.keys(params).forEach((key) => {
      if (params[key as keyof SearchParams] === undefined) {
        delete params[key as keyof SearchParams]
      }
    })

    setSearchParams(params)
    setHasSearched(true)
    setSearchTimestamp(Date.now())
  }

  const handleLoadMore = () => {
    if (!hasNextPage || isFetchingNextPage) return
    fetchNextPage()
  }

  const highlightSearchTerm = (text: string) => {
    if (!searchTerm || !text) return text

    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={index} className="search-highlight">
          {part}
        </mark>
      ) : (
        part
      ),
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleRedirect = (message: SearchMessage) => {
    let chat: ExtendedChatItem

    if (message?.channel) {
      chat = {
        ...message,
        id: message?.channel.id,
        type: ChatType.Channel,
        name: message?.channel.name,
        avatar: null,
        pinned: false,
        unread_count: 0,
      }
    } else {
      const otherUserId = (message?.sender_id === user?.id ? message?.recipient?.id : message?.sender_id) || user?.id
      const otherUserName = message?.sender_id === user?.id ? message?.recipient?.name : message?.sender?.name
      const otherUserAvatar = message?.sender_id === user?.id ? message?.recipient?.avatar : message?.sender?.avatar

      chat = {
        ...message,
        id: otherUserId,
        type: ChatType.DM,
        name: otherUserName || `User ${otherUserId}`,
        avatar: otherUserAvatar || null,
        pinned: false,
        unread_count: 0,
      }
    }

    redirectToMessage(String(message?.id), chat)

    dispatch(setSearchModal())
  }

  return (
    <SimpleModal
      className={`custom-channel mb-2 search-modal-container ${isDatePickerOpen ? 'date-picker-modal' : ''}`}
      isOpen={searchModal}
      onClose={() => dispatch(setSearchModal())}
      title={'Search Messages'}
      size="lg"
    >
      <div className="search-modal">
        <Row className="g-sm-3 g-2">
          <Col xs="12">
            <div className="search-input-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder={'Search messages...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button
                className="btn btn-primary search-button"
                onClick={handleSearch}
                disabled={isLoading || !searchTerm}
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </Col>
          <Col lg="6">
            <div className="date-aligns">
              <label className="form-label">From Date :</label>
              <DatePicker
                selected={fromDate}
                onChange={handleFromDateChange}
                selectsStart
                startDate={fromDate}
                endDate={toDate}
                maxDate={maxDate}
                placeholderText="Select start date"
                className="form-control"
                onCalendarOpen={() => setIsDatePickerOpen(true)}
                onCalendarClose={() => setIsDatePickerOpen(false)}
              />
            </div>
          </Col>

          <Col lg="6">
            <div className="date-aligns">
              <label className="form-label">To Date :</label>
              <DatePicker
                selected={toDate}
                onChange={handleToDateChange}
                selectsEnd
                startDate={fromDate}
                endDate={toDate}
                minDate={fromDate || undefined}
                maxDate={maxDate}
                placeholderText="Select end date"
                className="form-control"
                onCalendarOpen={() => setIsDatePickerOpen(true)}
                onCalendarClose={() => setIsDatePickerOpen(false)}
              />
            </div>
          </Col>
          <Col lg="6">
            <label className="form-label">Message Posted In :</label>
            <UserChannelSelector
              onMenuOpen={() => setIsDatePickerOpen(true)}
              onMenuClose={() => setIsDatePickerOpen(false)}
              name="groupMembers"
              placeholder="Select chat to search in..."
              isMulti={false}
              includeUsers={true}
              includeChannels={true}
              maxInitialItems={6}
              value={searchedChat}
              onSelectionChange={(selected) => setSearchedChat(selected)}
            />
          </Col>
          <Col lg="6">
            <label className="form-label">Message From :</label>
            <UserChannelSelector
              onMenuOpen={() => setIsDatePickerOpen(true)}
              onMenuClose={() => setIsDatePickerOpen(false)}
              name="senderSelector"
              placeholder="Select sender to filter by..."
              isMulti={false}
              includeUsers={true}
              includeChannels={false}
              maxInitialItems={6}
              value={selectedSender}
              onSelectionChange={(selected) => setSelectedSender(selected)}
            />
          </Col>
        </Row>

        {/* Search Results Section */}
        {hasSearched && allMessages.length > 0 && (
          <div className="search-results-section custom-scrollbar">
            <h4>Search Results ({pagination?.total || allMessages.length})</h4>
            <div className="results-list">
              {allMessages.map((message: SearchMessage) => {
                return (
                  <div key={message?.id} className="message-result" onClick={() => handleRedirect(message)}>
                    <div className="message-header">
                      <span className="sender-name">{message?.sender?.name}</span>
                      <span className="message-time">{formatDate(message?.created_at)}</span>
                    </div>
                    <div className="message-content">
                      {highlightSearchTerm(getPlainTextFromMessage(decryptMessageContent(message)))}
                    </div>
                    {message.channel && <div className="message-channel">In: {message?.channel?.name}</div>}
                    {message.sender_id == user.id && (
                      <div className="message-channel">To: {message?.recipient?.name}</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="load-more-section text-center mt-3">
                <button className="btn btn-outline-primary" onClick={handleLoadMore} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? 'Loading...' : 'Load Older Messages'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {hasSearched && allMessages.length === 0 && !isLoading && (
          <div className="search-results-section">
            <div className="no-results">No messages found matching your search criteria.</div>
          </div>
        )}
      </div>
    </SimpleModal>
  )
}

export default SearchModal
