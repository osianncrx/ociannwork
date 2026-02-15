import { Fragment, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { queries } from '../../../../api'
import { ChatType } from '../../../../constants'
import { SvgIcon } from '../../../../shared/icons'
import { messageEncryptionService } from '../../../../services/message-encryption.service'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setSearchInput } from '../../../../store/slices/shortCutKeySlice'
import { Message } from '../../../../types/common'
import { SearchMessagesParams } from '../../../../types/api'
import { getPlainTextFromMessage } from '../../../../utils'
import { useGlobalRedirect } from '../../../../utils/hooks/useGlobalRedirect'

const Search = () => {
  const { t } = useTranslation()
  const { selectedChat } = useAppSelector((store) => store.chat)
  const dispatch = useAppDispatch()
  const { searchInput } = useAppSelector((state) => state.shortCutKey)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchInput && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchInput])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node) && searchInput) {
        dispatch(setSearchInput(false))
      }
    }

    if (searchInput) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [searchInput, dispatch])

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const { redirectToMessage } = useGlobalRedirect()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setSearchTerm('')
    setDebouncedSearchTerm('')
    dispatch(setSearchInput(false))
  }, [selectedChat?.id])

  useEffect(() => {
    if (!searchInput) {
      setSearchTerm('')
      setDebouncedSearchTerm('')
    }
  }, [searchInput])

  const getSearchParams = (): SearchMessagesParams | null => {
    if (!selectedChat || !debouncedSearchTerm) return null

    const params: SearchMessagesParams = {
      query: debouncedSearchTerm.trim(),
      scope: selectedChat.type === ChatType.Channel ? ChatType.Channel : ChatType.DM,
      limit: 5,
      offset: 0,
    }

    if (selectedChat.type === ChatType.Channel) {
      params.channel_id = selectedChat.id
    } else {
      params.recipient_id = selectedChat.id
    }

    return params
  }

  const searchParams = getSearchParams() ?? { query: '', limit: 5, offset: 0 }
  const {
    data: searchResults,
    isLoading: isSearchLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = queries.useSearchMessages(searchParams)
  const { data: e2eStatus } = queries.useGetE2EStatus()
  const isE2EEnabled = e2eStatus?.e2e_enabled || false

  // Helper function to decrypt message content for search results
  const decryptMessageContent = (message: Message): string => {
    if (!isE2EEnabled || !message.content) {
      return message.content || ''
    }

    try {
      // For search results, we'll use a fallback decryption since we don't have sender's key readily available
      // The message should ideally come with decrypted content from the backend, but we'll handle it here
      return messageEncryptionService.decryptMessage(message.content)
    } catch (error) {
      console.error('Error decrypting search message content:', error)
      return message.content || ''
    }
  }

  const highlightSearchTerm = (text: string) => {
    if (!debouncedSearchTerm || !text) return text

    const regex = new RegExp(`(${debouncedSearchTerm})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      part.toLowerCase() === debouncedSearchTerm.toLowerCase() ? (
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

  const handleResultClick = (message: Message) => {
    redirectToMessage(String(message.id), selectedChat)
    dispatch(setSearchInput(false))
    setSearchTerm('')
    setDebouncedSearchTerm('')
  }

  return (
    <div className="header-right-wrapper">
      <div ref={searchContainerRef} className={`search-full ${searchInput ? 'active' : ''}`}>
        <div className="form-group w-100">
          <div className="Typeahead">
            <div className="u-posRelative">
              <input
                ref={searchInputRef}
                className="search-input form-control-plaintext w-100"
                type="text"
                placeholder={t('search_anything')}
                name="q"
                autoFocus={searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchInput && (
                <button type="button" className="close-search" onClick={() => dispatch(setSearchInput(false))}>
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Results Dropdown */}
        {searchInput && debouncedSearchTerm.length > 0 && (
          <div className="search-results-dropdown">
            {isSearchLoading && <div className="loading">{t('searching')}</div>}

            {searchResults && searchResults?.pages?.length > 0 ? (
              <>
                {searchResults.pages.map((page, pageIndex) => (
                  <Fragment key={pageIndex}>
                    {page.messages.length > 0 ? (
                      (page.messages as unknown as Message[]).map((message) => (
                        <div
                          key={`${pageIndex}-${message.id}`}
                          className="message-result"
                          onClick={() => handleResultClick(message)}
                        >
                          <div className="message-header">
                            <span className="sender-name">{message.sender?.name || t('you')}</span>
                            <span className="message-time">{formatDate(message.created_at)}</span>
                          </div>
                          <div className="message-content">
                            {highlightSearchTerm(getPlainTextFromMessage(decryptMessageContent(message)))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-results">
                        <SvgIcon iconId="no-data-available" />

                        <span>{t('no_messages_found')}</span>
                      </div>
                    )}
                  </Fragment>
                ))}
                {hasNextPage && (
                  <button
                    className="load-more-btn border-1 rounded-2 fs-7 w-100 p-2 mt-2"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? t('loading') : t('load_more')}
                  </button>
                )}
              </>
            ) : (
              !isSearchLoading && <div className="no-results">{t('no_messages_found')}</div>
            )}
          </div>
        )}
      </div>
      <span className="header-search" onClick={() => dispatch(setSearchInput())}>
        <SvgIcon iconId="search-sidebar" className="search-bar" />
      </span>
    </div>
  )
}

export default Search
