import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface MessageSelectionState {
  selectedMessages: number[]
  isSelectionMode: boolean
}

const initialState: MessageSelectionState = {
  selectedMessages: [],
  isSelectionMode: false,
}

const messageSelectionSlice = createSlice({
  name: 'messageSelection',
  initialState,
  reducers: {
    toggleMessageSelection: (state, action: PayloadAction<number>) => {
      const messageId = action.payload
      const index = state.selectedMessages.indexOf(messageId)

      if (index > -1) {
        state.selectedMessages.splice(index, 1)
        if (state.selectedMessages.length === 0) {
          state.isSelectionMode = false
        }
      } else {
        state.selectedMessages.push(messageId)
        state.isSelectionMode = true
      }
    },

    selectMessage: (state, action: PayloadAction<number>) => {
      const messageId = action.payload
      if (!state.selectedMessages.includes(messageId)) {
        state.selectedMessages.push(messageId)
        state.isSelectionMode = true
      }
    },

    enterSelectionMode: (state, action: PayloadAction<number>) => {
      state.isSelectionMode = true
      state.selectedMessages = [action.payload]
    },

    clearSelection: (state) => {
      state.selectedMessages = []
      state.isSelectionMode = false
    },

    exitSelectionMode: (state) => {
      state.isSelectionMode = false
      state.selectedMessages = []
    },
    resetMessageSelection: () => initialState,
    enterEmptySelectionModes: (state) => {
      state.isSelectionMode = true
      state.selectedMessages = []
    },
  },
})

export const {
  toggleMessageSelection,
  selectMessage,
  enterSelectionMode,
  clearSelection,
  exitSelectionMode,
  resetMessageSelection,
  enterEmptySelectionModes,
} = messageSelectionSlice.actions

export default messageSelectionSlice.reducer
