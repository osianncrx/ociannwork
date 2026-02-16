import { FC } from 'react'
import { Button, Modal, ModalBody } from 'reactstrap'
import { webrtcService } from '../../../../services/webrtc.service'

interface RemoteControlRequestModalProps {
  isOpen: boolean
  requesterId: string
  requesterName: string
}

const RemoteControlRequestModal: FC<RemoteControlRequestModalProps> = ({
  isOpen,
  requesterId,
  requesterName,
}) => {
  const handleAccept = () => {
    webrtcService.acceptRemoteControl(requesterId)
  }

  const handleDeny = () => {
    webrtcService.denyRemoteControl(requesterId)
  }

  return (
    <Modal isOpen={isOpen} centered backdrop="static" keyboard={false} className="remote-control-modal" size="sm">
      <ModalBody className="p-4 text-center">
        <div className="rc-request-icon" style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: 24,
        }}>
          🖱️
        </div>
        <h5 style={{ fontWeight: 600, marginBottom: 8, color: 'var(--body-font-color, #fff)' }}>
          Remote Control Request
        </h5>
        <p style={{ color: 'var(--body-sub-title, #a0a0a0)', fontSize: 14, marginBottom: 20 }}>
          <strong>{requesterName}</strong> wants to control your screen.
          They will be able to use your mouse and keyboard.
        </p>
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 20,
          fontSize: 12,
          color: '#f59e0b',
          textAlign: 'left',
        }}>
          ⚠️ The OciannWork Remote Agent must be running on your computer.
          You can stop control at any time by pressing the Stop button or Escape key.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button
            color="danger"
            onClick={handleDeny}
            style={{ minWidth: 100, fontWeight: 600 }}
          >
            Deny
          </Button>
          <Button
            color="primary"
            onClick={handleAccept}
            style={{ minWidth: 100, fontWeight: 600 }}
          >
            Allow
          </Button>
        </div>
      </ModalBody>
    </Modal>
  )
}

export default RemoteControlRequestModal
