import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { get } from '../../../../api'
import { ImageBaseUrl, URL_KEYS } from '../../../../constants'
import { MediaGallery } from '../../../../shared/swiper'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setFileModalOpen } from '../../../../store/slices/admin/layoutSlice'
import { FilesProps, GalleryMedia } from '../../../../types'
import { downloadFile } from '../../utils/custom-functions'
import './drive.css'

interface DriveFolder {
  id: string
  name: string
  type: 'channel' | 'dm'
  folder_id: string
  icon: string
  avatar: string | null
  profile_color?: string
  file_count: number
  total_size: number
  last_modified: string
}

interface DriveFile {
  id: number
  name: string
  type: 'image' | 'video' | 'file'
  mime_type: string
  file_url: string
  size: number
  created_at: string
  sender: {
    id: number
    name: string
    avatar: string | null
    profile_color: string
  } | null
}

type ViewMode = 'grid' | 'list'
type FileFilter = 'all' | 'image' | 'video' | 'file'

const formatSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '—'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'Ayer'
  if (days < 7) return d.toLocaleDateString('es', { weekday: 'short' })
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' })
}

const getFileTypeIcon = (type: string, mimeType: string): string => {
  if (type === 'image') return '🖼️'
  if (type === 'video') return '🎬'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📘'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📗'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📙'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦'
  if (mimeType.includes('text') || mimeType.includes('csv') || mimeType.includes('json')) return '📄'
  return '📎'
}

