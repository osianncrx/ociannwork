import { ReactNode, useEffect } from 'react'
import { CHAT_CONSTANTS, SOCKET, STORAGE_KEYS } from '../../../constants'
import { socket } from '../../../services/socket-setup'
import { useAppSelector } from '../../../store/hooks'
import { getStorage } from '../../../utils'

interface SocketProviderProps {
  children: ReactNode
}

const SocketProvider = ({ children }: SocketProviderProps) => {
  const { user, token } = useAppSelector((store) => store.auth)
  const { userTeamData } = useAppSelector((store) => store.team)
  const storage = getStorage()

  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null

    if (user && token) {
      if (!socket.connected) {
        socket.connect()
      }

      const handleConnect = () => {
        socket.emit(SOCKET.Emitters.Join_Room, user.id)
      }

      const handleConnectError = (error: Error) => {
        console.error('Socket connection failed:', error)
        // Optionally retry connection or notify user
      }

      socket.on('connect', handleConnect)
      socket.on('connect_error', handleConnectError)

      // If socket is already connected, emit join-room immediately
      if (socket.connected) {
        socket.emit(SOCKET.Emitters.Join_Room, user.id)
      }

      // Set up heartbeat for status updates
      if (user?.id) {
        heartbeatInterval = setInterval(() => {
          if (socket.connected) {
            socket.emit(SOCKET.Emitters.Request_Status_Update)
          }
        }, CHAT_CONSTANTS.USER_STATUS_HEARTBEAT) 
      }

      if (userTeamData?.team_id) {
        storage.removeItem(STORAGE_KEYS.ADDING_TEAM)
      }
      return () => {
        socket.off('connect', handleConnect)
        socket.off('connect_error', handleConnectError)
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
        }
      }
    }
  }, [user, user?.id, token, socket, storage])
  return <>{children}</>
}

export default SocketProvider
