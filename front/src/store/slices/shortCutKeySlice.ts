import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ShortCutKeyState } from '../../types'

const initialState: ShortCutKeyState = {
  searchModal: false,
  searchInput: false,
}

const shortCutKeySlice = createSlice({
  name: 'shortCutKey',
  initialState,
  reducers: {
    setSearchModal(state) {
      state.searchModal = !state.searchModal
    },
    setSearchInput(state, action: PayloadAction<boolean | undefined>) {
      state.searchInput = typeof action.payload === 'boolean' ? action.payload : !state.searchInput
    },
  },
})

export const { setSearchModal, setSearchInput } = shortCutKeySlice.actions
export default shortCutKeySlice.reducer
