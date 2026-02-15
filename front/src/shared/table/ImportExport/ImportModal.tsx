import { Modal, ModalBody, ModalHeader } from 'reactstrap'
import { ImportModalProps } from '../../../types'

const ImportModal = ({ open, onClose, title, children }: ImportModalProps) => {
  return (
    <Modal isOpen={open} toggle={onClose} centered size="md" className="import-export-modal" backdrop="static">
      <ModalHeader toggle={onClose}>{title}</ModalHeader>
      <ModalBody>{children}</ModalBody>
    </Modal>
  )
}

export default ImportModal
