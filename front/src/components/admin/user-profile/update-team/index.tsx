import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RiCloseLargeLine } from 'react-icons/ri'
import { Col, Container, Row } from 'reactstrap'
import { ImageBaseUrl } from '../../../../constants'
import CardWrapper from '../../../../shared/card/CardWrapper'
import SvgIcon from '../../../../shared/icons/SvgIcon'
import { Image } from '../../../../shared/image'
import { useAppSelector } from '../../../../store/hooks'
import { getInitials } from '../../../../utils'
import UpdateTeamForm from './UpdateTeam'

const UpdateTeam = () => {
  const { t } = useTranslation()
  const { team } = useAppSelector((store) => store.team)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [removeAvatar, setRemoveAvatar] = useState<boolean>(false)
  const hasAvatar = Boolean((previewImage || team?.avatar) && !removeAvatar)

  useEffect(() => {
    setPreviewImage(null)
    setRemoveAvatar(false)
    setProfileImageFile(null)
    setImageError(false)
  }, [team?.id])

  const handleImageChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProfileImageFile(file)
    setRemoveAvatar(false)
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewImage(reader.result as string)
      setImageError(false)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleRemoveAvatar = useCallback(() => {
    setProfileImageFile(null)
    setPreviewImage(null)
    setRemoveAvatar(true)
    setImageError(false)

    const fileInput = document.getElementById('team-avatar-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }, [])

  return (
    <Col xl="12">
      <CardWrapper
        heading={{
          title: t('team_profile'),
          subtitle: t('view_and_control_user_access_and_permissions'),
        }}
      >
        <Row>
          <Col lg="4">
            <div className="profile-bg">
              <div className="user-image">
                <div className="avatar position-relative mb-4">
                  {hasAvatar ? (
                    <Image
                      src={previewImage || ImageBaseUrl + team?.avatar}
                      alt={t('team_avatar')}
                      className="img-fluid"
                      onError={() => setImageError(true)}
                      onLoad={() => setImageError(false)}
                    />
                  ) : (
                    <div className="profile-placeholder">
                      <span className="profile-placeholder-text">{getInitials(team?.name)}</span>
                    </div>
                  )}

                  {imageError && hasAvatar && (
                    <div className="profile-placeholder">
                      <span className="profile-placeholder-text">{getInitials(team?.name)}</span>
                    </div>
                  )}

                  <label htmlFor="team-avatar-upload" className="icon-wrapper cursor-pointer">
                    <SvgIcon iconId="camera" />
                  </label>
                  <div className="position-relative">

                    <input id="team-avatar-upload" type="file" accept="image/*" hidden onChange={handleImageChange} />
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
                </div>
              </div>
              <div className="profile-data">
                <Container>
                  <h5 className="profile-title">{team?.name}</h5>
                </Container>
              </div>
            </div>
          </Col>
          <Col lg="8">
            <UpdateTeamForm
              profileImageFile={profileImageFile}
              removeAvatar={removeAvatar}
              setProfileImageFile={setProfileImageFile}
              setRemoveAvatar={setRemoveAvatar}
              setPreviewImage={setPreviewImage}
            />
          </Col>
        </Row>
      </CardWrapper>
    </Col>
  )
}

export default UpdateTeam
