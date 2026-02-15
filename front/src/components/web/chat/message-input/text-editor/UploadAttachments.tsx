import { ChangeEvent, FC, MouseEvent, useRef } from 'react'
import { SvgIcon } from '../../../../../shared/icons'
import { useAppDispatch } from '../../../../../store/hooks'
import { showPermissionModal } from '../../../../../store/slices/teamSettingSlice'
import { UploadAttachmentsProps } from '../../../../../types'
import { useTeamPermissions, usePlanFeatures } from '../../../../../utils/hooks'

const UploadAttachments: FC<UploadAttachmentsProps> = ({ onFilesSelected, disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { hasPermission, checkPermission, checkFileSizeLimit, getAcceptAttribute, validateFileType } =
    useTeamPermissions()
  const { allowsFileSharing } = usePlanFeatures()
  const dispatch = useAppDispatch()

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    // Check if file sharing is enabled in plan
    if (!allowsFileSharing()) {
      dispatch(
        showPermissionModal({
          title: 'Feature Not Available',
          content: 'File sharing is not available in your current plan. Please upgrade to enable this feature.',
          variant: 'warning',
        }),
      )
      return
    }

    if (!hasPermission('upload_file_with_limit')) return

    const files = Array.from(event.target.files || [])

    if (files.length > 0) {
      const { validFiles: sizeValidFiles, invalidFiles: sizeInvalidFiles } = checkFileSizeLimit(files)

      // Check file types
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
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePlusIconClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()

    // Check if file sharing is enabled in plan
    if (!allowsFileSharing()) {
      dispatch(
        showPermissionModal({
          title: 'Feature Not Available',
          content: 'File sharing is not available in your current plan. Please upgrade to enable this feature.',
          variant: 'warning',
        }),
      )
      return
    }

    const canUpload = checkPermission('upload_file_with_limit', {
      title: 'Permission Required',
      content:
        "You don't have permission to upload files or have reached your file limit. Contact your team admin for access.",
      variant: 'warning',
    })

    if (!canUpload) {
      return
    }

    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="file-upload-dropdown-container position-relative">
      <button
        type="button"
        disabled={disabled}
        onClick={handlePlusIconClick}
        className={`file-upload-button ${disabled ? 'not-allowed' : 'pointer'}`}
      >
        <SvgIcon className="editor-svg-hw" iconId="plus-icon" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className='d-none'
        onChange={handleFileSelect}
        accept={getAcceptAttribute()}
      />
    </div>
  )
}

export default UploadAttachments
