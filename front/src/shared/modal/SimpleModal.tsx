import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, Spinner } from 'reactstrap'
import { ModalAction, SimpleModalProps } from '../../types'
import { SolidButton } from '../button'
import { RiCloseLine } from 'react-icons/ri'

const SimpleModal: FC<SimpleModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  actions = [],
  size = 'md',
  centered = true,
  scrollable = false,
  fullscreen = false,
  closable = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  autoFocus = true,
  returnFocusAfterClose = true,
  loading = false,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  onOpened,
  onClosed,
  ariaLabel,
  ariaDescribedBy,
  footerJustify = 'end',
  fade = true,
  backdropTransition,
  modalTransition,
  modalClassName = '',
}) => {
  const [actionLoadingStates, setActionLoadingStates] = useState<Record<number, boolean>>({})
  const modalRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const maxLength = 150
  const isStringSubtitle = typeof subtitle === 'string'
  const shouldTruncate = isStringSubtitle && subtitle.length > maxLength
  const displayedText = shouldTruncate && !isExpanded ? (subtitle as string).slice(0, maxLength) + '...' : subtitle

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape && closable && isOpen) {
        onClose()
      }
    },
    [closeOnEscape, closable, isOpen, onClose],
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      onOpened?.()
    } else {
      onClosed?.()
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown, onOpened, onClosed])

  const handleActionClick = async (action: ModalAction, index: number) => {
    if (action.confirmRequired) {
      const confirmText = action.confirmText || `Are you sure you want to continue ?`
      if (!window.confirm(confirmText)) {
        return
      }
    }

    try {
      setActionLoadingStates((prev) => ({ ...prev, [index]: true }))

      // Execute action (might be async)
      await action.onClick()

      // Auto close if specified
      if (action.autoClose !== false) {
        // Default to true
        onClose()
      }
    } catch (error) {
      console.error('Modal action error:', error)
    } finally {
      setActionLoadingStates((prev) => ({ ...prev, [index]: false }))
    }
  }

  const justifyClassMap = {
    start: 'justify-content-start',
    center: 'justify-content-center',
    end: 'justify-content-end',
    between: 'justify-content-between',
    around: 'justify-content-around',
  }

  return (
    <Modal
      isOpen={isOpen}
      toggle={closable ? onClose : undefined}
      centered={centered}
      size={size}
      className={className}
      scrollable={scrollable}
      fullscreen={fullscreen}
      fade={fade}
      autoFocus={autoFocus}
      returnFocusAfterClose={returnFocusAfterClose}
      backdropTransition={backdropTransition}
      modalTransition={modalTransition}
      onOpened={onOpened}
      onClosed={onClosed}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      backdrop={closeOnBackdrop ? true : 'static'}
      keyboard={closeOnEscape}
      innerRef={modalRef}
      modalClassName={modalClassName}
    >
      {(title || subtitle) && (
        <ModalHeader
          className={headerClassName}
          tag="div"
          close={
            <Button color="transparent" className="btn btn-close" onClick={closable ? onClose : undefined}>
              <RiCloseLine />
            </Button>
          }
        >
          <div className="modal-title-container">
            {title && <h4>{title}</h4>}

            {subtitle && (
              <p className="modal-subtitle">
                {displayedText}
                {shouldTruncate && (
                  <button onClick={() => setIsExpanded((prev) => !prev)}>
                    {isExpanded ? 'View less' : 'View more'}
                  </button>
                )}
              </p>
            )}
          </div>
        </ModalHeader>
      )}
      <ModalBody className={bodyClassName}>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center p-5">
            <Spinner color="primary" className="me-2" />
          </div>
        ) : (
          children
        )}
      </ModalBody>

      {actions.length > 0 && !loading && (
        <ModalFooter className={`${footerClassName} ${justifyClassMap[footerJustify]}`}>
          <div className={`${footerJustify === 'end' ? 'flex-end' : 'common-flex'} w-100 gap-2`}>
            {actions.map((action, index) => {
              const isActionLoading = actionLoadingStates[index] || action.loading

              return (
                <SolidButton
                  key={index}
                  color={action.color || 'primary'}
                  type={action.type}
                  onClick={() => handleActionClick(action, index)}
                  disabled={action.disabled || isActionLoading}
                  loading={isActionLoading}
                  className={action.className}
                  title={action.title}
                  icon={action.icon}
                  iconClass={action.iconClass}
                >
                  {action.text}
                </SolidButton>
              )
            })}
          </div>
        </ModalFooter>
      )}
    </Modal>
  )
}

export default SimpleModal
