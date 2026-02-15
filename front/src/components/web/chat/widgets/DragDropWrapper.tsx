import { FC, useCallback, useEffect, useState } from 'react'
import { useAppSelector, useAppDispatch } from '../../../../store/hooks'
import { useTeamPermissions } from '../../../../utils/hooks'
import { showPermissionModal } from '../../../../store/slices/teamSettingSlice'
import { DragDropWrapperProps } from '../../../../types'

const DragDropWrapper: FC<DragDropWrapperProps> = ({ onFilesSelected }) => {
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { user } = useAppSelector((store) => store.auth)
  const { hasPermission, checkPermission, checkFileSizeLimit, validateFileType } = useTeamPermissions()
  const dispatch = useAppDispatch()
  const [isDragOver, setIsDragOver] = useState(false)

  const canAcceptFiles = selectedChat?.id && user?.id && hasPermission('upload_file_with_limit')

  // Utility to detect only file drags
  const isFileDrag = (e: DragEvent) => {
    if (!e.dataTransfer) return false
    return Array.from(e.dataTransfer.types).includes('Files')
  }

  // Handlers updated to only react when files are being dragged
  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!e.dataTransfer) return
      if (!isFileDrag(e)) return

      if (!canAcceptFiles) {
        if (user?.id && selectedChat?.id) {
          checkPermission('upload_file_with_limit', {
            title: 'Permission Required',
            content:
              "You don't have permission to upload files or have reached your file limit. Contact your team admin for access.",
            variant: 'warning',
          })
        }
        return
      }
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragOver(true)
      }
    },
    [canAcceptFiles, checkPermission, user, selectedChat],
  )

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!e.dataTransfer) return
      if (!isFileDrag(e)) return

      if (!canAcceptFiles) return

      if (e.target === document) {
        setIsDragOver(false)
      }
    },
    [canAcceptFiles],
  )

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!e.dataTransfer) return
      if (!isFileDrag(e)) return

      if (!canAcceptFiles) return

      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy'
      }
    },
    [canAcceptFiles],
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!e.dataTransfer) return
      if (!isFileDrag(e)) return

      if (!canAcceptFiles) {
        if (user?.id && selectedChat?.id) {
          checkPermission('upload_file_with_limit', {
            title: 'Permission Required',
            content:
              "You don't have permission to upload files or have reached your file limit. Contact your team admin for access.",
            variant: 'warning',
          })
        }
        return
      }

      setIsDragOver(false)

      const files = Array.from(e.dataTransfer?.files || [])

      if (files.length > 0) {
        // Check file size limits
        const { validFiles: sizeValidFiles, invalidFiles: sizeInvalidFiles } = checkFileSizeLimit(files)

        // Check file types using the new validation function
        const validFiles: File[] = []
        const typeInvalidFiles: { file: File; reason: string }[] = []

        sizeValidFiles.forEach((file) => {
          const { isValid, reason } = validateFileType(file)
          if (!isValid && reason) {
            typeInvalidFiles.push({ file, reason })
          } else {
            validFiles.push(file)
          }
        })

        // Combine all invalid files
        const allInvalidFiles = [...sizeInvalidFiles, ...typeInvalidFiles]

        // Show modal for invalid files
        if (allInvalidFiles.length > 0) {
          const isSizeLimitError =
            allInvalidFiles.length === sizeInvalidFiles.length &&
            allInvalidFiles.every((f) => f.reason.includes('Total file size'))

          if (isSizeLimitError) {
            dispatch(
              showPermissionModal({
                title: 'File Size Limit Exceeded',
                content: `${allInvalidFiles[0].reason} Please reduce the number of files or their sizes.`,
                variant: 'warning',
              }),
            )
          } else {
            dispatch(
              showPermissionModal({
                title: 'Invalid Files',
                content: `Some files were rejected: ${allInvalidFiles.map((f) => `${f.file.name}: ${f.reason}`).join(', ')}`,
                variant: 'warning',
              }),
            )
          }
        }

        // Process valid files
        if (validFiles.length > 0) {
          onFilesSelected(validFiles)
        } else if (files.length > 0) {
          console.warn('No valid files to upload. Please check file types and sizes.')
        }
      }
    },
    [
      canAcceptFiles,
      checkPermission,
      checkFileSizeLimit,
      validateFileType,
      dispatch,
      onFilesSelected,
      user,
      selectedChat,
    ],
  )

  useEffect(() => {
    if (!selectedChat?.id || !user?.id) return

    // Add event listeners to the document
    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop, selectedChat, user])

  // Don't render anything if no chat is selected or no user
  if (!selectedChat?.id || !user?.id) {
    return null
  }

  return (
    <>
      {isDragOver && (
        <div className='file-upload-box'>
          <div className='text-center text-white'>
            <div className='file-icon'>📁</div>
            <div>
              <h3>Drop files here to upload</h3>
              <p>Files will be sent to {selectedChat?.name}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DragDropWrapper
