import { useCallback } from 'react'
import { useAppSelector } from '../../../store/hooks'
import { useVirtualOfficeSocket } from './useVirtualOfficeSocket'
import RoomCard from './RoomCard'
import QuickMessagePanel from './QuickMessagePanel'
import AttendanceWidget from './AttendanceWidget'
import './virtual-office.scss'

const VirtualOffice = () => {
  const { rooms, selectedUser, showQuickMessage, currentRoomId } = useAppSelector(
    (store) => store.virtualOffice,
  )
  const { user } = useAppSelector((store) => store.auth)
  const { sidebarToggle } = useAppSelector((store) => store.admin_layout)
  const { joinRoom } = useVirtualOfficeSocket()

  const handleRoomDoubleClick = useCallback(
    (roomId: string) => {
      if (roomId === currentRoomId) return
      joinRoom(roomId)
    },
    [currentRoomId, joinRoom],
  )

  const totalOnline = rooms.reduce((acc, r) => acc + r.users.length, 0)

  return (
    <div className={`vo-main-container ${!sidebarToggle ? 'vo-full-width' : ''}`}>
      <div className="vo-content">
        <div className="vo-header">
          <div className="vo-header-left">
            <h2 className="vo-title">Oficina Virtual</h2>
            <p className="vo-subtitle">
              Doble click en una sala para moverte &middot; Click en un usuario para enviar mensaje
            </p>
          </div>
          <div className="vo-header-right">
            <div className="vo-online-indicator">
              <span className="vo-online-dot" />
              <span className="vo-online-count">{totalOnline} en línea</span>
            </div>
            {currentRoomId && (
              <div className="vo-current-location">
                <span className="vo-location-icon">📍</span>
                <span>{rooms.find((r) => r.id === currentRoomId)?.name || ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Widget */}
        <AttendanceWidget />

        <div className="vo-floor-plan">
          <div className="vo-office-grid">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onDoubleClick={handleRoomDoubleClick} />
            ))}
          </div>
        </div>

        {showQuickMessage && selectedUser && <QuickMessagePanel user={selectedUser} />}
      </div>
    </div>
  )
}

export default VirtualOffice
