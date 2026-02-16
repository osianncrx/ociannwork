import { socket } from './socket-setup'
import Store from '../store/store'
import { addMarca, setEstadoActual } from '../store/slices/attendanceSlice'

interface MarkRegisteredEvent {
  user_id: number
  tipoMarca: number
  hora: string
  idMarca: number
}

interface StatusUpdateEvent {
  user_id: number
  estado: 'SIN_REGISTRO' | 'TRABAJANDO' | 'DESCANSANDO' | 'TERMINADO'
}

interface RequestApprovedEvent {
  id: number
  user_id: number
  aprobado: number
}

let currentTeamId: number | null = null

export function joinAttendanceTeam(teamId: number) {
  if (currentTeamId === teamId) return
  if (currentTeamId) {
    socket.emit('attendance:leave-team', currentTeamId)
  }
  socket.emit('attendance:join-team', teamId)
  currentTeamId = teamId
}

export function leaveAttendanceTeam() {
  if (currentTeamId) {
    socket.emit('attendance:leave-team', currentTeamId)
    currentTeamId = null
  }
}

export function setupAttendanceSocketListeners() {
  socket.on('attendance:mark-registered', (data: MarkRegisteredEvent) => {
    const state = Store.getState()
    const currentUser = state.auth?.user
    if (currentUser && data.user_id === (currentUser as { id: number }).id) {
      Store.dispatch(addMarca({
        idMarca: data.idMarca,
        TipoMarca: data.tipoMarca,
        Hora: data.hora,
      }))
    }
  })

  socket.on('attendance:status-update', (data: StatusUpdateEvent) => {
    const state = Store.getState()
    const currentUser = state.auth?.user
    if (currentUser && data.user_id === (currentUser as { id: number }).id) {
      Store.dispatch(setEstadoActual(data.estado))
    }
  })

  socket.on('attendance:request-approved', (_data: RequestApprovedEvent) => {
    // This event can be used to show a notification to the user
    // when their edit request is approved or rejected
  })
}

export function cleanupAttendanceSocketListeners() {
  socket.off('attendance:mark-registered')
  socket.off('attendance:status-update')
  socket.off('attendance:request-approved')
  leaveAttendanceTeam()
}
