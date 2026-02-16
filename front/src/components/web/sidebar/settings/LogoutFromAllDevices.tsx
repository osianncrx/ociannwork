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
        Cerrar sesión en todos los dispositivos
      </li>

      <ConfirmModal
        isLoading={isLoggingOut}
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        title={t('Cerrar sesión en todos los dispositivos')}
        subtitle={t('¿Estás seguro de que quieres cerrar sesión en todos los dispositivos? Esto finalizará todas las sesiones activas en todos los dispositivos donde estás conectado.')}
        confirmText={t('Cerrar sesión en todos los dispositivos')}
        cancelText={t('Cancelar')}
        variant="danger"
        iconId="logout"
      />
    </>
  )
}

export default LogoutFromAllDevices

