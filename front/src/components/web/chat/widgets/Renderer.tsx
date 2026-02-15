import { format } from 'date-fns'
import Quill from 'quill'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageType } from '../../../../constants'
import { useAppSelector } from '../../../../store/hooks'
import { RendererProps } from '../../../../types'
import { SvgIcon } from '../../../../shared/icons'
import MessageReactions from '../chat-area/message-reactions'

const Renderer = memo(({ value, mentions = [], message, hideIcon = false, findMessageById }: RendererProps) => {
  const [isEmpty, setIsEmpty] = useState(false)
  const [isEmojiOnly, setIsEmojiOnly] = useState(false)
  const rendererRef = useRef<HTMLDivElement>(null)
  const { user } = useAppSelector((store) => store.auth)
  const [expanded, setExpanded] = useState(false)
  const [needsClamp, setNeedsClamp] = useState(false)
  const msgTime = message?.created_at ? format(new Date(message.created_at), 'hh:mm a') : ''

  const isEdited = useMemo(
    () =>
      message?.message_type !== MessageType.Call &&
      (message?.isEdited ||
        (message?.created_at &&
          message?.updated_at &&
          new Date(message.updated_at).getTime() - new Date(message.created_at).getTime() > 1000)),
    [message?.isEdited, message?.created_at, message?.updated_at],
  )

  const isSingleEmoji = useCallback((text: string): boolean => {
    if (!text || text.trim().length === 0) return false
    const cleanText = text.replace(/\s+/g, '')

    const emojiRegex =
      /^([\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2194}-\u{2199}\u{21A9}-\u{21AA}\u{231A}-\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{24C2}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE0F}\u{200D}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}\u{1F1E6}-\u{1F1FF}\u{1FA70}-\u{1FAFF}\u{1F780}-\u{1F7FF}\u{1F3FB}-\u{1F3FF}]+)$/u
    if (!emojiRegex.test(cleanText)) return false

    let graphemes: string[] = []
    // @ts-ignore
    if (typeof Intl?.Segmenter === 'function') {
      // @ts-ignore
      graphemes = Array.from(new Intl.Segmenter().segment(cleanText)).map((seg) => seg.segment)
    } else {
      graphemes = [...cleanText]
    }
    return graphemes.length === 1
  }, [])

  useEffect(() => {
    if (!rendererRef.current || !value) {
      setIsEmpty(true)
      setIsEmojiOnly(false)
      return
    }

    const container = rendererRef.current

    if (value.includes('"ops"') || (value.startsWith('{') && value.includes('"insert"'))) {
      try {
        const quill = new Quill(document.createElement('div'), {
          theme: 'snow',
          modules: { toolbar: false },
        })

        quill.enable(false)
        const contents = JSON.parse(value)
        quill.setContents(contents)

        const textContent = quill.getText().trim()
        const hasMentions = contents.ops?.some(
          (op: any) => op.insert && typeof op.insert === 'object' && op.insert.mention,
        )

        setIsEmpty(textContent.length === 0 && !hasMentions)
        const singleEmoji = !hasMentions && isSingleEmoji(textContent)
        setIsEmojiOnly(singleEmoji)

        if (textContent.length > 0 || hasMentions) {
          let html = quill.root.innerHTML

          html = formatUrls(html)

          if (user?.id) {
            html = highlightCurrentUserMentions(html, user.id, user.name, mentions)
          }
          container.innerHTML = html

          if (isEdited) {
            const pTags = Array.from(container.querySelectorAll('p'))

            const lastValidP = [...pTags].reverse().find((p) => {
              const text = p.textContent?.trim()
              return text && text !== ''
            })

            if (lastValidP) {
              const editedSpan = document.createElement('span')
              editedSpan.className = 'edited-indicator'
              editedSpan.textContent = '(edited)'
              lastValidP.appendChild(editedSpan)
            }
          }
          if (container.innerText.length > 500) {
            setNeedsClamp(true)
          } else {
            setNeedsClamp(false)
          }

          if (singleEmoji) {
            container.classList.add('emoji-only-message')
          } else {
            container.classList.remove('emoji-only-message')
          }
        }
      } catch (error) {
        console.error('Error parsing Quill content:', error)
        setIsEmpty(true)
        setIsEmojiOnly(false)
      }
    } else {
      const trimmedValue = value.trim()
      setIsEmpty(trimmedValue.length === 0)
      const singleEmoji = isSingleEmoji(trimmedValue)
      setIsEmojiOnly(singleEmoji)
      if (trimmedValue.length > 0) {
        let html = trimmedValue

        // Format URLs in plain text
        html = formatUrls(html)

        if (user?.id) {
          html = highlightCurrentUserMentions(html, user.id, user.name, mentions)
        }
        container.innerHTML = html
        if (singleEmoji) {
          container.classList.add('emoji-only-message')
        } else {
          container.classList.remove('emoji-only-message')
        }
      }
    }

    return () => {
      if (container) {
        container.innerHTML = ''
        container.classList.remove('emoji-only-message')
      }
    }
  }, [value, user?.id, user?.name, mentions, isSingleEmoji, isEdited])

  useEffect(() => {
    setExpanded(false)
  }, [value])

  if (isEmpty) return null

  return (
    <div className={`message-sub-title ${isEmojiOnly ? 'emoji-only-message' : ''}`}>
      <div ref={rendererRef} className={`message-content${needsClamp && !expanded ? ' message-clamped' : ''}`}></div>
      <div className="w-100 justify-content-between timer-box">
        {needsClamp && (
          <span onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Read less' : 'Read more'}
          </span>
        )}
        <div className="chat-pinned-box">
          {message?.isPinned && !hideIcon && (
            <div className="chat-content-pinned">
              <SvgIcon iconId="pin-1" className="common-svg-hw-btn" />
            </div>
          )}
          {message?.isFavorite && !hideIcon && (
            <SvgIcon className={`common-svg-hw-btn ${message?.isFavorite ? 'star-svg' : ''}`} iconId="star" />
          )}
          {!hideIcon && <span className="visible-chat-time">{msgTime}</span>}
        </div>
        {message && message?.reactions?.length > 0 && <MessageReactions message={message} findMessageById={findMessageById} />}
      </div>
    </div>
  )
})

