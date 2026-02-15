import { useCallback, useEffect, useRef, useState } from 'react'
import { URL_KEYS } from '../../../../constants/url'
import { useAppSelector } from '../../../../store/hooks'
import { SvgIcon } from '../../../../shared/icons'
import { get, del, post } from '../../../../api'
import './recordings.css'

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

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

type AITab = 'transcript' | 'summary' | 'tasks' | 'analysis'

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
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return 'Ayer'
  } else if (days < 7) {
    return d.toLocaleDateString('es', { weekday: 'long' })
  }
  return d.toLocaleDateString('es', { month: 'short', day: 'numeric', year: 'numeric' })
}

const priorityColors: Record<string, string> = {
  alta: '#e74c3c',
  media: '#f39c12',
  baja: '#27ae60',
}

const Recordings = () => {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'audio' | 'video'>('all')
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<AITab>('summary')
  const [analyzingIds, setAnalyzingIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const { team } = useAppSelector((store) => store.team)

  const storageUrl = import.meta.env.VITE_STORAGE_URL || ''

  const fetchRecordings = useCallback(
    async (page = 1) => {
      if (!team?.id) return
      setLoading(true)
      setError(null)
      try {
        const params: any = { page, limit: 20 }
        if (search) params.search = search
        if (filter !== 'all') params.call_type = filter

        const res = await get<{ recordings: Recording[]; pagination: Pagination }>(
          URL_KEYS.Recordings.List,
          params,
        )
        setRecordings(res.recordings || [])
        setPagination(res.pagination || null)
      } catch (err: any) {
        console.error('Error fetching recordings:', err)
        setError('Error al cargar grabaciones')
      } finally {
        setLoading(false)
      }
    },
    [team?.id, search, filter],
  )

  useEffect(() => {
    fetchRecordings()
  }, [fetchRecordings])

  // Poll for AI status updates when there are processing recordings
  useEffect(() => {
    const hasProcessing = recordings.some(
      (r) => r.ai_status === 'processing' || r.ai_status === 'pending',
    )
    if (hasProcessing || analyzingIds.size > 0) {
      pollRef.current = setInterval(() => {
        fetchRecordings()
      }, 8000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [recordings, analyzingIds, fetchRecordings])

  const handlePlay = (rec: Recording) => {
    if (playingId === rec.id) {
      setPlayingId(null)
      if (audioRef.current) audioRef.current.pause()
      if (videoRef.current) videoRef.current.pause()
      return
    }
    setPlayingId(rec.id)
  }

  const handleShare = (rec: Recording) => {
    const url = `${window.location.origin}/recordings/${rec.id}`
    window.open(url, `recording_${rec.id}`, 'width=1024,height=768,scrollbars=yes,resizable=yes')
  }

  const handleDownload = (rec: Recording) => {
    const url = `${storageUrl}${rec.file_url}`
    const a = document.createElement('a')
    a.href = url
    a.download = `recording_${rec.call_id}.webm`
    a.click()
  }

  const handleDelete = async (rec: Recording) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta grabación?')) return
    try {
      await del(URL_KEYS.Recordings.Delete.replace(':id', rec.id.toString()))
      setRecordings((prev) => prev.filter((r) => r.id !== rec.id))
    } catch (err) {
      console.error('Error deleting recording:', err)
    }
  }

  const handleAnalyze = async (rec: Recording) => {
    try {
      setAnalyzingIds((prev) => new Set(prev).add(rec.id))
      await post(URL_KEYS.Recordings.Analyze.replace(':id', rec.id.toString()), {})
      // Update local state
      setRecordings((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, ai_status: 'processing' as const } : r)),
      )
    } catch (err) {
      console.error('Error triggering analysis:', err)
      setAnalyzingIds((prev) => {
        const next = new Set(prev)
        next.delete(rec.id)
        return next
      })
    }
  }

  const toggleExpand = (rec: Recording) => {
    if (expandedId === rec.id) {
      setExpandedId(null)
    } else {
      setExpandedId(rec.id)
      setActiveTab('summary')
    }
  }

  const renderAIBadge = (rec: Recording) => {
    if (!rec.ai_status) return null
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendiente', className: 'ai-badge pending' },
      processing: { label: 'Analizando...', className: 'ai-badge processing' },
      completed: { label: 'AI', className: 'ai-badge completed' },
      failed: { label: 'Error AI', className: 'ai-badge failed' },
    }
    const info = statusMap[rec.ai_status] || statusMap.pending
    return <span className={info.className}>{info.label}</span>
  }

  const renderAIContent = (rec: Recording) => {
    if (!rec.ai_status || rec.ai_status === 'pending') {
      return (
        <div className="ai-empty">
          <p>El análisis AI no se ha iniciado.</p>
          <button className="ai-analyze-btn" onClick={() => handleAnalyze(rec)}>
            Analizar con AI
          </button>
        </div>
      )
    }

    if (rec.ai_status === 'processing') {
      return (
        <div className="ai-processing">
          <div className="ai-spinner" />
          <p>Analizando grabación con IA...</p>
          <span>Transcribiendo audio y generando análisis</span>
        </div>
      )
    }

    if (rec.ai_status === 'failed') {
      return (
        <div className="ai-empty">
          <p>El análisis falló. Intenta de nuevo.</p>
          <button className="ai-analyze-btn" onClick={() => handleAnalyze(rec)}>
            Reintentar
          </button>
        </div>
      )
    }

    // ai_status === 'completed'
    return (
      <div className="ai-content">
        <div className="ai-tabs">
          <button
            className={`ai-tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Resumen
          </button>
          <button
            className={`ai-tab ${activeTab === 'transcript' ? 'active' : ''}`}
            onClick={() => setActiveTab('transcript')}
          >
            Transcripción
          </button>
          <button
            className={`ai-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            Tareas
          </button>
          <button
            className={`ai-tab ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            Análisis
          </button>
        </div>

        <div className="ai-tab-content custom-scrollbar">
          {activeTab === 'summary' && (
            <div className="ai-section">
              {rec.ai_summary ? (
                <div className="ai-text">{rec.ai_summary}</div>
              ) : (
                <p className="ai-no-data">Sin resumen disponible</p>
              )}
            </div>
          )}

          {activeTab === 'transcript' && (
            <div className="ai-section">
              {rec.transcript ? (
                <pre className="ai-transcript">{rec.transcript}</pre>
              ) : (
                <p className="ai-no-data">Sin transcripción disponible</p>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="ai-section">
              {rec.ai_tasks && rec.ai_tasks.length > 0 ? (
                <div className="ai-tasks-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Tarea</th>
                        <th>Asignado</th>
                        <th>Prioridad</th>
                        <th>Fecha límite</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rec.ai_tasks.map((task, i) => (
                        <tr key={i}>
                          <td className="task-cell">{task.task}</td>
                          <td>
                            <span className="task-assignee">{task.assignee}</span>
                          </td>
                          <td>
                            <span
                              className="task-priority"
                              style={{
                                background: priorityColors[task.priority] || '#999',
                              }}
                            >
                              {task.priority}
                            </span>
                          </td>
                          <td className="task-deadline">{task.deadline}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="ai-no-data">No se identificaron tareas en la reunión</p>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="ai-section">
              {rec.ai_analysis ? (
                <div className="ai-text">{rec.ai_analysis}</div>
              ) : (
                <p className="ai-no-data">Sin análisis disponible</p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="recordings-panel">
      <div className="recordings-header">
        <h3>Grabaciones de Llamadas</h3>
        <div className="recordings-filters">
          <input
            type="text"
            placeholder="Buscar grabaciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="recordings-search"
          />
          <div className="recordings-type-filter">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todas
            </button>
            <button
              className={`filter-btn ${filter === 'audio' ? 'active' : ''}`}
              onClick={() => setFilter('audio')}
            >
              Audio
            </button>
            <button
              className={`filter-btn ${filter === 'video' ? 'active' : ''}`}
              onClick={() => setFilter('video')}
            >
              Video
            </button>
          </div>
        </div>
      </div>

      <div className="recordings-list custom-scrollbar">
        {loading && <div className="recordings-loading">Cargando grabaciones...</div>}
        {error && <div className="recordings-error">{error}</div>}
        {!loading && !error && recordings.length === 0 && (
          <div className="recordings-empty">
            <SvgIcon iconId="video" />
            <p>Sin grabaciones aún</p>
            <span>Las grabaciones de llamadas aparecerán aquí automáticamente</span>
          </div>
        )}

        {recordings.map((rec) => (
          <div
            key={rec.id}
            className={`recording-item ${playingId === rec.id ? 'playing' : ''} ${expandedId === rec.id ? 'expanded' : ''}`}
          >
            <div className="recording-item-header">
              <div className="recording-icon">
                <SvgIcon iconId={rec.call_type === 'video' ? 'video' : 'call'} />
              </div>
              <div className="recording-info">
                <div className="recording-name-row">
                  <span className="recording-name">{rec.chat_name || 'Llamada desconocida'}</span>
                  {renderAIBadge(rec)}
                </div>
                <div className="recording-meta">
                  <span className={`recording-type ${rec.call_type}`}>
                    {rec.call_type === 'video' ? 'Video' : 'Audio'}
                  </span>
                  <span className="recording-chat-type">
                    {rec.chat_type === 'channel' ? 'Grupo' : 'Directo'}
                  </span>
                  <span className="recording-duration">{formatDuration(rec.duration)}</span>
                  <span className="recording-size">{formatFileSize(rec.file_size)}</span>
                </div>
                <div className="recording-footer">
                  <span className="recording-by">por {rec.initiator?.name || 'Desconocido'}</span>
                  <span className="recording-date">{formatDate(rec.created_at)}</span>
                </div>
              </div>
            </div>

            {playingId === rec.id && (
              <div className="recording-player">
                {rec.call_type === 'video' ? (
                  <video
                    ref={videoRef}
                    src={`${storageUrl}${rec.file_url}`}
                    controls
                    autoPlay
                    className="recording-video-player"
                  />
                ) : (
                  <audio
                    ref={audioRef}
                    src={`${storageUrl}${rec.file_url}`}
                    controls
                    autoPlay
                    className="recording-audio-player"
                  />
                )}
              </div>
            )}

            <div className="recording-actions">
              <button className="rec-action-btn play" onClick={() => handlePlay(rec)} title="Reproducir">
                <SvgIcon iconId={playingId === rec.id ? 'close' : 'video'} />
              </button>
              <button
                className="rec-action-btn ai"
                onClick={() => toggleExpand(rec)}
                title="Análisis AI"
              >
                <span className="ai-icon-text">AI</span>
              </button>
              <button className="rec-action-btn share" onClick={() => handleShare(rec)} title="Compartir">
                <span style={{ fontSize: '11px', fontWeight: 600 }}>Compartir</span>
              </button>
              <button className="rec-action-btn download" onClick={() => handleDownload(rec)} title="Descargar">
                <SvgIcon iconId="folder-open" />
              </button>
              <button className="rec-action-btn delete" onClick={() => handleDelete(rec)} title="Eliminar">
                <SvgIcon iconId="delete" />
              </button>
            </div>

            {expandedId === rec.id && (
              <div className="recording-ai-panel">{renderAIContent(rec)}</div>
            )}
          </div>
        ))}

        {pagination && pagination.totalPages > 1 && (
          <div className="recordings-pagination">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`page-btn ${pagination.page === page ? 'active' : ''}`}
                onClick={() => fetchRecordings(page)}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Recordings
