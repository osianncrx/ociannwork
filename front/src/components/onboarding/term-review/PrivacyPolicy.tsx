import { RiCloseLine } from 'react-icons/ri'
import { Button, Modal, ModalBody, ModalHeader } from 'reactstrap'
import { useAppSelector } from '../../../store/hooks'
import { TermsProps } from '../../../types'
import Renderer from '../../web/chat/widgets/Renderer'

const PrivacyPolicy = ({ isOpen, toggle }: TermsProps) => {
  const { pages } = useAppSelector((state) => state.publicSetting)
  const termsData = pages?.find((item) => item.slug === 'privacy-policy')
  return (
    <Modal isOpen={isOpen} toggle={toggle} centered size="lg" scrollable>
      <ModalHeader
        tag="div"
        close={
          <Button color="transparent" className="btn btn-close" onClick={toggle}>
            <RiCloseLine />
          </Button>
        }
        className="fs-5 fw-bold"
      >
        {termsData?.title ?? ''}
      </ModalHeader>
      <ModalBody className="custom-scrollbar">
        <Renderer value={termsData?.content ?? ''} />
      </ModalBody>
    </Modal>
  )
}

export default PrivacyPolicy
