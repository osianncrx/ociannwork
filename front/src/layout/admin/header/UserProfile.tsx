import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../constants'
import { SvgIcon } from '../../../shared/icons'
import { Avatar } from '../../../shared/image'
import { ConfirmModal } from '../../../shared/modal'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { logout } from '../../../store/slices/authSlice'
import { setScreen } from '../../../store/slices/screenSlice'

const UserProfile = () => {
  const { user } = useAppSelector((store) => store.auth)
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    dispatch(setScreen('email'))
    window.location.href = ROUTES.ADMIN.HOME
  }

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
  }

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false)
    handleLogout()
  }

  const backToChat = () => {
    dispatch(setScreen('webScreen'))
    window.location.href = ROUTES.ADMIN.HOME
  }

  return (
    <li className="profile-nav on-hover-dropdown pe-0 py-0">
      <div className="profile-media">
        <Avatar data={user} name={user} customClass="img-fluid user-img" />
        <div className="user-data">
          <span>{user?.name}</span>
        </div>
      </div>
      <div className="profile-dropdown on-hover-show-div ">
        <ul className="p-0">
          <li onClick={() => navigate(ROUTES.ADMIN.PROFILE)}>
            <div className="profile-icon">
              <SvgIcon iconId="user-pro" className="common-svg-md" />
            </div>
            <a>{t('Account')}</a>
          </li>
          <li onClick={backToChat}>
          <div className="profile-icon">
              <SvgIcon iconId="back-arrow-icon" className="common-svg-md" />
            </div>
            <a> {t('Back to Chat')}</a>
          </li>
          <li onClick={handleLogoutClick}>
            <div className="profile-icon">
              <SvgIcon iconId="login" className="common-svg-md" />
            </div>
            <a> {t('Logout')}</a>
          </li>
        </ul>
      </div>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        title={t('Logout')}
        subtitle={t('Are you sure you want to logout?')}
        confirmText={t('Logout')}
        cancelText={t('Cancel')}
        variant="danger"
        iconId="login"
      />
    </li>
  )
}

export default UserProfile
