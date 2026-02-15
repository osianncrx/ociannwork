import { useState } from 'react'
import { createPortal } from 'react-dom'
import '../../../../pages/recording-detail.css'

interface ShareModalProps {
  recording: {
    id: number
    chat_name: string
    call_type: string
  }
  publicUrl: string | null
  loading: boolean
  onClose: () => void
}

const ShareModal = ({ recording, publicUrl, loading, onClose }: ShareModalProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('Copia este enlace:', publicUrl)
    }
  }

  const meetingName = recording.chat_name || 'Grabación de llamada'
  const shareText = `Te comparto la grabación de la reunión "${meetingName}" en OciannWork`

  const handleWhatsApp = () => {
    if (!publicUrl) return
    const text = encodeURIComponent(`${shareText}: ${publicUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleTeams = () => {
    if (!publicUrl) return
    const text = encodeURIComponent(shareText)
    const url = encodeURIComponent(publicUrl)
    window.open(
      `https://teams.microsoft.com/share?msgText=${text}&href=${url}`,
      '_blank',
    )
  }

  const handleEmail = () => {
    if (!publicUrl) return
    const subject = encodeURIComponent(`Grabación: ${meetingName} - OciannWork`)
    const body = encodeURIComponent(
      `Hola,\n\n${shareText}.\n\nPuedes verla aquí:\n${publicUrl}\n\nSaludos,\nOciannWork`,
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  return createPortal(
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal-header">
          <h3>Compartir grabación</h3>
          <button className="share-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Warning */}
        <div className="share-modal-warning">
          <span className="share-modal-warning-icon">⚠️</span>
          <p>
            <strong>Enlace público:</strong> Cualquier persona con este enlace podrá ver y
            escuchar esta grabación <strong>sin necesidad de tener una cuenta</strong> en
            OciannWork ni estar registrado en el sistema.
          </p>
        </div>

        {/* Body */}
        <div className="share-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div
                className="ai-spinner"
                style={{ margin: '0 auto 12px' }}
              />
              <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
                Generando enlace público...
              </p>
            </div>
          ) : publicUrl ? (
            <>
              {/* URL Box */}
              <div className="share-modal-url-box">
                <input
                  className="share-modal-url-input"
                  type="text"
                  value={publicUrl}
                  readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  className={`share-modal-copy-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>

              {/* Platform buttons */}
              <div className="share-modal-platforms">
                <button className="share-platform-btn" onClick={handleWhatsApp}>
                  <div className="share-platform-icon whatsapp">💬</div>
                  <span className="share-platform-label">WhatsApp</span>
                </button>
                <button className="share-platform-btn" onClick={handleTeams}>
                  <div className="share-platform-icon teams">🟣</div>
                  <span className="share-platform-label">Teams</span>
                </button>
                <button className="share-platform-btn" onClick={handleEmail}>
                  <div className="share-platform-icon email">📧</div>
                  <span className="share-platform-label">Correo</span>
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ color: '#e74c3c', fontSize: '13px', margin: 0 }}>
                Error al generar el enlace. Intenta de nuevo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ShareModal
