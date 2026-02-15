import { useEffect, useState } from 'react'
import './recording-detail.css'

interface AITask {
  task: string
  assignee: string
  priority: 'alta' | 'media' | 'baja'
  deadline: string
  status: string
}

interface Recording {
  id: number
  call_id: string
  call_type: 'audio' | 'video'
  chat_type: 'dm' | 'channel'
  chat_name: string
  duration: number
  file_url: string
  file_size: number
  participants: any[]
  status: string
  created_at: string
  transcript: string | null
  ai_summary: string | null
  ai_tasks: AITask[] | null
  ai_analysis: string | null
  ai_status: 'pending' | 'processing' | 'completed' | 'failed' | null
  initiator: {
    id: number
    name: string
    avatar: string | null
    profile_color: string
  }
}

type AITab = 'player' | 'summary' | 'transcript' | 'tasks' | 'analysis'

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const priorityColors: Record<string, string> = {
  alta: '#e74c3c',
  media: '#f39c12',
  baja: '#27ae60',
}

const RecordingPublic = () => {
  const [recording, setRecording] = useState<Recording | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AITab>('player')

  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
  const storageUrl = import.meta.env.VITE_STORAGE_URL || ''

  // Extract token from URL /r/:token
  const pathParts = window.location.pathname.split('/')
  const shareToken = pathParts[pathParts.length - 1]

  useEffect(() => {
    const fetchPublicRecording = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${apiBase}/recordings/public/${shareToken}`)
        if (!res.ok) {
          throw new Error('Not found')
        }
        const data = await res.json()
        setRecording(data.recording)
        if (data.recording.ai_status === 'completed') {
          setActiveTab('summary')
        }
      } catch (err) {
        setError('Esta grabación no existe, el enlace ha expirado o el acceso fue revocado.')
      } finally {
        setLoading(false)
      }
    }

    if (shareToken) {
      fetchPublicRecording()
    }
  }, [shareToken])

  if (loading) {
    return (
      <div className="rd-page">
        <div className="rd-loading">
          <div className="rd-spinner" />
          <p>Cargando grabación...</p>
        </div>
      </div>
    )
  }

  if (error || !recording) {
    return (
      <div className="rd-page">
        <div className="rd-error">
          <div className="rd-error-icon">🔒</div>
          <h2>Enlace no válido</h2>
          <p>{error || 'Grabación no encontrada'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rd-page">
      {/* Public banner */}
      <div className="rd-public-banner">
        🌐 Vista pública — No se requiere cuenta para ver esta grabación
      </div>

      <div className="rd-container">
        {/* Header */}
        <header className="rd-header">
          <div className="rd-header-info">
            <div className="rd-header-icon">
              {recording.call_type === 'video' ? '🎥' : '🎙️'}
            </div>
            <div>
              <h1 className="rd-title">{recording.chat_name || 'Grabación compartida'}</h1>
              <div className="rd-meta">
                <span className={`rd-badge ${recording.call_type}`}>
                  {recording.call_type === 'video' ? 'Video' : 'Audio'}
                </span>
                <span className="rd-badge type">
                  {recording.chat_type === 'channel' ? 'Grupo' : 'Directo'}
                </span>
                <span className="rd-meta-text">
                  {formatDuration(recording.duration)} · {formatFileSize(recording.file_size)}
                </span>
              </div>
              <p className="rd-date">
                {formatDate(recording.created_at)} · por {recording.initiator?.name || 'Desconocido'}
              </p>
            </div>
          </div>
          {recording.ai_status === 'completed' && (
            <span className="rd-ai-badge">✨ AI Analizado</span>
          )}
        </header>

        {/* Participants */}
        {recording.participants && recording.participants.length > 0 && (
          <div className="rd-participants">
            <span className="rd-participants-label">Participantes:</span>
            {recording.participants.map((p: any, i: number) => (
              <span key={i} className="rd-participant-chip">
                {p.name || p}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <nav className="rd-tabs">
          <button
            className={`rd-tab ${activeTab === 'player' ? 'active' : ''}`}
            onClick={() => setActiveTab('player')}
          >
            ▶ Reproducir
          </button>
          {recording.ai_status === 'completed' && (
            <>
              <button
                className={`rd-tab ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                📋 Resumen
              </button>
              <button
                className={`rd-tab ${activeTab === 'transcript' ? 'active' : ''}`}
                onClick={() => setActiveTab('transcript')}
              >
                📝 Transcripción
              </button>
              <button
                className={`rd-tab ${activeTab === 'tasks' ? 'active' : ''}`}
                onClick={() => setActiveTab('tasks')}
              >
                ✅ Tareas
              </button>
              <button
                className={`rd-tab ${activeTab === 'analysis' ? 'active' : ''}`}
                onClick={() => setActiveTab('analysis')}
              >
                📊 Análisis
              </button>
            </>
          )}
        </nav>

        {/* Content */}
        <div className="rd-content">
          {activeTab === 'player' && (
            <div className="rd-player-section">
              {recording.call_type === 'video' ? (
                <video
                  src={`${storageUrl}${recording.file_url}`}
                  controls
                  autoPlay
                  className="rd-video-player"
                />
              ) : (
                <div className="rd-audio-wrapper">
                  <div className="rd-audio-visual">🎙️</div>
                  <audio
                    src={`${storageUrl}${recording.file_url}`}
                    controls
                    autoPlay
                    className="rd-audio-player"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'summary' && recording.ai_status === 'completed' && (
            <div className="rd-section">
              <h2 className="rd-section-title">Resumen de la Reunión</h2>
              {recording.ai_summary ? (
                <div className="rd-text-block">{recording.ai_summary}</div>
              ) : (
                <p className="rd-no-data">Sin resumen disponible</p>
              )}
            </div>
          )}

          {activeTab === 'transcript' && recording.ai_status === 'completed' && (
            <div className="rd-section">
              <h2 className="rd-section-title">Transcripción</h2>
              {recording.transcript ? (
                <pre className="rd-transcript">{recording.transcript}</pre>
              ) : (
                <p className="rd-no-data">Sin transcripción disponible</p>
              )}
            </div>
          )}

          {activeTab === 'tasks' && recording.ai_status === 'completed' && (
            <div className="rd-section">
              <h2 className="rd-section-title">Tareas Identificadas</h2>
              {recording.ai_tasks && recording.ai_tasks.length > 0 ? (
                <div className="rd-tasks-table-wrap">
                  <table className="rd-tasks-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Tarea</th>
                        <th>Asignado a</th>
                        <th>Prioridad</th>
                        <th>Fecha límite</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recording.ai_tasks.map((task, i) => (
                        <tr key={i}>
                          <td className="rd-task-num">{i + 1}</td>
                          <td>{task.task}</td>
                          <td>
                            <span className="rd-assignee">{task.assignee}</span>
                          </td>
                          <td>
                            <span
                              className="rd-priority"
                              style={{ background: priorityColors[task.priority] || '#999' }}
                            >
                              {task.priority}
                            </span>
                          </td>
                          <td className="rd-deadline">{task.deadline}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rd-no-data">No se identificaron tareas</p>
              )}
            </div>
          )}

          {activeTab === 'analysis' && recording.ai_status === 'completed' && (
            <div className="rd-section">
              <h2 className="rd-section-title">Análisis Detallado</h2>
              {recording.ai_analysis ? (
                <div className="rd-text-block">{recording.ai_analysis}</div>
              ) : (
                <p className="rd-no-data">Sin análisis disponible</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="rd-public-footer">
          Compartido desde <strong>OciannWork</strong>
        </div>
      </div>
    </div>
  )
}

export default RecordingPublic
