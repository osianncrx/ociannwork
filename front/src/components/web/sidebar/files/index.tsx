import { FC, MouseEvent, useMemo, useState } from 'react'
import { queries } from '../../../../api'
import { ImageBaseUrl } from '../../../../constants'
import { SvgIcon } from '../../../../shared/icons'
import { MediaGallery } from '../../../../shared/swiper'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setFileModalOpen } from '../../../../store/slices/admin/layoutSlice'
import { FilesProps, GalleryMedia } from '../../../../types'
import { ChatParams, FileItem } from '../../../../types/common'
import Renderer from '../../chat/widgets/Renderer'
import { downloadFile, getFileIcon } from '../../utils/custom-functions'

const Files: FC<FilesProps> = () => {
  const { selectedChat } = useAppSelector((store) => store.chat)
  const dispatch = useAppDispatch()
  const [expandedSection, setExpandedSection] = useState<string | null>()
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const chatParams: ChatParams = selectedChat ? { id: selectedChat.id, type: selectedChat.type } : { id: '', type: '' }

  const { data: filesData, isLoading: filesLoading, error: filesError } = queries.useGetAllFiles(chatParams)

  const allFiles = useMemo((): FileItem[] => {
    if (!filesData?.files) return []
    return filesData.files as FileItem[]
  }, [filesData])

  const filesByType = useMemo(() => {
    return {
      images: allFiles.filter((file: FileItem) => file.type === 'image'),
      links: allFiles.filter((file: FileItem) => file.type === 'link'),
      videos: allFiles.filter((file: FileItem) => file.type === 'video'),
      files: allFiles.filter((file: FileItem) => file?.type === 'file'),
    }
  }, [allFiles])

  const galleryMedia = useMemo((): GalleryMedia[] => {
    const images = filesByType.images.map((file: FileItem) => ({
      src: `${ImageBaseUrl || ''}${file.fileUrl}`,
      alt: file.fileName,
      messageId: file.messageId,
      fileName: file.fileName,
      type: 'image' as const,
      fileType: file.fileType,
      originalFile: file,
    }))

    const videos = filesByType.videos.map((file: FileItem) => ({
      src: `${ImageBaseUrl || ''}${file.fileUrl}`,
      alt: file.fileName,
      messageId: file.messageId,
      fileName: file.fileName,
      type: 'video' as const,
      fileType: file.fileType,
      originalFile: file,
    }))

    return [...images, ...videos]
  }, [filesByType.images, filesByType.videos])

  const handleDownload = async (file: FileItem, e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await downloadFile(file.fileUrl, file.fileName, file.fileType)
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const handleMediaClick = (file: FileItem) => {
    const galleryIndex = galleryMedia.findIndex(
      (media) => media.messageId === file.messageId && media.fileName === file.fileName && media.type === file.type,
    )

    if (galleryIndex !== -1) {
      setActiveMediaIndex(galleryIndex)
      setShowMediaModal(true)
      dispatch(setFileModalOpen(true))
    }
  }

  const handleCloseMediaModal = () => {
    setShowMediaModal(false)
    dispatch(setFileModalOpen(false))
  }

  const renderFileGrid = (files: FileItem[], sectionKey: string) => {
    if (filesLoading) {
      return (
        <div className="files-loading-state">
          <p>Loading files...</p>
        </div>
      )
    }

    if (filesError) {
      return (
        <div className="files-error-state">
          <p>Error loading files</p>
        </div>
      )
    }

    if (files.length === 0) {
      return (
        <div className="files-empty-state">
          <p>No {sectionKey} found</p>
        </div>
      )
    }

    return (
      <div className="files-grid custom-scrollbar">
        {files.map((file: FileItem) => (
          <div
            key={file.id}
            className="file-grid-item"
            onClick={() => {
              if (file.type === 'image' || file.type === 'video') {
                handleMediaClick(file)
              }
            }}
          >
            <div className="file-preview">
              {file.type === 'image' ? (
                <img
                  src={`${ImageBaseUrl || ''}${file.fileUrl}`}
                  alt={file.fileName}
                  className="file-thumbnail image-thumbnail"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/images/user/placeholder.png'
                  }}
                />
              ) : file.type === 'video' ? (
                <div className="file-thumbnail video-thumbnail">
                  <SvgIcon iconId="video" className="video-icon" />
                </div>
              ) : file?.type === 'link' ? (
                <div
                  className="link-preview-wrapper"
                  onClick={(e: MouseEvent) => {
                    // Fallback: Open fileUrl if no <a> is clicked
                    if (!(e.target as HTMLElement).closest('a')) {
                      window.open(file.fileUrl || '#', '_blank', 'noopener,noreferrer')
                    }
                  }}
                >
                  <Renderer value={file.content || ''} />
                </div>
              ) : (
                <div className="file-thumbnail file-thumbnail-generic">
                  <span className="file-icon">{getFileIcon(file.fileType, file.fileName)}</span>
                </div>
              )}
            </div>
            <div className="files-details">
              <div className="file-info">
                {file.type !== 'link' && (
                  <h4 className="file-name" title={file.fileName}>
                    {file.fileName.length > 15 ? `${file.fileName.substring(0, 12)}...` : file.fileName}
                  </h4>
                )}
                <p className="file-date">{formatDate(file.createdAt)}</p>
              </div>
              {file.type !== 'link' && (
                <div className="download-icon-svg">
                  <SvgIcon iconId="download-icon" onClick={(e) => handleDownload(file, e)} className="download-icon" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!selectedChat) {
    return (
      <div className="files-empty-state">
        <div className="empty-state-content">
          <SvgIcon iconId="folder-open" className="empty-state-icon" />
          <p>Select a chat to view files</p>
        </div>
      </div>
    )
  }

  const accordionSections = [
    {
      key: 'images',
      label: 'Images',
      icon: 'image',
      count: filesByType.images.length,
      files: filesByType.images,
    },
    {
      key: 'links',
      label: 'Links',
      icon: 'link',
      count: filesByType.links.length,
      files: filesByType.links,
    },
    {
      key: 'videos',
      label: 'Videos',
      icon: 'video-img',
      count: filesByType.videos.length,
      files: filesByType.videos,
    },
    {
      key: 'files',
      label: 'Files',
      icon: 'files',
      count: filesByType.files.length,
      files: filesByType.files,
    },
  ]

  return (
    <div className="files-accordion-container cusotm-scrollbar">
      {accordionSections.map((section) => (
        <div key={section.key} className="files-accordion-section">
          <div
            className={`files-accordion-header ${expandedSection === section.key ? 'expanded' : ''}`}
            onClick={() => toggleSection(section.key)}
          >
            <div className="accordion-header-left">
              <SvgIcon iconId={section.icon} className="section-icon" />
              <span className="section-label">{section.label}</span>
            </div>
            <div className="accordion-header-right">
              {section.count > 0 && <span className="section-count">{section.count}</span>}
              <SvgIcon
                iconId="chevron-down"
                className={`chevron-icon ${expandedSection === section.key ? 'rotated' : ''}`}
              />
            </div>
          </div>

          {expandedSection === section.key && (
            <div
              className={`files-accordion-content ${section.files.length === 0 ? 'no-data-found' : ''} custom-scrollbar`}
            >
              {renderFileGrid(section.files, section.key)}
            </div>
          )}
        </div>
      ))}

      {showMediaModal && (
        <MediaGallery
          media={galleryMedia}
          initialIndex={activeMediaIndex}
          onClose={handleCloseMediaModal}
          onSlideChange={(index: number) => setActiveMediaIndex(index)}
        />
      )}
    </div>
  )
}

export default Files
