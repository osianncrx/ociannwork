import { FC, useEffect, useRef, useState } from 'react'
import DynamicPopover from '../../../../../shared/popover'
import { EmojiMartPicker, EmojiWrapperProps } from '../../../../../types'
import { useAppSelector } from '../../../../../store/hooks'

const EmojiWrapper: FC<EmojiWrapperProps> = ({
  children,
  onEmojiSelect,
  id,
  onPickerStateChange,
  onParentHoverChange,
  position = 'top',
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [pickerReady, setPickerReady] = useState(false)
  const pickerContainerRef = useRef<HTMLDivElement>(null)
  const pickerInstanceRef = useRef<EmojiMartPicker | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const { mixBackgroundLayout } = useAppSelector((store) => store.theme)

  const togglePopover = (newState?: boolean) => {
    const nextState = newState !== undefined ? newState : !popoverOpen
    setPopoverOpen(nextState)

    // Notify parent component about picker state change
    if (onPickerStateChange) {
      onPickerStateChange(nextState)
    }

    if (!isLoaded && nextState) {
      setIsLoaded(true)
    }
  }

  const handleEmojiSelect = (emoji: any) => {
    const emojiData = {
      emoji: emoji.native,
      unified: emoji.unified,
      names: emoji.names || [emoji.name],
      originalUnified: emoji.unified,
      ...emoji,
    }

    onEmojiSelect(emojiData)
    setPopoverOpen(false)

    // Notify parent that picker is closed
    if (onPickerStateChange) {
      onPickerStateChange(false)
    }
  }

  // Initialize emoji picker when popover opens
  useEffect(() => {
    const initializePicker = async () => {
      if (popoverOpen && pickerContainerRef.current && !pickerInstanceRef.current) {
        try {
          // Dynamically import emoji-mart
          const { Picker } = await import('emoji-mart')

          // Create a wrapper div that we can safely manage
          const wrapperDiv = document.createElement('div')
          wrapperDiv.style.cssText = 'width: 100%; height: 100%;'

          // Create picker instance
          const picker = new Picker({
            data: async () => {
              const response = await fetch('https://cdn.jsdelivr.net/npm/@emoji-mart/data')
              return response.json()
            },
            onEmojiSelect: handleEmojiSelect,
            theme: mixBackgroundLayout == 'light' ? 'light' : 'dark',
            previewPosition: 'none',
            searchPosition: 'sticky',
            navPosition: 'bottom',
            perLine: 9,
            maxFrequentRows: 2,
            set: 'native',
          }) as unknown as EmojiMartPicker

          // Append picker to wrapper
          if (picker.el) {
            wrapperDiv.appendChild(picker.el)
          } else {
            // If picker is already a DOM element (fallback)
            wrapperDiv.appendChild(picker as unknown as Node)
          }

          // Mount wrapper to container
          if (pickerContainerRef.current) {
            pickerContainerRef.current.appendChild(wrapperDiv)
            pickerInstanceRef.current = picker

            // Store cleanup function
            cleanupRef.current = () => {
              try {
                if (pickerContainerRef.current && wrapperDiv.parentNode === pickerContainerRef.current) {
                  pickerContainerRef.current.removeChild(wrapperDiv)
                }
              } catch (error) {
                // Ignore cleanup errors
                console.warn('Cleanup warning:', error)
              }
            }

            setPickerReady(true)
          }
        } catch (error) {
          console.error('Failed to load emoji picker:', error)
          setPickerReady(true) // Show error state
        }
      }
    }

    if (popoverOpen && !pickerReady) {
      initializePicker()
    }
  }, [popoverOpen, pickerReady])

  // Cleanup when popover closes
  useEffect(() => {
    if (!popoverOpen && pickerInstanceRef.current) {
      // Use the stored cleanup function
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }

      pickerInstanceRef.current = null
      setPickerReady(false)
    }
  }, [popoverOpen])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!popoverOpen || !event.target) return

      const target = event.target as Node
      const buttonElement = document.getElementById(id)
      const popoverElement =
        document.querySelector(`[aria-describedby*="${id}"], [id*="popover-${id}"]`) ||
        document.querySelector('.popover') ||
        pickerContainerRef.current?.closest('.popover')

      // Don't close if clicking on the trigger button
      if (buttonElement && buttonElement.contains(target)) {
        return
      }

      // Don't close if clicking inside the popover/picker
      if (popoverElement && popoverElement.contains(target)) {
        return
      }

      // Don't close if clicking inside the picker container
      if (pickerContainerRef.current && pickerContainerRef.current.contains(target)) {
        return
      }

      // Close the popover if clicking outside
      setPopoverOpen(false)

      // Notify parent that picker is closed
      if (onPickerStateChange) {
        onPickerStateChange(false)
      }
    }

    if (popoverOpen) {
      // Use capture phase to ensure we get the event before other handlers
      document.addEventListener('mousedown', handleClickOutside, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [popoverOpen, id, onPickerStateChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }

      // Notify parent that picker is closed on unmount
      if (onPickerStateChange) {
        onPickerStateChange(false)
      }
    }
  }, [onPickerStateChange])

  useEffect(() => {
    if (onParentHoverChange) {
      // When parent hover ends, close the popover
      if (!popoverOpen) return
      onParentHoverChange((isHovered: boolean) => {
        if (!isHovered) {
          setPopoverOpen(false)
          if (onPickerStateChange) {
            onPickerStateChange(false)
          }
        }
      })
    }
  }, [popoverOpen, onParentHoverChange, onPickerStateChange])

  return (
    <DynamicPopover
      placement={position}
      trigger={<div>{children}</div>}
      isOpen={popoverOpen}
      toggle={() => togglePopover()}
    >
      <div ref={pickerContainerRef}>{popoverOpen && !pickerReady && <div>Loading emojis...</div>}</div>
    </DynamicPopover>
  )
}

export default EmojiWrapper
