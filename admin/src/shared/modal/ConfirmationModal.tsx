import { ConfirmModalProps } from '../../types'
import { SolidButton } from '../button/SolidButton'
import SvgIcon from '../icons/SvgIcon'
import SimpleModal from './SimpleModal'

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title = 'Are you sure?',
  subtitle = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  iconId,
  showIcon = true,
  showCancelButton = true,
  loadingText,
}: ConfirmModalProps) => {
  const getVariantConfig = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: iconId || 'trash-icon',
          iconClass: 'danger-fill-stroke',
          confirmColor: 'danger' as const,
          loaderVariant: 'danger',
        }
      case 'warning':
        return {
          icon: iconId || 'alert-triangle',
          iconClass: 'warning-fill-stroke',
          confirmColor: 'warning' as const,
          loaderVariant: 'warning',
        }
      case 'success':
        return {
          icon: iconId || 'check-circle',
          iconClass: 'success-fill-stroke',
          confirmColor: 'success' as const,
          loaderVariant: 'success',
        }
      case 'info':
        return {
          icon: iconId || 'confirmation',
          iconClass: 'info-fill-stroke',
          confirmColor: 'primary' as const,
          loaderVariant: 'info',
        }
      default:
        return {
          icon: iconId || 'table-delete',
          iconClass: 'danger-fill-stroke',
          confirmColor: 'danger' as const,
          loaderVariant: 'danger',
        }
    }
  }

  const config = getVariantConfig()

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      closable={!isLoading}
      closeOnBackdrop={!isLoading}
      closeOnEscape={!isLoading}
      bodyClassName="text-center custom-delete-modal"
    >
      {showIcon && (
        <ul className="decoration common-flex p-0">
          <li className="loader-gif">
            <span className={`${config.loaderVariant} loader-1`}>
              <SvgIcon iconId={config.icon} className={`${config.iconClass} modal-common-svg-hw delete-icon`} />
            </span>
          </li>
        </ul>
      )}

      <div className="margin-b-25">
        <h4>{title}</h4>
        <span className="sub-title margin-b-25">{subtitle}</span>

        {isLoading && loadingText && (
          <div className="loading-text margin-t-15">
            <span className="text-muted">{loadingText}</span>
          </div>
        )}
      </div>

      <div className="common-flex gap-2">
        {showCancelButton && (
          <SolidButton className="w-100 btn" color="light" onClick={onClose} disabled={isLoading} title={cancelText} />
        )}

        <SolidButton
          loading={isLoading}
          className="w-100 btn"
          color={config.confirmColor}
          onClick={onConfirm}
          disabled={isLoading}
          title={confirmText}
        />
      </div>
    </SimpleModal>
  )
}

export default ConfirmModal
