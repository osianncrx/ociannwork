import { useState } from 'react'
import { SvgIcon } from '../../../../shared/icons'
import EditProfileModal from '../../chat/modals/edit-profile'

const EditProfile = () => {
  const [editProfileModal, setEditProfileModal] = useState(false)
  const [, setDropdownOpen] = useState(false)

  const handleEditProfileClick = () => {
    setEditProfileModal(true)
    setDropdownOpen(false)
  }

  return (
    <>
      <li className="chat-item" onClick={handleEditProfileClick}>
        <SvgIcon className="common-svg-hw" iconId="edit-profile" />
        Edit Profile
      </li>
      <EditProfileModal isOpen={editProfileModal} toggle={() => setEditProfileModal(false)} />
    </>
  )
}

export default EditProfile