const Files: FC<FilesProps> = () => {
  const dispatch = useAppDispatch()
  const { team } = useAppSelector((store) => store.team)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [loading, setLoading] = useState(false)
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [files, setFiles] = useState<DriveFile[]>([])
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string; type: string } | null>(null)
  const [search, setSearch] = useState('')
  const [fileFilter, setFileFilter] = useState<FileFilter>('all')
  const [stats, setStats] = useState({ total_files: 0, total_folders: 0 })
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Media gallery
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)

  const galleryMedia: GalleryMedia[] = files
    .filter((f) => f.type === 'image' || f.type === 'video')
    .map((f) => ({
      src: `${ImageBaseUrl || ''}${f.file_url}`,
      alt: f.name,
      messageId: f.id,
      fileName: f.name,
      type: f.type as 'image' | 'video',
      fileType: f.mime_type,
      originalFile: f,
    }))

  const fetchDrive = useCallback(async () => {
    if (!team?.id) return
    setLoading(true)
    try {
      const params: any = {}
      if (currentFolder) {
        params.folder = currentFolder.id
        params.folder_type = currentFolder.type
      }
      if (search) params.search = search
      if (fileFilter !== 'all' && currentFolder) params.file_type = fileFilter

      const res = await get<any>(URL_KEYS.Drive.List, params)

      if (res.view === 'folders') {
        setFolders(res.folders || [])
        setFiles([])
        setStats(res.stats || { total_files: 0, total_folders: 0 })
      } else {
        setFolders([])
        setFiles(res.files || [])
        if (!currentFolder && res.folder_name) {
          setCurrentFolder({ id: res.folder_id, name: res.folder_name, type: res.folder_type })
        }
      }
    } catch (err) {
      console.error('Error fetching drive:', err)
    } finally {
      setLoading(false)
    }
  }, [team?.id, currentFolder, search, fileFilter])

  useEffect(() => {
    fetchDrive()
  }, [fetchDrive])

  const openFolder = (folder: DriveFolder) => {
    setCurrentFolder({ id: folder.folder_id, name: folder.name, type: folder.type })
    setFileFilter('all')
    setSearch('')
  }

  const goBack = () => {
    setCurrentFolder(null)
    setFileFilter('all')
    setSearch('')
  }

  const handleDownload = async (file: DriveFile) => {
    await downloadFile(file.file_url, file.name, file.mime_type)
  }

  const handleFileClick = (file: DriveFile) => {
    if (file.type === 'image' || file.type === 'video') {
      const idx = galleryMedia.findIndex((m) => m.messageId === file.id)
      if (idx !== -1) {
        setActiveMediaIndex(idx)
        setShowMediaModal(true)
        dispatch(setFileModalOpen(true))
      }
    } else {
      handleDownload(file)
    }
  }

  const handleUploadClick = () => {
    if (currentFolder) {
      fileInputRef.current?.click()
    } else {
      setShowUpload(true)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0 || !currentFolder) return

    setUploading(true)
    try {
      for (let i = 0; i < fileList.length; i++) {
        const formData = new FormData()
        formData.append('files', fileList[i])
        if (currentFolder.type === 'channel') {
          formData.append('channel_id', currentFolder.id)
        } else {
          formData.append('recipient_id', currentFolder.id)
        }

        const { apiClient } = await import('../../../../api')
        await apiClient.post(URL_KEYS.Drive.Upload, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        })
      }
      fetchDrive()
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ========== RENDER ==========

  const renderFolders = () => {
    if (folders.length === 0) {
      return (
        <div className="drive-empty">
          <div className="drive-empty-icon">📂</div>
          <h4>Sin archivos</h4>
          <p>Los archivos compartidos en canales y mensajes directos aparecerán aquí</p>
        </div>
      )
    }

    if (viewMode === 'grid') {
      return (
        <div className="drive-grid">
          {folders.map((folder) => (
            <div key={folder.id} className="drive-folder-card" onClick={() => openFolder(folder)}>
              <div className={`drive-folder-icon ${folder.type}`}>
                {folder.type === 'channel' ? '📁' : '👤'}
              </div>
              <div className="drive-folder-info">
                <div className="drive-folder-name" title={folder.name}>
                  {folder.name}
                </div>
                <div className="drive-folder-meta">
                  {folder.file_count} archivo{folder.file_count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="drive-list">
        <div className="drive-list-header">
          <span>Nombre</span>
          <span>Archivos</span>
          <span>Modificado</span>
          <span></span>
        </div>
        {folders.map((folder) => (
          <div key={folder.id} className="drive-list-row" onClick={() => openFolder(folder)}>
            <div className="drive-list-name">
              <div className={`drive-list-icon ${folder.type === 'channel' ? 'folder-icon' : 'dm-icon'}`}>
                {folder.type === 'channel' ? '📁' : '👤'}
              </div>
              <div className="drive-list-text">
                <div className="drive-list-filename">{folder.name}</div>
                <div className="drive-list-sender">
                  {folder.type === 'channel' ? 'Canal' : 'Mensaje directo'}
                </div>
              </div>
            </div>
            <div className="drive-list-size">{folder.file_count} archivos</div>
            <div className="drive-list-date">{formatDate(folder.last_modified)}</div>
            <div></div>
          </div>
        ))}
      </div>
    )
  }

  const renderFiles = () => {
    const filtered = fileFilter === 'all' ? files : files.filter((f) => f.type === fileFilter)

    if (filtered.length === 0) {
      return (
        <div className="drive-empty">
          <div className="drive-empty-icon">📄</div>
          <h4>Sin archivos{fileFilter !== 'all' ? ` de tipo ${fileFilter}` : ''}</h4>
          <p>Sube archivos o comparte en el chat</p>
        </div>
      )
    }

    if (viewMode === 'grid') {
      return (
        <div className="drive-grid">
          {filtered.map((file) => (
            <div key={file.id} className="drive-file-card" onClick={() => handleFileClick(file)}>
              <div className="drive-file-preview">
                {file.type === 'image' ? (
                  <img
                    src={`${ImageBaseUrl || ''}${file.file_url}`}
                    alt={file.name}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <span className="drive-file-preview-icon">
                    {getFileTypeIcon(file.type, file.mime_type)}
                  </span>
                )}
              </div>
              <div className="drive-file-details">
                <div className="drive-file-name" title={file.name}>
                  {file.name}
                </div>
                <div className="drive-file-meta">
                  <span>{formatSize(file.size)}</span>
                  <span>{formatDate(file.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="drive-list">
        <div className="drive-list-header">
          <span>Nombre</span>
          <span>Tamaño</span>
          <span>Fecha</span>
          <span></span>
        </div>
        {filtered.map((file) => (
          <div key={file.id} className="drive-list-row" onClick={() => handleFileClick(file)}>
            <div className="drive-list-name">
              <div className="drive-list-icon">
                {file.type === 'image' ? (
                  <img
                    src={`${ImageBaseUrl || ''}${file.file_url}`}
                    alt={file.name}
                    onError={(e) => {
                      const el = e.target as HTMLImageElement
                      el.style.display = 'none'
                      el.parentElement!.textContent = '🖼️'
                    }}
                  />
                ) : (
                  <span>{getFileTypeIcon(file.type, file.mime_type)}</span>
                )}
              </div>
              <div className="drive-list-text">
                <div className="drive-list-filename" title={file.name}>
                  {file.name}
                </div>
                <div className="drive-list-sender">{file.sender?.name || '—'}</div>
              </div>
            </div>
            <div className="drive-list-size">{formatSize(file.size)}</div>
            <div className="drive-list-date">{formatDate(file.created_at)}</div>
            <div className="drive-list-actions">
              <button
                className="drive-dl-btn"
                title="Descargar"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(file)
                }}
              >
                ⬇
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="drive-panel">
      {/* Toolbar */}
      <div className="drive-toolbar">
        <div className="drive-toolbar-top">
          <h3>📁 Archivos</h3>
          <div className="drive-toolbar-actions">
            <button
              className={`drive-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista cuadrícula"
            >
              ▦
            </button>
            <button
              className={`drive-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vista lista"
            >
              ☰
            </button>
            {currentFolder && (
              <button className="drive-upload-btn" onClick={handleUploadClick} disabled={uploading}>
                {uploading ? '...' : '+ Subir'}
              </button>
            )}
          </div>
        </div>
        <div className="drive-search-wrap">
          <span className="drive-search-icon">🔍</span>
          <input
            type="text"
            className="drive-search"
            placeholder="Buscar archivos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="drive-breadcrumb">
        <span className="drive-breadcrumb-item" onClick={goBack}>
          Mi Drive
        </span>
        {currentFolder && (
          <>
            <span className="drive-breadcrumb-sep">›</span>
            <span className="drive-breadcrumb-current">{currentFolder.name}</span>
          </>
        )}
      </div>

      {/* File type filter (only inside a folder) */}
      {currentFolder && (
        <div className="drive-filters">
          {(['all', 'image', 'video', 'file'] as FileFilter[]).map((f) => (
            <button
              key={f}
              className={`drive-filter-pill ${fileFilter === f ? 'active' : ''}`}
              onClick={() => setFileFilter(f)}
            >
              {f === 'all' ? 'Todos' : f === 'image' ? 'Imágenes' : f === 'video' ? 'Videos' : 'Documentos'}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="drive-content custom-scrollbar">
        {loading ? (
          <div className="drive-loading">
            <div className="drive-spinner" />
            <p style={{ fontSize: '12px' }}>Cargando...</p>
          </div>
        ) : currentFolder ? (
          renderFiles()
        ) : (
          renderFolders()
        )}
      </div>

      {/* Stats */}
      {!currentFolder && !loading && folders.length > 0 && (
        <div className="drive-stats">
          <span>{stats.total_folders} carpetas</span>
          <span>{stats.total_files} archivos</span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Upload modal when not in a folder */}
      {showUpload &&
        createPortal(
          <div className="drive-upload-overlay" onClick={() => setShowUpload(false)}>
            <div className="drive-upload-modal" onClick={(e) => e.stopPropagation()}>
              <h4>Subir archivos</h4>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px' }}>
                Para subir archivos, primero entra a una carpeta (canal o mensaje directo).
              </p>
              <div className="drive-upload-actions">
                <button className="drive-upload-cancel" onClick={() => setShowUpload(false)}>
                  Entendido
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Media Gallery */}
      {showMediaModal && (
        <MediaGallery
          media={galleryMedia}
          initialIndex={activeMediaIndex}
          onClose={() => {
            setShowMediaModal(false)
            dispatch(setFileModalOpen(false))
          }}
          onSlideChange={(index: number) => setActiveMediaIndex(index)}
        />
      )}
    </div>
  )
}

export default Files
