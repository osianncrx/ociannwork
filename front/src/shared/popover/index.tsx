import { arrow, autoUpdate, computePosition, flip, hide, offset, shift } from '@floating-ui/dom'
import { cloneElement, FC, ReactElement, useEffect, useRef, useState } from 'react'
import { DynamicPopoverProps, TriggerElementProps } from '../../types'

const DynamicPopover: FC<DynamicPopoverProps> = ({
  trigger,
  children,
  title,
  placement = 'bottom',
  className = '',
  popoverClassName = '',
  hideArrow = false,
  delay = { show: 0, hide: 0 },
  triggerType = 'click',
  isOpen: controlledOpen,
  toggle: controlledToggle,
  onToggle,
  closeOnScroll = true,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const arrowRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cleanupRef = useRef<(() => void) | undefined>(undefined)
  const popoverOpen = controlledOpen !== undefined ? controlledOpen : isOpen

  const togglePopover = (open?: boolean): void => {
    const newState = open !== undefined ? open : !popoverOpen
    if (controlledToggle) {
      controlledToggle()
    } else {
      setIsOpen(newState)
    }
    onToggle && onToggle(newState)
  }

  const getMiddleware = () => {
    const middleware = [offset(8), shift({ padding: 8 }), hide({ strategy: 'referenceHidden' })]

    if (!hideArrow) {
      middleware.push(arrow({ element: arrowRef.current!, padding: 5 }))
    }

    // Only add flip if we want auto-positioning
    middleware.push(
      flip({
        fallbackPlacements: ['bottom', 'top', 'right', 'left'],
        padding: 8,
      }),
    )

    return middleware
  }

  const positionPopover = () => {
    if (!triggerRef.current || !popoverRef.current) return

    computePosition(triggerRef.current, popoverRef.current, {
      placement,
      middleware: getMiddleware(),
      strategy: 'fixed',
    }).then(({ x, y, middlewareData, placement: computedPlacement }) => {
      if (!popoverRef.current) return

      Object.assign(popoverRef.current.style, {
        left: `${x}px`,
        top: `${y}px`,
        visibility: middlewareData.hide?.referenceHidden ? 'hidden' : 'visible',
      })

      // Arrow positioning
      if (!hideArrow && arrowRef.current && middlewareData.arrow) {
        const staticSide = {
          top: 'bottom',
          right: 'left',
          bottom: 'top',
          left: 'right',
        }[computedPlacement.split('-')[0]] as string

        Object.assign(arrowRef.current.style, {
          left: middlewareData.arrow.x != null ? `${middlewareData.arrow.x}px` : '',
          top: middlewareData.arrow.y != null ? `${middlewareData.arrow.y}px` : '',
          [staticSide]: '-4px',
          transform: 'rotate(45deg)',
        })
      }
    })
  }

  // Auto-update position when open
  useEffect(() => {
    if (popoverOpen && triggerRef.current && popoverRef.current) {
      cleanupRef.current = autoUpdate(triggerRef.current, popoverRef.current, positionPopover)
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [popoverOpen, placement])

  // Close on scroll behavior
  useEffect(() => {
    if (!closeOnScroll || !popoverOpen) return

    const handleScroll = () => {
      togglePopover(false)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [closeOnScroll, popoverOpen])

  // Close popover when clicking outside (for click trigger)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        triggerRef.current &&
        popoverRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !popoverRef.current.contains(event.target as Node) &&
        popoverOpen
      ) {
        togglePopover(false)
      }
    }

    if (triggerType === 'click' && popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [popoverOpen, triggerType])

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleTriggerClick = (): void => {
    if (triggerType === 'click') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      if (delay.show > 0 && !popoverOpen) {
        timeoutRef.current = setTimeout(() => togglePopover(true), delay.show)
      } else {
        togglePopover()
      }
    }
  }

  const handleTriggerMouseEnter = (): void => {
    if (triggerType === 'hover') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      if (delay.show > 0) {
        timeoutRef.current = setTimeout(() => togglePopover(true), delay.show)
      } else {
        togglePopover(true)
      }
    }
  }

  const handleTriggerMouseLeave = (): void => {
    if (triggerType === 'hover') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      if (delay.hide > 0) {
        timeoutRef.current = setTimeout(() => togglePopover(false), delay.hide)
      } else {
        togglePopover(false)
      }
    }
  }

  // Prevent popover from closing when hovering over it (for hover trigger)
  const handlePopoverMouseEnter = (): void => {
    if (triggerType === 'hover' && timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  const handlePopoverMouseLeave = (): void => {
    if (triggerType === 'hover') {
      if (delay.hide > 0) {
        timeoutRef.current = setTimeout(() => togglePopover(false), delay.hide)
      } else {
        togglePopover(false)
      }
    }
  }

  if (!trigger) {
    console.warn('DynamicPopover: No trigger provided. Popover will not be rendered.')
    return null
  }

  // Type guard to ensure trigger is a ReactElement
  const triggerElement = trigger as ReactElement<TriggerElementProps>

  // Clone the trigger element and add our event handlers
  const clonedTrigger = cloneElement(triggerElement, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node
      const originalRef = triggerElement.props.ref
      if (typeof originalRef === 'function') {
        originalRef(node)
      } else if (originalRef && typeof originalRef === 'object' && 'current' in originalRef) {
        originalRef.current = node
      }
    },
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      const originalOnClick = triggerElement.props.onClick
      if (originalOnClick) {
        originalOnClick(e)
      }
      handleTriggerClick()
    },
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      const originalOnMouseEnter = triggerElement.props.onMouseEnter
      if (originalOnMouseEnter) {
        originalOnMouseEnter(e)
      }
      handleTriggerMouseEnter()
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      const originalOnMouseLeave = triggerElement.props.onMouseLeave
      if (originalOnMouseLeave) {
        originalOnMouseLeave(e)
      }
      handleTriggerMouseLeave()
    },
    className: `${triggerElement.props.className || ''} ${className} ${triggerType === 'click' ? 'popover-trigger-clickable' : 'popover-trigger-hoverable'
      }`.trim(),
  })

  return (
    <>
      {clonedTrigger}

      {/* Floating Popover */}
      {popoverOpen && (
        <div
          ref={(node) => {
            popoverRef.current = node
          }}
          className={`popover-container ${popoverClassName}`}
          style={{
            ...props.style,
          }}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          {...props}
        >
          {!hideArrow && <div ref={arrowRef} className="popover-arrow" />}
          {title && <div className="popover-title">{title}</div>}
          {typeof children === 'function' ? children({ closePopover: () => togglePopover(false) }) : children}
        </div>
      )}
    </>
  )
}

export default DynamicPopover
