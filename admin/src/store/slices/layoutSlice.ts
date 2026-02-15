import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const layoutSlice = createSlice({
  name: 'layoutSlice',
  initialState: {
    isSidebarOpen: true,
  },
  reducers: {
    toggleSidebar: (state,action: PayloadAction<boolean | undefined>) => {
      state.isSidebarOpen = typeof action.payload === 'boolean' ? action.payload : !state.isSidebarOpen
    },
  },
})

export const { toggleSidebar } = layoutSlice.actions
export default layoutSlice.reducer
