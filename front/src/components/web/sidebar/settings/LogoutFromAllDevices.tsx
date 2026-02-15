import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mutations } from '../../../../api'
import { SvgIcon } from '../../../../shared/icons'
import { ConfirmModal } from '../../../../shared/modal'
import { useAppDispatch } from '../../../../store/hooks'
import { logout } from '../../../../store/slices/authSlice'

const LogoutFromAllDevices = () => {
  const [, setDropdownOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const { mutate: logoutFromAllDevices, isPending: isLoggingOut } = mutations.useLogoutFromAllDevices()

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
    setDropdownOpen(false)
  }

  const handleLogoutConfirm = () => {
    logoutFromAllDevices(undefined, {
      onSuccess: () => {
        setShowLogoutModal(false)
        dispatch(logout())
      },
      onError: () => {
        setShowLogoutModal(false)
      },
    })
  }

  return (
    <>
      <li className="chat-item" onClick={handleLogoutClick}>
        <SvgIcon className="common-svg-hw" iconId="logout" />
        Logout from all devices
      </li>

      <ConfirmModal
        isLoading={isLoggingOut}
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        title={t('Logout from all devices')}
        subtitle={t('Are you sure you want to logout from all devices? This will end all active sessions on all devices where you are logged in.')}
        confirmText={t('Logout from all devices')}
        cancelText={t('Cancel')}
        variant="danger"
        iconId="logout"
      />
    </>
  )
}

export default LogoutFromAllDevices

