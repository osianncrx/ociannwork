import { AcknowledgementModalProps } from '../../types'
import { SolidButton } from '../button'
import { SvgIcon } from '../icons'
import SimpleModal from './SimpleModal'

const AcknowledgementModal = ({
  isOpen,
  onClose,
  title = 'Information',
  content,
  okText = 'OK',
  variant = 'info',
  iconId,
  showIcon = true,
  isLoading = false,
  loadingText,
}: AcknowledgementModalProps) => {
  const getVariantConfig = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: iconId || 'warning-circle',
          iconClass: 'danger-fill-stroke',
          okColor: 'danger' as const,
          loaderVariant: 'danger',
        }
      case 'warning':
        return {
          icon: iconId || 'alert-triangle',
          iconClass: 'warning-fill-stroke',
          okColor: 'warning' as const,
          loaderVariant: 'warning',
        }
      case 'success':
        return {
          icon: iconId || 'check-circle',
          iconClass: 'success-fill-stroke',
          okColor: 'success' as const,
          loaderVariant: 'success',
        }
      case 'info':
        return {
          icon: iconId || 'confirmation',
          iconClass: 'info-fill-stroke',
          okColor: 'primary' as const,
          loaderVariant: 'info',
        }
      default:
        return {
          icon: iconId || 'confirmation',
          iconClass: 'info-fill-stroke',
          okColor: 'primary' as const,
          loaderVariant: 'info',
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
      bodyClassName="text-center custom-acknowledgement-modal"
    >
      {showIcon && (
        <ul className="decoration common-flex p-0">
          <li className="loader-gif">
            <span className={`${config.loaderVariant} loader-1`}>
              <SvgIcon iconId={config.icon} className={`${config.iconClass} modal-common-svg-hw acknowledgement-icon`} />
            </span>
          </li>
        </ul>
      )}

      <div className="margin-b-25">
        <h4>{title}</h4>
        <div className="sub-title margin-b-25">{content}</div>

        {isLoading && loadingText && (
          <div className="loading-text margin-t-15">
            <span className="text-muted">{loadingText}</span>
          </div>
        )}
      </div>

      <div className="common-flex justify-content-center">
        <SolidButton
          loading={isLoading}
          className="btn"
          color={config.okColor}
          onClick={onClose}
          disabled={isLoading}
          title={okText}
        />
      </div>
    </SimpleModal>
  )
}

export default AcknowledgementModal
