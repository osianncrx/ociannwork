import { FC } from 'react'
import { SimpleModal } from '../../../../shared/modal'
import { StorageLimitModalProps } from '../../../../types'

const StorageLimitModal: FC<StorageLimitModalProps> = ({
  isOpen,
  onClose,
  currentUsageMB,
  maxStorageMB,
  message,
}) => {
  // Format MB to GB for display
  const formatStorage = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`
    }
    return `${mb.toFixed(2)} MB`
  }

  const availableMB = maxStorageMB && currentUsageMB ? Math.max(0, maxStorageMB - currentUsageMB) : 0
  const usagePercentage = maxStorageMB && currentUsageMB ? (currentUsageMB / maxStorageMB) * 100 : 0

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Límite de Almacenamiento Alcanzado"
      size="md"
      actions={[
        {
          text: 'Entendido',
          onClick: onClose,
          color: 'primary',
          autoClose: true,
        },
      ]}
    >
      <div className="storage-limit-modal">
        <div className="alert alert-warning mb-3">
          <i className="fa fa-exclamation-triangle me-2" />
          <strong>¡Límite de almacenamiento excedido!</strong>
        </div>

        {message && (
          <p className="mb-3">{message}</p>
        )}

        {currentUsageMB !== undefined && maxStorageMB !== undefined && (
          <div className="storage-details">
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted">Uso Actual:</span>
                <span className="fw-bold">{formatStorage(currentUsageMB)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted">Límite de Almacenamiento:</span>
                <span className="fw-bold">{formatStorage(maxStorageMB)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted">Disponible:</span>
                <span className="fw-bold text-danger">{formatStorage(availableMB)}</span>
              </div>
              <div className="progress mt-3" style={{ height: '12px' }}>
                <div
                  className="progress-bar bg-danger"
                  role="progressbar"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  aria-valuenow={usagePercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className="text-center mt-2">
                <small className="text-muted">
                  {usagePercentage.toFixed(1)}% de almacenamiento usado
                </small>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="text-muted small mb-0">
            <i className="fa fa-info-circle me-1" />
            Contacta al admin de tu equipo para actualizar el plan y obtener más almacenamiento.
          </p>
        </div>
      </div>
    </SimpleModal>
  )
}

export default StorageLimitModal

