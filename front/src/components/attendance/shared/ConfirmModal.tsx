import { FiX } from 'react-icons/fi'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger' | 'success'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) => {
  if (!isOpen) return null

  return (
    <div className="att-modal-overlay" onClick={onCancel}>
      <div className="att-modal" onClick={(e) => e.stopPropagation()}>
        <div className="att-modal__header">
          <h3 className="att-modal__title">{title}</h3>
          <button className="att-modal__close" onClick={onCancel}><FiX /></button>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>{message}</p>
        <div className="att-modal__footer">
          <button className="att-btn att-btn--outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button className={`att-btn att-btn--${variant}`} onClick={onConfirm} disabled={loading}>
            {loading && <span className="att-spinner" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
