import { useEffect, useState } from 'react'
import { get, post } from '../api'
import { URL_KEYS } from '../constants/url'
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
  ai_processed_at: string | null
  initiator: {
    id: number
    name: string
    avatar: string | null
    profile_color: string
    email: string
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

const RecordingDetail = () => {
  const [recording, setRecording] = useState<Recording | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AITab>('player')
  const [analyzing, setAnalyzing] = useState(false)

  const storageUrl = import.meta.env.VITE_STORAGE_URL || ''

  // Extract ID from URL
  const pathParts = window.location.pathname.split('/')
  const recordingId = pathParts[pathParts.length - 1]

  const fetchRecording = async () => {
    try {
      setLoading(true)
      const res = await get<{ recording: Recording }>(
        URL_KEYS.Recordings.Get.replace(':id', recordingId),
      )
      setRecording(res.recording)
      // If AI is completed, default to summary tab
      if (res.recording.ai_status === 'completed') {
        setActiveTab('summary')
      }
    } catch (err: any) {
      console.error('Error fetching recording:', err)
      setError('No se pudo cargar la grabación. Verifica que tienes acceso.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (recordingId) {
      fetchRecording()
    }
  }, [recordingId])

  // Poll while processing
  useEffect(() => {
    if (!recording) return
    if (recording.ai_status === 'processing' || recording.ai_status === 'pending') {
      const interval = setInterval(() => {
        fetchRecording()
      }, 6000)
      return () => clearInterval(interval)
    }
  }, [recording?.ai_status])

  const handleAnalyze = async () => {
    if (!recording) return
    try {
      setAnalyzing(true)
      await post(URL_KEYS.Recordings.Analyze.replace(':id', recording.id.toString()), {})
      setRecording({ ...recording, ai_status: 'processing' })
    } catch (err) {
      console.error('Error triggering analysis:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      alert('Enlace copiado al portapapeles!')
    } catch {
      prompt('Copia este enlace:', window.location.href)
    }
  }

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
          <div className="rd-error-icon">⚠️</div>
          <h2>Error</h2>
          <p>{error || 'Grabación no encontrada'}</p>
          <button className="rd-btn-primary" onClick={() => window.close()}>
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rd-page">
      <div className="rd-container">
        {/* Header */}
        <header className="rd-header">
          <div className="rd-header-info">
            <div className="rd-header-icon">
              {recording.call_type === 'video' ? '🎥' : '🎙️'}
            </div>
            <div>
              <h1 className="rd-title">{recording.chat_name || 'Llamada sin nombre'}</h1>
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
          <div className="rd-header-actions">
            {recording.ai_status === 'completed' && (
              <span className="rd-ai-badge">✨ AI Analizado</span>
            )}
            <button className="rd-btn-secondary" onClick={handleCopyLink}>
              🔗 Copiar enlace
            </button>
            <a
              className="rd-btn-secondary"
              href={`${storageUrl}${recording.file_url}`}
              download={`recording_${recording.call_id}.webm`}
            >
              ⬇️ Descargar
            </a>
          </div>
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
        </nav>

        {/* Tab Content */}
        <div className="rd-content">
          {/* Player Tab */}
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

          {/* AI Status Gate */}
          {activeTab !== 'player' && !recording.ai_status && (
            <div className="rd-ai-empty">
              <div className="rd-ai-empty-icon">🤖</div>
              <h3>Análisis con Inteligencia Artificial</h3>
              <p>
                Genera transcripción, resumen ejecutivo, tareas y un análisis detallado de esta reunión.
              </p>
              <button
                className="rd-btn-ai"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? 'Iniciando...' : '✨ Analizar con AI'}
              </button>
            </div>
          )}

          {activeTab !== 'player' && recording.ai_status === 'pending' && (
            <div className="rd-ai-empty">
              <div className="rd-ai-empty-icon">⏳</div>
              <h3>Análisis pendiente</h3>
              <p>El análisis está en cola. Comenzará en breve.</p>
            </div>
          )}

          {activeTab !== 'player' && recording.ai_status === 'processing' && (
            <div className="rd-ai-processing">
              <div className="rd-spinner-lg" />
              <h3>Analizando grabación...</h3>
              <p>Transcribiendo audio y generando análisis con IA. Esto puede tomar unos minutos.</p>
              <div className="rd-progress-steps">
                <div className="rd-step active">1. Transcripción de audio</div>
                <div className="rd-step">2. Resumen y puntos clave</div>
                <div className="rd-step">3. Extracción de tareas</div>
                <div className="rd-step">4. Análisis detallado</div>
              </div>
            </div>
          )}

          {activeTab !== 'player' && recording.ai_status === 'failed' && (
            <div className="rd-ai-empty">
              <div className="rd-ai-empty-icon">❌</div>
              <h3>Error en el análisis</h3>
              <p>No se pudo completar el análisis. Intenta de nuevo.</p>
              <button
                className="rd-btn-ai"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? 'Iniciando...' : '🔄 Reintentar'}
              </button>
            </div>
          )}

          {/* Summary */}
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

          {/* Transcript */}
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

          {/* Tasks */}
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
                <p className="rd-no-data">No se identificaron tareas en esta reunión</p>
              )}
            </div>
          )}

          {/* Analysis */}
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
      </div>
    </div>
  )
}

export default RecordingDetail
