import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { RiCloseLargeLine } from 'react-icons/ri'
import { useLocation } from 'react-router-dom'
import { Container, Input } from 'reactstrap'
import { ImageBaseUrl } from '../../constants'
import SvgIcon from '../../shared/icons/SvgIcon'
import { Image } from '../../shared/image'
import { ConfirmModal } from '../../shared/modal'
import { EditChannelProfileProps, LocationStateChannel } from '../../types'
import { getInitials } from '../../utils'
import useImagePreview from '../../utils/hooks/useImagePreview'

const EditProfile: React.FC<EditChannelProfileProps> = ({ setAvatar, removeAvatar, setRemoveAvatar }) => {
  const location = useLocation()
  const channelData = (location.state as LocationStateChannel)?.channelData
  const { previewUrl: avatarPreview, handleFileSelect, clearPreview, setPreviewUrl } = useImagePreview()
  const hasAvatar = Boolean(avatarPreview && !removeAvatar)
  const [confirmRemoveMemberOpen, setConfirmRemoveMemberOpen] = useState<boolean>(false)

  useEffect(() => {
    if (channelData) {
      setPreviewUrl(channelData.avatar ? `${ImageBaseUrl}${channelData.avatar}` : null)
      setRemoveAvatar(false)
      setAvatar(null)
    }
  }, [channelData, setAvatar, setPreviewUrl, setRemoveAvatar])

  const confirmRemoveAvatar = useCallback(() => {
    setAvatar(null)
    clearPreview()
    setRemoveAvatar(true)
    // Reset the file input
    const fileInput = document.getElementById('user-avatar-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
    setConfirmRemoveMemberOpen(false)
  }, [clearPreview, setAvatar, setRemoveAvatar])

  const onAvatarChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setAvatar(file)
        setRemoveAvatar(false)
        handleFileSelect(file)
      }
    },
    [handleFileSelect, setAvatar, setRemoveAvatar],
  )

  const onRemoveAvatar = () => {
    if (channelData?.avatar) {
      setConfirmRemoveMemberOpen(true)
    } else {
      confirmRemoveAvatar()
    }
  }

  return (
    <>
      <div className="profile-bg">
        <div className="user-image">
          <div className="avatar position-relative mb-4">
            {avatarPreview && !removeAvatar ? (
              <Image src={avatarPreview} alt="Profile" className="img-fluid" />
            ) : (
              <div className="profile-placeholder">
                <span className="profile-placeholder-text">{getInitials(channelData?.name || '')}</span>
              </div>
            )}
            <div className="user-img-upload position-relative">
              <Input type="file" id="user-avatar-upload" accept="image/*" onChange={onAvatarChange} hidden />
              {hasAvatar && (
                <button type="button" className="avatar-remove-btn" onClick={onRemoveAvatar} title="Remove image">
                  <RiCloseLargeLine />
                </button>
              )}
            </div>
            <label htmlFor="user-avatar-upload" className="icon-wrapper cursor-pointer">
              <SvgIcon iconId={!channelData?.avatar ? 'table-edit' : 'camera'} />
            </label>
          </div>
        </div>
        <div className="profile-data">
          <Container>
            <h5 className="profile-title">{channelData?.name}</h5>
          </Container>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmRemoveMemberOpen}
        onClose={() => setConfirmRemoveMemberOpen(false)}
        onConfirm={confirmRemoveAvatar}
        title="Remove Profile Picture"
        subtitle="Are you sure you want to remove profile picture?"
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        showIcon={true}
        iconId="table-delete"
      />
    </>
  )
}

export default EditProfile
