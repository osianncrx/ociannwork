import { useEffect, useCallback, useRef } from 'react'
import { socket } from '../../../services/socket-setup'
import { SOCKET } from '../../../constants'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  addUserToRoom,
  removeUserFromRoom,
  setCurrentRoom,
  syncRoomsState,
  VORoomUser,
} from '../../../store/slices/virtualOfficeSlice'

export const useVirtualOfficeSocket = () => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((store) => store.auth)
  const { currentRoomId } = useAppSelector((store) => store.virtualOffice)
  const { currentTab } = useAppSelector((store) => store.screen)
  const initialized = useRef(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const userId = user?.id ? String(user.id) : null
    if (!userId) return

    const handleRoomsState = (data: { roomId: string; users: VORoomUser[] }[]) => {
      // Ensure all IDs are strings
      const normalized = data.map((r) => ({
        ...r,
        users: r.users.map((u) => ({ ...u, id: String(u.id) })),
      }))
      dispatch(syncRoomsState(normalized))

      // Find which room the current user is in
      const myRoom = normalized.find((r) => r.users.some((u) => u.id === userId))
      if (myRoom) {
        dispatch(setCurrentRoom(myRoom.roomId))
      }
    }

    const handleUserJoined = (data: { roomId: string; user: VORoomUser }) => {
      dispatch(addUserToRoom({ roomId: data.roomId, user: { ...data.user, id: String(data.user.id) } }))
      // If it's me, update my current room
      if (String(data.user.id) === userId) {
        dispatch(setCurrentRoom(data.roomId))
      }
    }

    const handleUserLeft = (data: { roomId: string; userId: string }) => {
      dispatch(removeUserFromRoom({ roomId: data.roomId, userId: String(data.userId) }))
      // If it's me, clear current room
      if (String(data.userId) === userId) {
        dispatch(setCurrentRoom(null))
      }
    }

    const requestRoomsState = () => {
      if (socket.connected) {
        socket.emit(SOCKET.Emitters.VO_Get_Rooms)
      }
    }

    // Attach listeners
    socket.on(SOCKET.VOListeners.Rooms_State, handleRoomsState)
    socket.on(SOCKET.VOListeners.User_Joined_Room, handleUserJoined)
    socket.on(SOCKET.VOListeners.User_Left_Room, handleUserLeft)

    // Request rooms state immediately and also on reconnect
    if (socket.connected) {
      requestRoomsState()
    }
    socket.on('connect', requestRoomsState)

    // Poll every 15 seconds to keep rooms state fresh
    pollRef.current = setInterval(() => {
      if (socket.connected && currentTab === 'virtual-office') {
        requestRoomsState()
      }
    }, 15000)

    initialized.current = true

    return () => {
      socket.off(SOCKET.VOListeners.Rooms_State, handleRoomsState)
      socket.off(SOCKET.VOListeners.User_Joined_Room, handleUserJoined)
      socket.off(SOCKET.VOListeners.User_Left_Room, handleUserLeft)
      socket.off('connect', requestRoomsState)
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [dispatch, user?.id, currentTab])

  const joinRoom = useCallback(
    (roomId: string) => {
      if (!user || !socket.connected) return
      const userId = String(user.id)

      if (currentRoomId) {
        socket.emit(SOCKET.Emitters.VO_Leave_Room, { roomId: currentRoomId })
        dispatch(removeUserFromRoom({ roomId: currentRoomId, userId }))
      }

      socket.emit(SOCKET.Emitters.VO_Join_Room, { roomId })
      dispatch(setCurrentRoom(roomId))
    },
    [currentRoomId, user, dispatch],
  )

  const leaveRoom = useCallback(() => {
    if (!user || !currentRoomId || !socket.connected) return
    const userId = String(user.id)
    socket.emit(SOCKET.Emitters.VO_Leave_Room, { roomId: currentRoomId })
    dispatch(removeUserFromRoom({ roomId: currentRoomId, userId }))
    dispatch(setCurrentRoom(null))
  }, [currentRoomId, user, dispatch])

  const sendQuickMessage = useCallback(
    (targetUserId: string, content: string, type: 'text' | 'audio' | 'file', file?: File) => {
      if (!user || !socket.connected) return
      socket.emit(SOCKET.Emitters.VO_Send_Quick_Message, {
        targetUserId,
        content,
        type,
        senderId: String(user.id),
        senderName: user.name || user.first_name || 'User',
      })
    },
    [user],
  )

  return { joinRoom, leaveRoom, sendQuickMessage }
}
