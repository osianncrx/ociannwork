import Quill, { Delta, QuillOptions } from 'quill'
import { Mention, MentionBlot } from 'quill-mention'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Button } from 'reactstrap'
import { queries } from '../../../../../api'
import { ChatType } from '../../../../../constants'
import { SvgIcon } from '../../../../../shared/icons'
import { Hint } from '../../../../../shared/tooltip'
import { useAppSelector } from '../../../../../store/hooks'
import { DeltaOperation, EditorProps, EditorRef, EmojiData, MentionUser, MesageInputChannelMember } from '../../../../../types'
import { stringify } from '../../../../../utils'
import FilePreview from './FilePreview'
import UploadAttachments from './UploadAttachments'
import AudioRecorder from './AudioRecorder'
import EmojiWrapper from './EmojiWrapper'
import ShareLocation from './ShareLocation'

Quill.register({ 'blots/mention': MentionBlot, 'modules/mention': Mention })


class DraftManager {
  private static drafts = new Map<string, Delta>()

  static saveDraft(key: string, content: Delta): void {
    this.drafts.set(key, content)
  }

  static getDraft(key: string): Delta | null {
    return this.drafts.get(key) || null
  }

  static clearDraft(key: string): void {
    this.drafts.delete(key)
  }

  static hasDraft(key: string): boolean {
    return this.drafts.has(key)
  }
}

