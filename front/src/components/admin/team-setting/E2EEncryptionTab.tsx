import { Alert, Container, Label } from 'reactstrap'
import { mutations, queries } from '../../../api'
import { toaster } from '../../../utils/custom-functions'

const E2EEncryptionTab = () => {
  const { data: e2eStatus, refetch: refetchStatus } = queries.useGetE2EStatus()
  const { mutate: toggleE2E, isPending: isToggling } = mutations.useToggleE2E()

  const handleToggle = (enabled: boolean) => {
    toggleE2E(
      { enabled },
      {
        onSuccess: () => {
          toaster('success', `E2E encryption ${enabled ? 'enabled' : 'disabled'} successfully`)
          refetchStatus()
        },
        onError: () => {
          toaster('error', 'Failed to toggle E2E encryption')
        },
      },
    )
  }

  const isE2EEnabled = e2eStatus?.e2e_enabled || false

  return (
    <Container fluid>
      <div className="margin-b-20">
        <h5>End-to-End Message Encryption</h5>
        <p className="text-muted">Enable encryption for all messages in this team</p>
      </div>

      <div className="margin-b-20">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <Label className="mb-0">Enable E2E Encryption</Label>
            <p className="text-muted small mb-0">
              When enabled, all messages will be encrypted before sending and decrypted when received
            </p>
          </div>
          <div>
            <input
              type="checkbox"
              className="form-check-input"
              checked={isE2EEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
              disabled={isToggling}
            />
          </div>
        </div>
      </div>

      {isE2EEnabled && (
        <>
          <hr className="my-4" />

          <Alert color="info" className="mt-3">
            <strong>Note:</strong> When E2E encryption is enabled, all team members need to configure their public keys
            for messages to be encrypted properly.
          </Alert>
        </>
      )}
    </Container>
  )
}

export default E2EEncryptionTab

