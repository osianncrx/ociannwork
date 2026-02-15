import { SolidButton } from '../../../shared/button'
import SvgIcon from '../../../shared/icons/SvgIcon'
import { SimpleModal } from '../../../shared/modal'
import { DeleteModalPros } from '../../../types/components'

const DeleteModal = ({ isOpen, toggle, onConfirm, isLoading = false }: DeleteModalPros) => {
  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={toggle}
      closable={!isLoading}
      closeOnBackdrop={!isLoading}
      closeOnEscape={!isLoading}
      bodyClassName="text-center custom-delete-modal"
    >
      <ul className="decoration common-flex p-0">
        <li className="loader-gif">
          <span className="loader-1">
            <SvgIcon iconId="table-delete" className="danger-fill-stroke modal-common-svg-hw delete-icon" />
          </span>
        </li>
      </ul>
      <div className="margin-b-25">
        <h4>Delete Item?</h4>
        <span className="sub-title margin-b-25">
          This item will be deleted permanently. you can't undo this action?
        </span>
      </div>
      <div className="common-flex gap-2">
        <SolidButton className="w-100 btn" color="light" onClick={toggle} title="no" />
        <SolidButton loading={isLoading} className="w-100 btn" color="danger" onClick={onConfirm} title="yes" />
      </div>
    </SimpleModal>
  )
}

export default DeleteModal
