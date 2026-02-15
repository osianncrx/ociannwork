import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { RiCloseLargeLine } from 'react-icons/ri'
import { Input } from 'reactstrap'
import { mutations, queries } from '../../../../../api'
import { ChannelRole, ImageBaseUrl } from '../../../../../constants'
import { SvgIcon } from '../../../../../shared/icons'
import { Image } from '../../../../../shared/image'
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks'
import { setCurrentChannel } from '../../../../../store/slices/channelSlice'
import { updateChatName } from '../../../../../store/slices/chatSlice'
import { ChannelAboutTabProps, ChannelMember, SingleTeam } from '../../../../../types'
import { useImagePreview } from '../../../../../utils/hooks'

const AboutTab = ({ detailsModal, setDetailModal, handleLeaveChannel }: ChannelAboutTabProps) => {
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { currentChannel } = useAppSelector((store) => store.channel)
  const { user: userData } = useAppSelector((store) => store.auth)
  const { allTeamMembers } = useAppSelector((store) => store.chat)
  const [isEditingChannelInfo, setIsEditingChannelInfo] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const { refetch: refetchChannel } = queries.useGetChannelById(
    { id: selectedChat?.id || '' },
    { enabled: false }
  )
  const { mutate: updateChannelMutate } = mutations.useUpdateChannel()
  const dispatch = useAppDispatch()
  const { previewUrl: avatarPreview, handleFileSelect, clearPreview, setPreviewUrl } = useImagePreview()
  const [removeAvatar, setRemoveAvatar] = useState<boolean>(false)
  const hasAvatar = Boolean(avatarPreview && !removeAvatar)
  const [avatar, setAvatar] = useState<File | null>(null)

  const handleAvatarChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setAvatar(file)
        setRemoveAvatar(false)
        handleFileSelect(file)
      }
    },
    [handleFileSelect],
  )

  const handleRemoveAvatar = useCallback(() => {
    setAvatar(null)
    clearPreview()
    setRemoveAvatar(true)
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }, [clearPreview])

  useEffect(() => {
    if (detailsModal && currentChannel) {
      setPreviewUrl(currentChannel.avatar ? ImageBaseUrl + `${currentChannel.avatar}` : null)
      setRemoveAvatar(false)
      setAvatar(null)
    }
  }, [detailsModal, currentChannel, setPreviewUrl])

  useEffect(() => {
    if (currentChannel) {
      setEditedName(currentChannel?.name || '')
      setEditedDescription(currentChannel?.description || '')
    }
  }, [currentChannel, detailsModal])

  const handleSaveChannelInfo = () => {
    if (
      selectedChat?.id &&
      currentChannel?.type &&
      (editedName.trim() !== currentChannel?.name ||
        editedDescription.trim() !== currentChannel?.description ||
        avatar ||
        removeAvatar)
    ) {
      const formData = new FormData()
      formData.append('id', selectedChat.id)
      formData.append('name', editedName.trim())
      formData.append('description', editedDescription.trim())
      formData.append('type', currentChannel.type)

      if (removeAvatar) {
        formData.append('remove_avatar', 'true')
      } else if (avatar instanceof File) {
        formData.append('avatar', avatar)
      }

      updateChannelMutate(formData, {
        onSuccess: (response) => {
          const trimmedName = editedName.trim()
          const trimmedDescription = editedDescription.trim()
          setIsEditingChannelInfo(false)
          setAvatar(null)
          setRemoveAvatar(false)
          setDetailModal(false)
          if (selectedChat?.id) {
            refetchChannel()
          }

          dispatch((dispatch) => {
            dispatch(
              setCurrentChannel({
                ...currentChannel,
                name: trimmedName,
                description: trimmedDescription,

                avatar: response?.channel?.avatar ?? undefined,
              }),
            )

            if (trimmedName !== currentChannel?.name) {
              dispatch(
                updateChatName({
                  id: selectedChat.id,
                  type: selectedChat.type,
                  name: trimmedName,
                }),
              )
            }
          })
        },
        onError: (error) => {
          console.error('Failed to update channel info:', error)
          setEditedName(currentChannel?.name || '')
          setEditedDescription(currentChannel?.description || '')
          setAvatar(null)
          setRemoveAvatar(false)
        },
      })
    } else {
      setIsEditingChannelInfo(false)
      setEditedName(currentChannel?.name || '')
      setEditedDescription(currentChannel?.description || '')
      setAvatar(null)
      setRemoveAvatar(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditingChannelInfo(false)
    setEditedName(currentChannel?.name || '')
    setEditedDescription(currentChannel?.description || '')
    setAvatar(null)
    setRemoveAvatar(false)
    setPreviewUrl(currentChannel?.avatar ? ImageBaseUrl + `${currentChannel.avatar}` : null)
  }

  const isCurrentUserAdmin = currentChannel?.members?.find(
    (member: ChannelMember) => member.user_id === userData?.id && member?.role === ChannelRole.Admin,
  )

  const getCreatorName = () => {
    const createdBy = selectedChat?.created_by || currentChannel?.created_by
    if (!createdBy) return 'Unknown'

    const creator = allTeamMembers?.members?.find((member: SingleTeam) => member?.id === createdBy)
    return creator?.name || `User ${createdBy}`
  }

  return (
    <div className="about-section profile-section">
      <div className="profile-avatar-section d-flex align-items-start">
        <div className="avatar-upload-container position-relative mb-3">
          <div className="profile-avatar">
            {hasAvatar ? (
              <Image src={avatarPreview!} alt="Profile" className="rounded-circle" />
            ) : (
              <div className="profile-placeholder rounded-circle d-flex align-items-center justify-content-center">
                <SvgIcon iconId='administration' className='common-svg-hw' />
              </div>
            )}
          </div>
          {isEditingChannelInfo && (
            <>
              <label htmlFor="avatar-upload" className="avatar-upload-btn">
                <SvgIcon iconId="camera" className="common-svg-hw" />
              </label>
              <div className='position-relative'>
                <Input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  className='d-none'
                  onChange={handleAvatarChange}
                />
                {hasAvatar && (
                  <button
                    type="button"
                    className="avatar-remove-btn position-absolute"
                    onClick={handleRemoveAvatar}
                    title="Remove image"
                  >
                    <RiCloseLargeLine />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {/* Channel Name Section */}
      <div className="section-item mb-4">
        <h6 className="section-label mb-2 text-secondary">Channel Name</h6>
        <div className="position-relative">
          <input
            type="text"
            className={`form-control ${!isEditingChannelInfo ? 'border-0' : ''}`}
            value={isEditingChannelInfo ? editedName : currentChannel?.name || editedName || ''}
            onChange={isEditingChannelInfo ? (e) => setEditedName(e.target.value) : undefined}
            readOnly={!isEditingChannelInfo}
            placeholder="Enter channel name"
            style={{
              cursor: !isEditingChannelInfo ? 'default' : 'text',
            }}
          />
        </div>
      </div>

      {/* Description Section */}
      <div className="section-item mb-4">
        <h6 className="section-label mb-2 text-secondary">Description</h6>
        <div className="position-relative">
          <textarea
            className={`form-control ${!isEditingChannelInfo ? 'border-0' : ''}`}
            value={isEditingChannelInfo ? editedDescription : currentChannel?.description || editedDescription || ''}
            onChange={isEditingChannelInfo ? (e) => setEditedDescription(e.target.value) : undefined}
            readOnly={!isEditingChannelInfo}
            placeholder="Add channel description"
            rows={3}
            style={{
              cursor: !isEditingChannelInfo ? 'default' : 'text',
            }}
          />
        </div>
      </div>

      {/* Edit/Save Button */}
      {isCurrentUserAdmin && (
        <div className="d-flex gap-2 mb-4">
          {isEditingChannelInfo ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={handleSaveChannelInfo} disabled={!editedName.trim()}>
                Save
              </button>
              <button className="btn btn-outline-primary btn-sm" onClick={handleCancelEdit}>
                Cancel
              </button>
            </>
          ) : (
            <button className="btn btn-outline-primary btn-sm" onClick={() => setIsEditingChannelInfo(true)}>
              Edit
            </button>
          )}
        </div>
      )}

      {/* Created by Section */}
      <div className="section-item-created-by">
        <h6 className="section-label mb-2">Created by</h6>
        <p className="mb-0 text-muted">
          {getCreatorName()} on{' '}
          {new Date(currentChannel?.created_at || Date.now()).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <div className="pt-2">
          <div className="danger-zone d-flex align-items-center justify-content-between p-3">
            <div>
              <div className="text-danger fw-medium">Leave channel</div>
              <small className="text-muted">You will no longer have access to this channel</small>
            </div>
            <button className="btn btn-outline-danger btn-sm" onClick={handleLeaveChannel}>
              Leave channel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutTab
