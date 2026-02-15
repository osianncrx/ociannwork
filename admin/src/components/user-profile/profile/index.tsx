import React, { useState } from 'react'
import { Col, Container, Row } from 'reactstrap'
import { queries } from '../../../api'
import { ImageBaseUrl } from '../../../constants'
import CardWrapper from '../../../shared/card/CardWrapper'
import SvgIcon from '../../../shared/icons/SvgIcon'
import { Image } from '../../../shared/image'
import { getInitials } from '../../../utils'
import EditProfileForm from './EditProfile'

const Profile = () => {
  const { data: userData } = queries.useGetUserDetails()
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProfileImageFile(file)

    const reader = new FileReader()
    reader.onload = () => {
      if (reader.readyState === 2) {
        setPreviewImage(reader.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <Col xl="12">
      <CardWrapper
        heading={{
          title: 'profile',
          subtitle: 'view_and_control_user_access_and_permissions',
        }}
      >
        <Row>
          <Col md="4">
            <div className="profile-bg">
              <div className="user-image">
                <div className="avatar position-relative mb-4">
                  <Image
                    src={previewImage || ImageBaseUrl + userData?.user?.avatar}
                    alt="user-avatar"
                    className="img-fluid"
                    onError={() => setImageError(true)}
                    onLoad={() => setImageError(false)}
                  />
                  {imageError && (
                    <div className="profile-placeholder">
                      <span className="profile-placeholder-text">{getInitials(userData?.user?.name)}</span>
                    </div>
                  )}
                  <input id="avatar-upload" type="file" accept="image/*" hidden onChange={handleImageChange} />
                  <label htmlFor="avatar-upload" className="icon-wrapper cursor-pointer">
                    <SvgIcon iconId={!userData?.user?.avatar ? 'table-edit' : 'camera'} />
                  </label>
                </div>
              </div>
              <div className="profile-data">
                <Container >
                  <h5 className="profile-title">{userData?.user?.name}</h5>
                  <p className="contact-details mb-0">
                    {userData?.user?.email && (
                      <>
                        <SvgIcon iconId="sms" /> <span>{userData?.user?.email}</span>
                      </>
                    )}
                  </p>
                  {(userData?.user?.country_code || userData?.user?.phone) && (
                    <p className="contact-details">
                      <SvgIcon iconId="call" />
                      <span>
                        +{userData?.user?.country_code} {userData?.user?.phone}
                      </span>
                    </p>
                  )}
                </Container>
              </div>
            </div>
          </Col>

          <Col md="8">
            <EditProfileForm profileImageFile={profileImageFile} />
          </Col>
        </Row>
      </CardWrapper>
    </Col>
  )
}

export default Profile
