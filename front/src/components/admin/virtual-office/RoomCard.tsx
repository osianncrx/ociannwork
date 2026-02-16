import { FC, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { setSelectedUser, VORoom, VORoomUser } from '../../../store/slices/virtualOfficeSlice'
import { FiUsers, FiMonitor, FiCoffee, FiMinusCircle } from 'react-icons/fi'

interface RoomCardProps {
  room: VORoom
  onDoubleClick: (roomId: string) => void
}

const roomIcons: Record<string, FC<{ size?: number; className?: string }>> = {
  office: FiMonitor,
  meeting: FiUsers,
  break: FiCoffee,
  inactive: FiMinusCircle,
}

const RoomCard: FC<RoomCardProps> = ({ room, onDoubleClick }) => {
  const dispatch = useAppDispatch()
  const { currentRoomId } = useAppSelector((store) => store.virtualOffice)
  const { userStatus } = useAppSelector((store) => store.userStatus)
  const { user: currentUser } = useAppSelector((store) => store.auth)

  const isMyRoom = currentRoomId === room.id
  const RoomIcon = roomIcons[room.type] || FiUsers

  const handleDoubleClick = useCallback(() => {
    onDoubleClick(room.id)
  }, [room.id, onDoubleClick])

  const handleUserClick = useCallback(
    (e: React.MouseEvent, user: VORoomUser) => {
      e.stopPropagation()
      if (user.id === currentUser?.id) return
      dispatch(setSelectedUser(user))
    },
    [dispatch, currentUser?.id],
  )

  const getUserStatus = (userId: string) => {
    return userStatus[userId]?.status || 'offline'
  }

  return (
    <div
      className={`vo-room-card vo-room-${room.type} ${isMyRoom ? 'vo-room-active' : ''}`}
      style={{ gridArea: room.gridArea }}
      onDoubleClick={handleDoubleClick}
    >
      <div className="vo-room-header">
        <div className="vo-room-icon">
          <RoomIcon size={16} />
        </div>
        <h4 className="vo-room-name">{room.name}</h4>
        <span className="vo-room-count">{room.users.length}</span>
      </div>

      <div className="vo-room-users">
        {room.users.length === 0 ? (
          <div className="vo-room-empty">
            <span className="vo-room-empty-text">Sin ocupantes</span>
          </div>
        ) : (
          room.users.map((u) => {
            const status = getUserStatus(u.id)
            const initials = (u.name || u.first_name || 'U').charAt(0).toUpperCase()
            const isMe = u.id === currentUser?.id

            return (
              <div
                key={u.id}
                className={`vo-user-badge ${isMe ? 'vo-user-me' : ''}`}
                onClick={(e) => handleUserClick(e, u)}
                title={u.name || u.first_name || 'Usuario'}
              >
                <div className="vo-user-avatar" style={{ backgroundColor: u.profile_color || '#5579F8' }}>
                  {u.avatar ? <img src={u.avatar} alt={u.name} className="vo-avatar-img" /> : <span>{initials}</span>}
                  <span className={`vo-status-indicator vo-status-${status}`} />
                </div>
                <span className="vo-user-name-label">{u.name || u.first_name || 'Usuario'}{isMe ? ' (Tú)' : ''}</span>
              </div>
            )
          })
        )}
      </div>

      {isMyRoom && <div className="vo-room-current-badge">Estás aquí</div>}
    </div>
  )
}

export default RoomCard
