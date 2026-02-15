import { Modal, ModalBody, ModalHeader, ModalFooter } from 'reactstrap'
import { SolidButton } from '../../../shared/button/SolidButton'
import { ModalFormWrapperProps } from '../../../types'
import { useTranslation } from 'react-i18next'

const ModalFormWrapper = ({
  isOpen,
  toggle,
  title = 'form_modal_title',
  isLoading = false,
  submitLabel = 'submit',
  cancelLabel = 'cancel',
  children,
  disableFooter = false,
  onSubmit,
}: ModalFormWrapperProps) => {
  const { t } = useTranslation()

  return (
    <Modal centered isOpen={isOpen} toggle={toggle}>
      <form onSubmit={onSubmit}>
        <ModalHeader toggle={toggle}>
          <h4>{t(title)}</h4>
        </ModalHeader>
        <ModalBody>{children}</ModalBody>
        {!disableFooter && (
          <ModalFooter className="gap-1 common-flex flex-nowrap flex-between mt-4">
            <SolidButton
              className="btn w-50"
              color="light"
              onClick={toggle}
              disabled={isLoading}
              title={t(cancelLabel)}
            />
            <SolidButton
              color="secondary"
              className="btn btn-secondary w-50"
              type="submit"
              loading={isLoading}
              disabled={isLoading}
              title={t(submitLabel)}
            />
          </ModalFooter>
        )}
      </form>
    </Modal>
  )
}

export default ModalFormWrapper
