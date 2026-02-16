import { FC, useState, useRef, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { closeQuickMessage, VORoomUser } from '../../../store/slices/virtualOfficeSlice'
import { useVirtualOfficeSocket } from './useVirtualOfficeSocket'
import { FiX, FiSend, FiMic, FiPaperclip, FiStopCircle } from 'react-icons/fi'

interface QuickMessagePanelProps {
  user: VORoomUser
}

const QuickMessagePanel: FC<QuickMessagePanelProps> = ({ user }) => {
  const dispatch = useAppDispatch()
  const { sendQuickMessage } = useVirtualOfficeSocket()
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const { userStatus } = useAppSelector((store) => store.userStatus)

  const status = userStatus[user.id]?.status || 'offline'
  const initials = (user.name || user.first_name || 'U').charAt(0).toUpperCase()

  const handleSendText = useCallback(() => {
    if (!message.trim()) return
    sendQuickMessage(user.id, message.trim(), 'text')
    setMessage('')
  }, [message, user.id, sendQuickMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      sendQuickMessage(user.id, file.name, 'file', file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [user.id, sendQuickMessage],
  )

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          sendQuickMessage(user.id, reader.result as string, 'audio')
        }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach((track) => track.stop())
        setRecordingTime(0)
      }

      mediaRecorder.start()
      setIsRecording(true)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1)
      }, 1000)
    } catch {
      console.error('Microphone access denied')
    }
  }, [user.id, sendQuickMessage])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="vo-quick-message-panel">
      <div className="vo-qm-header">
        <div className="vo-qm-user-info">
          <div className="vo-qm-avatar" style={{ backgroundColor: user.profile_color || '#5579F8' }}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="vo-qm-avatar-img" />
            ) : (
              <span>{initials}</span>
            )}
            <span className={`vo-qm-status-dot vo-status-${status}`} />
          </div>
          <div className="vo-qm-user-details">
            <span className="vo-qm-user-name">{user.name || user.first_name}</span>
            <span className="vo-qm-user-status">{status}</span>
          </div>
        </div>
        <button className="vo-qm-close" onClick={() => dispatch(closeQuickMessage())}>
          <FiX size={18} />
        </button>
      </div>

      <div className="vo-qm-body">
        {isRecording ? (
          <div className="vo-qm-recording">
            <span className="vo-qm-recording-dot" />
            <span className="vo-qm-recording-time">{formatTime(recordingTime)}</span>
            <span className="vo-qm-recording-label">Grabando audio...</span>
          </div>
        ) : (
          <textarea
            className="vo-qm-input"
            placeholder="Escribe un mensaje..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
        )}
      </div>

      <div className="vo-qm-actions">
        <button className="vo-qm-action-btn" onClick={() => fileInputRef.current?.click()} title="Adjuntar archivo">
          <FiPaperclip size={18} />
        </button>
        <input ref={fileInputRef} type="file" hidden onChange={handleFileSelect} />

        {isRecording ? (
          <button className="vo-qm-action-btn vo-qm-stop-btn" onClick={stopRecording} title="Detener grabación">
            <FiStopCircle size={18} />
          </button>
        ) : (
          <button className="vo-qm-action-btn" onClick={startRecording} title="Grabar audio">
            <FiMic size={18} />
          </button>
        )}

        {!isRecording && (
          <button className="vo-qm-action-btn vo-qm-send-btn" onClick={handleSendText} disabled={!message.trim()} title="Enviar mensaje">
            <FiSend size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

export default QuickMessagePanel
