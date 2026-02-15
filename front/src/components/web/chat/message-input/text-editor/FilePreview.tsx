import { FC, useCallback, useMemo, useState } from 'react'
import { SvgIcon } from '../../../../../shared/icons'
import { ImageGallery } from '../../../../../shared/swiper'
import { FilePreviewProps } from '../../../../../types'
import { formatFileSize, getFileIcon } from '../../../utils/custom-functions'

const isImage = (file: File): boolean => {
  return file.type.startsWith('image/')
}

const FilePreview: FC<FilePreviewProps> = ({ files, onRemoveFile, setFiles }) => {
  const [showModal, setShowModal] = useState(false)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)

  const galleryImages = useMemo(() => {
    if (!files) return []

    const images: Array<{
      src: string
      alt: string
      fileName?: string
      type: 'image' | 'video'
    }> = []

    files.forEach((file: any) => {
      images.push({
        src: URL.createObjectURL(file),
        alt: 'image',
        fileName: file.name,
        type: file.type.split('/')[0],
      })
    })

    return images.filter((file) => file.type == 'image' || file.type == 'video')
  }, [files])

  const handleImageClick = useCallback((index: number) => {
    setActiveMediaIndex(index)
    setShowModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
  }, [])

  if (files.length === 0) return null

  return (
    <div className="file-preview-container">
      <div className="file-preview-header">
        {files.length} file{files.length > 1 ? 's' : ''} selected
        <SvgIcon iconId="close" className="common-svg-hw" onClick={() => setFiles([])} />
      </div>

      <div className="file-preview-list custom-scrollbar">
        {files.map((file, index) => (
          <div key={`${file.name}-${index}`} className="file-preview-item">
            <div
              className="file-preview-container"
              onClick={() => handleImageClick(index)}>
              {isImage(file) ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className='img-fluid'
                  onLoad={(e) => {
                    setTimeout(() => {
                      URL.revokeObjectURL((e.target as HTMLImageElement).src)
                    }, 1000)
                  }}
                />
              ) : (
                <span>{getFileIcon(file.type, file.name)}</span>
              )}
            </div>

            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-details">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{file.type || 'Unknown type'}</span>
              </div>
            </div>

            <button
              onClick={() => onRemoveFile(index)}
              className="remove-file-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f2f3'
                e.currentTarget.style.color = '#d93025'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#616061'
              }}
              title="Remove file"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {showModal && (
        <ImageGallery
          images={galleryImages}
          initialIndex={activeMediaIndex}
          onClose={handleCloseModal}
          onSlideChange={(index: number) => setActiveMediaIndex(index)}
        />
      )}
    </div>
  )
}

export default FilePreview
