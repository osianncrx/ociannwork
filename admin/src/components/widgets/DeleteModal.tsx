import { Modal, ModalBody } from 'reactstrap'
import { SolidButton } from '../../shared/button/SolidButton'
import SvgIcon from '../../shared/icons/SvgIcon'
import { DeleteModalPros } from '../../types/components'
import { useTranslation } from 'react-i18next'

export const DeleteModal = ({
  isOpen,
  toggle,
  onConfirm,
  heading = 'this item?',
  subHeading = '',
  isLoading = false,
}: DeleteModalPros) => {
  const { t } = useTranslation()
  return (
    <Modal centered isOpen={isOpen} toggle={toggle}>
      <ModalBody className="text-center custom-delete-modal">
        <ul className="decoration common-flex p-0">
          <li className="loader-gif">
            <span className="loader-1">
              <SvgIcon iconId="table-delete" className="modal-common-svg-hw delete-icon" />
            </span>
          </li>
        </ul>
        <div className="margin-b-25">
          <h4>
            {t('delete')} {heading}
          </h4>
          <span className="sub-title margin-b-25">{subHeading ? t(subHeading) : t('delete_modal_default_text')}</span>
        </div>
        <div className="common-flex gap-2">
          <SolidButton className="w-100 btn" color="light" onClick={toggle} disabled={isLoading} title="no" />
          <SolidButton
            loading={isLoading}
            className="w-100 btn"
            color="danger"
            onClick={onConfirm}
            disabled={isLoading}
            title="yes"
          />
        </div>
      </ModalBody>
    </Modal>
  )
}
