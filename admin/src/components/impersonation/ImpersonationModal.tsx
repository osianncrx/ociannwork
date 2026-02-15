import { useState } from 'react'
import { useAppDispatch } from '../../store/hooks'
import { startImpersonation as startImpersonationAction } from '../../store/slices/authSlice'
import queries from '../../api/queries'
import mutations from '../../api/mutations'
import { SolidButton } from '../../shared/button/SolidButton'
import { SimpleModal } from '../../shared/modal'

interface ImpersonationModalProps {
  isOpen: boolean
  onClose: () => void
}

const ImpersonationModal = ({ isOpen, onClose }: ImpersonationModalProps) => {
  const dispatch = useAppDispatch()
  const { data: availableUsers, isLoading } = queries.useGetAvailableUsersToImpersonate({ enabled: isOpen })
  const { mutate: startImpersonation, isPending } = mutations.useStartImpersonation()
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null)

  const handleStartImpersonation = () => {
    if (!selectedUserId) return

    startImpersonation(
      { targetUserId: selectedUserId },
      {
        onSuccess: (data) => {
          if (data.success) {
            dispatch(
              startImpersonationAction ({
                token: data.token,
                targetUser: data.targetUser,
                impersonator: data.impersonator,
              }),
            )
            // Redirect to the frontend app with impersonated token
            const frontendUrl = import.meta.env.VITE_FRONTEND_URL
            window.location.href = `${frontendUrl}?token=${encodeURIComponent(data.token)}`
          }
        },
        onError: (error: any) => {
          console.error('Failed to start impersonation:', error)
          alert(error?.message || 'Failed to start impersonation')
        },
      },
    )
  }

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Impersonate User">
      <div style={{ padding: '20px' }}>
        <p style={{ marginBottom: '20px', color: '#666' }}>
          Select a user to impersonate. You will be logged in as that user.
        </p>

        {isLoading ? (
          <div>Loading available users...</div>
        ) : (
          <div>
            {availableUsers?.availableUsers && availableUsers.availableUsers.length > 0 ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Role</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Team Role</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableUsers.availableUsers.map((user) => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{user.name}</td>
                        <td style={{ padding: '10px' }}>{user.email}</td>
                        <td style={{ padding: '10px' }}>{user.role}</td>
                        <td style={{ padding: '10px' }}>{user.teamRole || 'N/A'}</td>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="radio"
                            name="selectedUser"
                            checked={selectedUserId === user.id}
                            onChange={() => setSelectedUserId(user.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#999', marginBottom: '20px' }}>No users available to impersonate.</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <SolidButton onClick={onClose} color="outline">
                Cancel
              </SolidButton>
              <SolidButton
                onClick={handleStartImpersonation}
                disabled={!selectedUserId || isPending}
                color="primary"
              >
                {isPending ? 'Starting...' : 'Start Impersonation'}
              </SolidButton>
            </div>
          </div>
        )}
      </div>
    </SimpleModal>
  )
}

export default ImpersonationModal

