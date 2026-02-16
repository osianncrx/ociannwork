import { useCallback } from 'react'
import { Container } from 'reactstrap'
import { useAppSelector } from '../../../store/hooks'
import { useVirtualOfficeSocket } from './useVirtualOfficeSocket'
import RoomCard from './RoomCard'
import QuickMessagePanel from './QuickMessagePanel'
import './virtual-office.scss'

const VirtualOffice = () => {
  const { rooms, selectedUser, showQuickMessage, currentRoomId } = useAppSelector(
    (store) => store.virtualOffice,
  )
  const { user } = useAppSelector((store) => store.auth)
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
    <div className="vo-container">
      <Container fluid>
        <div className="vo-header">
          <div className="vo-header-left">
            <h2 className="vo-title">Oficina Virtual</h2>
            <p className="vo-subtitle">
              Haz doble click en una sala para moverte. Click en un usuario para enviar un mensaje rápido.
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
                <span>{rooms.find((r) => r.id === currentRoomId)?.name || 'Desconocido'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="vo-floor-plan">
          <div className="vo-office-grid">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onDoubleClick={handleRoomDoubleClick} />
            ))}
          </div>

          <div className="vo-floor-decorations">
            <div className="vo-hallway vo-hallway-horizontal" />
            <div className="vo-hallway vo-hallway-vertical" />
          </div>
        </div>

        {showQuickMessage && selectedUser && <QuickMessagePanel user={selectedUser} />}
      </Container>
    </div>
  )
}

export default VirtualOffice
