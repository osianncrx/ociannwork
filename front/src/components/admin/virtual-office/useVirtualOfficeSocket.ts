import { useEffect, useCallback } from 'react'
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

  useEffect(() => {
    if (!socket.connected) return

    socket.emit(SOCKET.Emitters.VO_Get_Rooms)

    const handleRoomsState = (data: { roomId: string; users: VORoomUser[] }[]) => {
      dispatch(syncRoomsState(data))
      const myRoom = data.find((r) => r.users.some((u) => u.id === user?.id))
      if (myRoom) {
        dispatch(setCurrentRoom(myRoom.roomId))
      }
    }

    const handleUserJoined = (data: { roomId: string; user: VORoomUser }) => {
      dispatch(addUserToRoom({ roomId: data.roomId, user: data.user }))
    }

    const handleUserLeft = (data: { roomId: string; userId: string }) => {
      dispatch(removeUserFromRoom({ roomId: data.roomId, userId: data.userId }))
    }

    socket.on(SOCKET.VOListeners.Rooms_State, handleRoomsState)
    socket.on(SOCKET.VOListeners.User_Joined_Room, handleUserJoined)
    socket.on(SOCKET.VOListeners.User_Left_Room, handleUserLeft)

    return () => {
      socket.off(SOCKET.VOListeners.Rooms_State, handleRoomsState)
      socket.off(SOCKET.VOListeners.User_Joined_Room, handleUserJoined)
      socket.off(SOCKET.VOListeners.User_Left_Room, handleUserLeft)
    }
  }, [dispatch, user?.id])

  const joinRoom = useCallback(
    (roomId: string) => {
      if (!user) return
      if (currentRoomId) {
        socket.emit(SOCKET.Emitters.VO_Leave_Room, { roomId: currentRoomId })
        dispatch(removeUserFromRoom({ roomId: currentRoomId, userId: user.id }))
      }
      socket.emit(SOCKET.Emitters.VO_Join_Room, { roomId })
      dispatch(
        addUserToRoom({
          roomId,
          user: {
            id: user.id,
            name: user.name || user.first_name || 'User',
            first_name: user.first_name,
            last_name: user.last_name,
            avatar: user.avatar,
            profile_color: user.profile_color,
            status: 'online',
          },
        }),
      )
      dispatch(setCurrentRoom(roomId))
    },
    [currentRoomId, user, dispatch],
  )

  const leaveRoom = useCallback(() => {
    if (!user || !currentRoomId) return
    socket.emit(SOCKET.Emitters.VO_Leave_Room, { roomId: currentRoomId })
    dispatch(removeUserFromRoom({ roomId: currentRoomId, userId: user.id }))
    dispatch(setCurrentRoom(null))
  }, [currentRoomId, user, dispatch])

  const sendQuickMessage = useCallback(
    (targetUserId: string, content: string, type: 'text' | 'audio' | 'file', file?: File) => {
      if (!user) return
      socket.emit(SOCKET.Emitters.VO_Send_Quick_Message, {
        targetUserId,
        content,
        type,
        senderId: user.id,
        senderName: user.name || user.first_name || 'User',
      })
    },
    [user],
  )

  return { joinRoom, leaveRoom, sendQuickMessage }
}