const formatUrls = (html: string): string => {
  const urlRegex = /(https?:\/\/[^\s<>"]+)/gi
  return html.replace(urlRegex, (url) => {
    // Check if URL is already wrapped in an anchor tag
    if (html.indexOf(`<a`) !== -1 && html.indexOf(`href="${url}"`) !== -1) {
      return url
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link">${url}</a>`
  })
}

const highlightCurrentUserMentions = (
  html: string,
  currentUserId: string,
  currentUserName: string,
  mentions: string[] = [],
): string => {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  const allMentionSelectors = ['[data-mention]', '.mention', '[data-id]', 'span[data-denotation-char="@"]']
  allMentionSelectors.forEach((selector) => {
    const mentionElements = tempDiv.querySelectorAll(selector)
    mentionElements.forEach((mention) => {
      let isCurrentUser = false
      let isSpecialMention = false

      const mentionData = mention.getAttribute('data-mention')
      if (mentionData) {
        try {
          const parsedMention = JSON.parse(mentionData)
          if (parsedMention.id === currentUserId || parsedMention.id === String(currentUserId)) {
            isCurrentUser = true
          }
          if (parsedMention.id === 'all') {
            isSpecialMention = true
          }
        } catch (error) {
          console.warn('Failed to parse mention data:', error)
        }
      }

      const dataId = mention.getAttribute('data-id')
      if (dataId && (dataId === currentUserId || dataId === String(currentUserId))) {
        isCurrentUser = true
      }
      if (dataId && dataId === 'all') {
        isSpecialMention = true
      }

      const dataValue = mention.getAttribute('data-value')
      if (dataValue && dataValue === currentUserName) {
        isCurrentUser = true
      }
      if (dataValue && dataValue === 'all') {
        isSpecialMention = true
      }

      const mentionText = mention.textContent || ''
      if (mentionText.includes(`@${currentUserName}`) || mentionText === `@${currentUserName}`) {
        isCurrentUser = true
      }
      if (mentionText === '@all') {
        isSpecialMention = true
      }

      if (mentions.includes(currentUserId) || mentions.includes(String(currentUserId))) {
        isCurrentUser = true
      }

      if (isCurrentUser) {
        mention.classList.add('mention-current-user')
        if (!mention.classList.contains('mention')) {
          mention.classList.add('mention')
        }
      }
      if (isSpecialMention) {
        mention.classList.add('text')
        if (!mention.classList.contains('mention')) {
          mention.classList.add('mention')
        }
      }
    })
  })

  let processedHtml = tempDiv.innerHTML

  const existingMentions = tempDiv.querySelectorAll('.mention, [data-mention]')
  if (existingMentions.length === 0) {
    const mentionRegex = new RegExp(`@${currentUserName}\\b`, 'gi')
    processedHtml = processedHtml.replace(
      mentionRegex,
      `<span class="mention mention-current-user">@${currentUserName}</span>`,
    )
    processedHtml = processedHtml.replace(/@all\b/gi, `<span class="mention">@all</span>`)
  }

  return processedHtml
}

export default Renderer