const Editor = forwardRef<EditorRef, EditorProps>(
  (
    {
      onCancel,
      onSubmit,
      onChange,
      placeholder = 'Type a message...',
      defaultValue = [],
      disabled = false,
      innerRef,
      variant = 'create',
      maxLength,
      draftKey,
      enableDraft = true,
      draftSaveDelay,
      onMaxLengthExceeded,
    },
    ref,
  ) => {
    const [editorVisible, setEditorVisible] = useState(false)
    const [text, setText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [, setHasDraft] = useState(false)
    const [isOverLimit, setIsOverLimit] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [showAudioRecorder, setShowAudioRecorder] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null)
    const submitRef = useRef(onSubmit)
    const placeholderRef = useRef(placeholder)
    const quillRef = useRef<Quill | null>(null)
    const defaultValueRef = useRef(defaultValue)
    const containerRef = useRef<HTMLDivElement>(null)
    const draftSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const { teamSetting } = useAppSelector((store) => store.teamSetting)

    const clearDraft = useCallback(() => {
      if (!enableDraft || !draftKey) return

      DraftManager.clearDraft(draftKey)
      setHasDraft(false)
      if (quillRef.current) {
        quillRef.current.setContents([])
        setText('')
      }
    }, [enableDraft, draftKey])

    // Get channel data for mentions and current user
    const { selectedChat } = useAppSelector((store) => store.chat)
    const { data: channelData } = queries.useGetChannelById(
      { id: selectedChat?.id },
      { enabled: selectedChat?.type === ChatType.Channel && !!selectedChat?.id },
    )
    const { user } = useAppSelector((store) => store.auth)

    // Add file handling functions
    const handleFilesSelected = (files: File[]) => {
      setSelectedFiles((prevFiles) => [...prevFiles, ...files])
    }

    const handleRemoveFile = (index: number) => {
      setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))
    }

    // Handle direct audio send
    const handleDirectAudioSend = useCallback(
      async (audioFile: File) => {
        setIsSubmitting(true)
        try {
          await submitRef.current({
            body: '',
            files: [audioFile],
          })
          // Clear editor content
          if (quillRef.current) {
            quillRef.current.setContents([])
            setText('')
          }
          setIsOverLimit(false)
          setSelectedFiles([])
          clearDraft()
        } catch (error) {
          console.error('Failed to send audio:', error)
        } finally {
          setIsSubmitting(false)
        }
        setShowAudioRecorder(false)
      },
      [clearDraft],
    )

    // Handle audio cancel
    const handleAudioCancel = useCallback(() => {
      setShowAudioRecorder(false)
      // Focus editor after cancel
      setTimeout(() => {
        if (quillRef.current) {
          quillRef.current.focus()
        }
      }, 100)
    }, [])

    const handleRecordClick = () => {
      setShowAudioRecorder(true)
    }

    const handleLocationSelected = useCallback(
      async (location: { latitude: number; longitude: number; address: string }) => {
        setSelectedLocation(location)
        // Automatically send the location message
        setIsSubmitting(true)
        try {
          await submitRef.current({
            body: '',
            files: undefined,
            location,
          })
          setSelectedLocation(null)
          clearDraft()
        } catch (error) {
          console.error('Failed to send location:', error)
        } finally {
          setIsSubmitting(false)
        }
      },
      [clearDraft],
    )

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      clearContent: () => {
        if (quillRef.current) {
          quillRef.current.setContents([])
          setText('')
          setIsOverLimit(false)
          setSelectedFiles([])
          setSelectedLocation(null)
          clearDraft()
        }
      },
      focus: () => {
        if (quillRef.current) {
          quillRef.current.focus()
        }
      },
      getTextLength: () => text.trim().length,
      clearDraft,
      saveDraft,
      insertMention: () => {
        if (quillRef.current) {
          const selection = quillRef.current.getSelection(true)
          const index = selection ? selection.index : quillRef.current.getLength()
          quillRef.current.insertText(index, '@', 'user')
          quillRef.current.setSelection(index + 1)
        }
      },
      setDragDropFiles: (files: File[]) => {
        setSelectedFiles((prevFiles) => [...prevFiles, ...files])
      },
    }))

    const saveDraft = useCallback(() => {
      if (!enableDraft || !draftKey || !quillRef.current) return

      const content = quillRef.current.getContents()
      const textContent = quillRef.current.getText().trim()

      if (textContent.length > 0) {
        DraftManager.saveDraft(draftKey, content)
        setHasDraft(true)
      } else {
        DraftManager.clearDraft(draftKey)
        setHasDraft(false)
      }
    }, [enableDraft, draftKey])

    const loadDraft = useCallback(() => {
      if (!enableDraft || !draftKey || !quillRef.current) return

      const draft = DraftManager.getDraft(draftKey)
      if (draft) {
        quillRef.current.setContents(draft)
        setText(quillRef.current.getText())
        setHasDraft(true)
      }
    }, [enableDraft, draftKey])

    // Debounced draft saving
    const debouncedSaveDraft = useCallback(() => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current)
      }

      draftSaveTimeoutRef.current = setTimeout(() => {
        saveDraft()
      }, draftSaveDelay)
    }, [saveDraft, draftSaveDelay])

    // Handle mention click from toolbar
    const handleMentionClick = () => {
      if (quillRef.current) {
        const selection = quillRef.current.getSelection(true)
        const index = selection ? selection.index : quillRef.current.getLength()
        quillRef.current.focus()
        quillRef.current.insertText(index, '@', 'user')
        quillRef.current.setSelection(index + 1)
      }
    }

    const toggleEditor = () => {
      const toolbar = containerRef.current?.querySelector('.ql-toolbar') as HTMLElement
      const editor = containerRef.current?.querySelector('.ql-editor')?.parentElement as HTMLElement

      if (toolbar && editor) {
        if (editorVisible) {
          // Hide toolbar
          toolbar.style.display = 'none'
          toolbar.classList.add('none')
          toolbar.classList.remove('display')
          setEditorVisible(false)
        } else {
          // Show toolbar
          toolbar.style.display = 'block'
          toolbar.classList.add('display')
          toolbar.classList.remove('none')
          setEditorVisible(true)
        }
      }
    }

    const onEmojiSelect = (emojiData: EmojiData) => {
      const quill = quillRef.current
      if (quill) {
        const selection = quill.getSelection(true)
        const index = selection ? selection.index : quill.getLength()
        const emojiChar = emojiData.emoji || emojiData.unified || emojiData.native
        if (emojiChar) {
          // Focus the editor first
          quill.focus()
          quill.insertText(index, emojiChar, 'user')
          quill.setSelection(index + emojiChar.length)

          if (enableDraft) {
            debouncedSaveDraft()
          }

          if (onChange) {
            onChange()
          }
        }
      }
    }

    const formatUrlsInEditor = useCallback((quill: Quill) => {
      const text = quill.getText()
      const urlRegex = /(https?:\/\/[^\s<>"]+)/gi
      let match

      while ((match = urlRegex.exec(text)) !== null) {
        const url = match[0]
        const index = match.index

        // Check if this text range is already formatted as a link
        const format = quill.getFormat(index, url.length)
        if (!format.link) {
          // Store current selection
          const selection = quill.getSelection()

          // Apply link formatting
          quill.formatText(index, url.length, 'link', url)

          // Restore selection if it existed
          if (selection) {
            quill.setSelection(selection)
          }
        }
      }
    }, [])

    // Enhanced submit function with length validation
    const submitMessage = async () => {
      if (!quillRef.current || isSubmitting) return

      const deltaContent = quillRef.current.getContents()
      const textContent = quillRef.current.getText().trim()

      const hasRealContent = deltaContent.ops?.some((op: DeltaOperation) => {
        if (typeof op.insert === 'string') {
          return op.insert.trim().length > 0
        }
        if (typeof op.insert === 'object' && op.insert !== null) {
          return op.insert.mention || op.insert.image || op.insert.video
        }
        return false
      })

      const hasFiles = selectedFiles.length > 0
      const hasLocation = selectedLocation !== null

      // Allow submit if either content, files, or location exist
      if (!hasRealContent && !hasFiles && !hasLocation) {
        return
      }

      // Check if content exceeds max length and show toast
      if (maxLength && textContent?.length > maxLength) {
        if (onMaxLengthExceeded) {
          onMaxLengthExceeded(textContent.length, maxLength)
        }
        return
      }

      setIsSubmitting(true)
      try {
        const body = hasRealContent ? stringify(deltaContent) : ''

        await submitRef.current({
          body,
          files: hasFiles ? selectedFiles : undefined,
          location: hasLocation ? selectedLocation : undefined,
        })

        quillRef.current.setContents([])
        setText('')
        setIsOverLimit(false)
        setSelectedFiles([])
        setSelectedLocation(null)
        clearDraft()
      } catch (error) {
        console.error('Failed to submit message:', error)
      } finally {
        setIsSubmitting(false)
      }
    }

    const getMentionUsers = useCallback((): MentionUser[] => {
      if (selectedChat?.type === ChatType.Channel && channelData?.channel?.members) {
        const members = (channelData.channel.members as MesageInputChannelMember[])
          .filter((member) => member.user_id !== user?.id)
          .map((member) => ({
            id: String(member.user_id),
            value: member.User.name,
            name: member.User.name,
            email: member.User.email,
            avatar: member.User.avatar || undefined,
          }))

        return [
          {
            id: 'all',
            value: 'all',
            name: 'Notify everyone',
            special: true,
            className: 'mention-special',
          },
          ...members,
        ]
      }
      return []
    }, [selectedChat, channelData, user?.id])

    useLayoutEffect(() => {
      submitRef.current = onSubmit
      placeholderRef.current = placeholder
      defaultValueRef.current = defaultValue
    }, [onSubmit, placeholder, defaultValue])

    useEffect(() => {
      if (draftKey && enableDraft) {
        const hasSavedDraft = DraftManager.hasDraft(draftKey)
        setHasDraft(hasSavedDraft)

        const timer = setTimeout(() => {
          loadDraft()
        }, 100)

        return () => clearTimeout(timer)
      }
    }, [draftKey, enableDraft, loadDraft])

    useEffect(() => {
      if (!containerRef.current || showAudioRecorder) return

      const container = containerRef.current
      const editorContainer = document.createElement('div')
      container.appendChild(editorContainer)

      const customToolbarOptions = [['bold', 'italic', 'underline', { color: [] }, { background: [] }, 'clean']]
      const mentionUsers = getMentionUsers()

      const options: QuillOptions = {
        theme: 'snow',
        placeholder: placeholderRef.current,
        modules: {
          toolbar: customToolbarOptions,
          mention: {
            allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
            mentionDenotationChars: ['@'],
            source: function (searchTerm: string, renderList: (matches: MentionUser[], searchTerm: string) => void) {
              const quill = quillRef.current
              if (!quill) return

              const selection = quill.getSelection()
              if (!selection) return

              const index = selection.index
              const fullText = quill.getText(0, index)

              const lastAtIndex = fullText.lastIndexOf('@')

              if (lastAtIndex === -1) {
                renderList([], searchTerm)
                return
              }

              const charBefore = lastAtIndex > 0 ? fullText[lastAtIndex - 1] : null
              if (charBefore && charBefore !== ' ') {
                renderList([], searchTerm)
                return
              }

              let atCount = 0
              for (let i = lastAtIndex; i >= 0; i--) {
                if (fullText[i] === '@') {
                  atCount++
                } else {
                  break
                }
              }
              if (atCount !== 1) {
                renderList([], searchTerm)
                return
              }

              const textAfterAt = fullText.substring(lastAtIndex + 1)
              if (textAfterAt.startsWith(' ')) {
                renderList([], searchTerm)
                return
              }

              let matches = mentionUsers.filter((user) => user.value.toLowerCase().includes(searchTerm.toLowerCase()))
              if (!searchTerm) {
                matches = mentionUsers
              }
              renderList(matches, searchTerm)
            },

            renderItem: function (item: MentionUser) {
              return item.special ? item.value : item.name
            },
            onSelect: function (item: MentionUser, insertItem: (item: MentionUser) => void) {
              if (user?.id && item.id === user.id) {
                return
              }
              insertItem(item)
              if (onChange) {
                onChange()
              }
              if (enableDraft) {
                debouncedSaveDraft()
              }
            },
          },
          clipboard: true,
          keyboard: {
            bindings: {
              enter: {
                key: 'Enter',
                handler: () => {
                  if (!quillRef.current) return false

                  const deltaContent = quillRef.current.getContents()
                  const hasFiles = selectedFiles.length > 0
                  const hasLocation = selectedLocation !== null

                  const hasRealContent = deltaContent.ops?.some((op: DeltaOperation) => {
                    if (typeof op.insert === 'string') {
                      return op.insert.trim().length > 0
                    }
                    if (typeof op.insert === 'object' && op.insert !== null) {
                      return op.insert.mention || op.insert.image || op.insert.video || op.insert.embed
                    }
                    return false
                  })

                  if (hasRealContent || hasFiles || hasLocation) {
                    submitMessage()
                  }
                  return false
                },
              },
              shift_enter: {
                key: 'Enter',
                shiftKey: true,
                handler: () => {
                  if (quillRef.current) {
                    const selection = quillRef.current.getSelection()
                    const index = selection?.index || 0
                    quillRef.current.insertText(index, '\n')
                    quillRef.current.setSelection(index + 1)
                  }
                  return false
                },
              },
            },
          },
        },
        bounds: container,
        formats: ['bold', 'italic', 'underline', 'strike', 'color', 'background', 'link', 'mention'],
      }

      const quill = new Quill(editorContainer, options)
      quillRef.current = quill

      // hide the toolbar on initial load
      const toolbar = containerRef.current?.querySelector('.ql-toolbar') as HTMLElement
      if (toolbar && !editorVisible) {
        toolbar.style.display = 'none'
        toolbar.classList.add('none')
        toolbar.classList.remove('display')
      }

      // Set initial focus
      setTimeout(() => quill.focus(), 100)

      if (innerRef) {
        innerRef.current = quill
      }

      quill.setContents(defaultValueRef.current)
      setText(quill.getText())

      // Enhanced text change handler with draft saving
      quill.on(Quill.events.TEXT_CHANGE, (_delta, _oldDelta, source) => {
        const currentText = quill.getText()
        setText(currentText)

        // Check if over limit and update state
        const isCurrentlyOverLimit = maxLength ? currentText.trim().length > maxLength : false
        setIsOverLimit(isCurrentlyOverLimit)

        if (source === 'user' && onChange) {
          onChange()
        }

        if (source === 'user') {
          setTimeout(() => {
            formatUrlsInEditor(quill)
          }, 0)
        }

        // Save draft on user input (debounced)
        if (source === 'user' && enableDraft) {
          debouncedSaveDraft()
        }
      })

      // Handle paste events
      quill.on('text-change', (_delta, _oldDelta, source) => {
        if (source === 'user') {
          const currentText = quill.getText()
          const isCurrentlyOverLimit = maxLength ? currentText?.trim().length > maxLength : false
          setIsOverLimit(isCurrentlyOverLimit)
        }
      })

      return () => {
        quill.off(Quill.events.TEXT_CHANGE)
        container.innerHTML = ''
        quillRef.current = null
        if (innerRef) {
          innerRef.current = null
        }

        if (draftSaveTimeoutRef.current) {
          clearTimeout(draftSaveTimeoutRef.current)
        }
      }
    }, [maxLength, enableDraft, debouncedSaveDraft, getMentionUsers, user?.id, selectedFiles, showAudioRecorder, selectedLocation])

    const isEmpty = useMemo(() => {
      if (!quillRef.current) return !selectedLocation && selectedFiles.length === 0

      const deltaContent = quillRef.current.getContents()

      const hasContent = deltaContent.ops?.some((op: DeltaOperation) => {
        if (typeof op.insert === 'string') {
          return op.insert.trim().length > 0
        }
        if (typeof op.insert === 'object' && op.insert !== null) {
          return op.insert.mention || op.insert.image || op.insert.video || op.insert.embed
        }
        return false
      })

      return !hasContent && selectedFiles.length === 0 && !selectedLocation
    }, [text, selectedFiles, selectedLocation])

    useHotkeys(
      'ctrl+e,',
      (event) => {
        event.preventDefault()
        quillRef.current?.focus()
      },
      {
        enableOnFormTags: true,
        preventDefault: true,
      },
    )

    return (
      <div className="editor-box">
        {showAudioRecorder ? (
          <AudioRecorder onDirectSend={handleDirectAudioSend} onCancel={handleAudioCancel} disabled={disabled} />
        ) : (
          <div className="editor-toolbar">
            <FilePreview files={selectedFiles} onRemoveFile={handleRemoveFile} setFiles={setSelectedFiles} />
            <div ref={containerRef} className="editor-controls" />
            <div className="common-flex flex-between editor-toolbar-wrapper">
              <div className="editor-toolbar-box">
                {variant !== 'update' && (
                  <UploadAttachments onFilesSelected={handleFilesSelected} disabled={disabled} />
                )}
                {variant !== 'update' && (
                  <ShareLocation onLocationSelected={handleLocationSelected} disabled={disabled || isSubmitting} />
                )}
                <Hint label="Toggle Formatting">
                  <Button disabled={disabled} size="iconSm" onClick={toggleEditor}>
                    <SvgIcon className="editor-svg-hw" iconId="subsup-text" />
                  </Button>
                </Hint>
                {selectedChat.type !== ChatType.DM && (
                  <Hint label="Mention">
                    <Button disabled={disabled} size="iconSm" onClick={handleMentionClick}>
                      <SvgIcon className="editor-svg-hw" iconId="at-the-rate" />
                    </Button>
                  </Hint>
                )}
                <EmojiWrapper onEmojiSelect={onEmojiSelect} id="emoji-button">
                  <Hint label="Emoji">
                    <Button disabled={disabled} size="iconSm">
                      <SvgIcon className="editor-svg-hw" iconId="smile-page" />
                    </Button>
                  </Hint>
                </EmojiWrapper>
                {teamSetting?.audio_messages_enabled && variant !== 'update' && (
                  <Hint label="Record Audio">
                    <Button disabled={disabled} size="iconSm" color="transparent" onClick={handleRecordClick}>
                      <SvgIcon className="editor-svg-hw mic" iconId="mic" />
                    </Button>
                  </Hint>
                )}
                {maxLength && (
                  <div>
                    <span className="text-red-500">{isOverLimit && 'Message too long'}</span>
                  </div>
                )}
              </div>
              <div className="editor-toolbar-send">
                {variant === 'update' ? (
                  <div className="ml-auto flex items-center gap-x-2">
                    <Button color="light" className="me-2" onClick={onCancel} disabled={disabled}>
                      Cancel
                    </Button>
                    <Button
                      color="primary"
                      disabled={disabled || (isEmpty && selectedFiles.length === 0) || isOverLimit || isSubmitting}
                      onClick={submitMessage}
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    color="primary"
                    disabled={disabled || (isEmpty && selectedFiles.length === 0) || isOverLimit || isSubmitting}
                    onClick={submitMessage}
                    size="iconSm"
                    className="ml-auto"
                    title="Send message (Enter)"
                  >
                    send
                    {isSubmitting ? (
                      <div className="spinner" />
                    ) : null
                    }
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  },
)

Editor.displayName = 'Editor'

export default Editor
