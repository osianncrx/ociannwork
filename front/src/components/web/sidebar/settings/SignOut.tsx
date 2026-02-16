import { useState } from 'react'
import { mutations } from '../../../../api'
import { SvgIcon } from '../../../../shared/icons'
import { ConfirmModal } from '../../../../shared/modal'
import { useAppDispatch } from '../../../../store/hooks'
import { logout } from '../../../../store/slices/authSlice'

const SignOut = () => {
  const [, setDropdownOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const dispatch = useAppDispatch()
  const { mutate: logoutUser, isPending: isLoggingOut } = mutations.useLogout()

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
    setDropdownOpen(false)
  }

  const handleLogoutConfirm = () => {
    logoutUser(undefined, {
      onSuccess: () => {
        setShowLogoutModal(false)
        dispatch(logout())
      },
      onError: () => {
        // Even if API call fails, logout locally
        setShowLogoutModal(false)
        dispatch(logout())
      },
    })
  }

  return (
    <>
      <li className="chat-item" onClick={handleLogoutClick}>
        <SvgIcon className="common-svg-hw" iconId="logout" />
        Cerrar Sesión
      </li>

      <ConfirmModal
        isLoading={isLoggingOut}
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        title="Cerrar Sesión"
        subtitle="¿Estás seguro de que quieres cerrar sesión?"
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        variant="danger"
        iconId="login"
      />
    </>
  )
}

export default SignOut
