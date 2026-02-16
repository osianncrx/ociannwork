import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface VORoomUser {
  id: string
  name: string
  first_name?: string
  last_name?: string
  avatar?: string
  profile_color?: string
  status?: string
}

export interface VORoom {
  id: string
  name: string
  gridArea: string
  users: VORoomUser[]
  maxCapacity?: number
  type: 'office' | 'meeting' | 'break' | 'inactive'
}

export interface VirtualOfficeState {
  rooms: VORoom[]
  currentRoomId: string | null
  selectedUser: VORoomUser | null
  showQuickMessage: boolean
  isLoading: boolean
}

const defaultRooms: VORoom[] = [
  { id: 'desarrolladores', name: 'Desarrolladores', gridArea: 'dev', users: [], type: 'office' },
  { id: 'gerencia', name: 'Gerencia', gridArea: 'ger', users: [], type: 'office' },
  { id: 'descanso', name: 'Descanso', gridArea: 'des', users: [], type: 'break' },
  { id: 'sala-1', name: 'Sala 1', gridArea: 'sa1', users: [], type: 'meeting' },
  { id: 'sala-2', name: 'Sala 2', gridArea: 'sa2', users: [], type: 'meeting' },
  { id: 'comercial', name: 'Comercial', gridArea: 'com', users: [], type: 'office' },
  { id: 'inactivos', name: 'Inactivos', gridArea: 'ina', users: [], type: 'inactive' },
  { id: 'legal-docente', name: 'Legal / Docente', gridArea: 'leg', users: [], type: 'office' },
]

const initialState: VirtualOfficeState = {
  rooms: defaultRooms,
  currentRoomId: null,
  selectedUser: null,
  showQuickMessage: false,
  isLoading: false,
}

const virtualOfficeSlice = createSlice({
  name: 'virtualOffice',
  initialState,
  reducers: {
    setRooms: (state, action: PayloadAction<VORoom[]>) => {
      state.rooms = action.payload
    },
    updateRoomUsers: (state, action: PayloadAction<{ roomId: string; users: VORoomUser[] }>) => {
      const room = state.rooms.find((r) => r.id === action.payload.roomId)
      if (room) {
        room.users = action.payload.users
      }
    },
    addUserToRoom: (state, action: PayloadAction<{ roomId: string; user: VORoomUser }>) => {
      const room = state.rooms.find((r) => r.id === action.payload.roomId)
      if (room && !room.users.find((u) => u.id === action.payload.user.id)) {
        room.users.push(action.payload.user)
      }
    },
    removeUserFromRoom: (state, action: PayloadAction<{ roomId: string; userId: string }>) => {
      const room = state.rooms.find((r) => r.id === action.payload.roomId)
      if (room) {
        room.users = room.users.filter((u) => u.id !== action.payload.userId)
      }
    },
    setCurrentRoom: (state, action: PayloadAction<string | null>) => {
      state.currentRoomId = action.payload
    },
    setSelectedUser: (state, action: PayloadAction<VORoomUser | null>) => {
      state.selectedUser = action.payload
      state.showQuickMessage = action.payload !== null
    },
    closeQuickMessage: (state) => {
      state.selectedUser = null
      state.showQuickMessage = false
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    syncRoomsState: (state, action: PayloadAction<{ roomId: string; users: VORoomUser[] }[]>) => {
      action.payload.forEach(({ roomId, users }) => {
        const room = state.rooms.find((r) => r.id === roomId)
        if (room) {
          room.users = users
        }
      })
    },
  },
})

export const {
  setRooms,
  updateRoomUsers,
  addUserToRoom,
  removeUserFromRoom,
  setCurrentRoom,
  setSelectedUser,
  closeQuickMessage,
  setLoading,
  syncRoomsState,
} = virtualOfficeSlice.actions

export default virtualOfficeSlice.reducer
