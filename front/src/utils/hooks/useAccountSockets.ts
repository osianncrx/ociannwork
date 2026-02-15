import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getToken } from '..'
import { SOCKET, UserStatus, UserTeamStatus } from '../../constants'
import { socket } from '../../services/socket-setup'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { logout, setUserData } from '../../store/slices/authSlice'
import { setSetting } from '../../store/slices/settingSlice'
import { setUserTeamData } from '../../store/slices/teamSlice'
import Store from '../../store/store'
import { ID } from '../../types/common'
import { TeamSettingField } from '../../types'

const useAccountSockets = () => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((store) => store.auth)
  const { userTeamData } = useAppSelector((store) => store.team)
  const { selectedChatMessages, selectedChat } = useAppSelector((store) => store.chat)
  const { team } = useAppSelector((store) => store.team)
  const queryClient = useQueryClient()
  const token = getToken()

  useEffect(() => {
    if (!user) return

    const handleAccountDeactivation = (data: { team_id: ID }) => {
      if (team.id == data?.team_id) {
        Store.dispatch(setUserTeamData({ ...userTeamData, status: UserTeamStatus.Deactivated }))
        Store.dispatch(logout())
      }
    }
    const handleAdminDeactivation = () => {
      Store.dispatch(setUserData({ ...user, status: UserStatus.Deactivated }))
      setTimeout(() => {
        Store.dispatch(logout())
      }, 1500)
    }

    const handleAdminSettingUpdate = (settings: { settings: TeamSettingField }) => {
      Store.dispatch(setSetting({ settings: settings }))
    }

    const handleAdminDeletion = () => {
      Store.dispatch(logout())
    }
    const handleTeamDeletion = () => {
      Store.dispatch(logout())
    }
    const handlePasswordUpdate = (data: { token: string }) => {
      if (data?.token.split(' ')[1] != token) {
        Store.dispatch(logout())
      }
    }

    const handleLogoutFromAllDevices = () => {
      Store.dispatch(logout())
    }

    socket.on(SOCKET.Listeners.Account_Deactivated, handleAccountDeactivation)
    socket.on(SOCKET.Listeners.Admin_Deactivation, handleAdminDeactivation)
    socket.on(SOCKET.Listeners.Admin_Deletion, handleAdminDeletion)
    socket.on(SOCKET.Listeners.Password_Updated, handlePasswordUpdate)
    socket.on(SOCKET.Listeners.Logout_From_All_Devices, handleLogoutFromAllDevices)
    socket.on(SOCKET.Listeners.Team_Deletion, handleTeamDeletion)
    socket.on(SOCKET.Listeners.Admin_Settings_Updated, handleAdminSettingUpdate)

    return () => {
      socket.off(SOCKET.Listeners.Account_Deactivated, handleAccountDeactivation)
      socket.off(SOCKET.Listeners.Admin_Deactivation, handleAdminDeactivation)
      socket.off(SOCKET.Listeners.Admin_Deletion, handleAdminDeletion)
      socket.off(SOCKET.Listeners.Password_Updated, handlePasswordUpdate)
      socket.off(SOCKET.Listeners.Logout_From_All_Devices, handleLogoutFromAllDevices)
      socket.off(SOCKET.Listeners.Team_Deletion, handleTeamDeletion)
      socket.off(SOCKET.Listeners.Admin_Settings_Updated, handleAdminSettingUpdate)
    }
  }, [dispatch, user, selectedChatMessages, selectedChat, queryClient])
}

export default useAccountSockets
