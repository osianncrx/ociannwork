import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const layoutSlice = createSlice({
  name: 'layoutSlice',
  initialState: {
    isSidebarOpen: true,
    sidebarToggle: true,
    toolSidebarToggle: true,
    isFileModalOpen: false,
  },
  reducers: {
    toggleSidebar: (state,action: PayloadAction<boolean | undefined>) => {
      state.isSidebarOpen = typeof action.payload === 'boolean' ? action.payload : !state.isSidebarOpen
    },
    setSidebarToggle: (state, action: PayloadAction<boolean | undefined>) => {
      state.sidebarToggle = typeof action.payload === 'boolean' ? action.payload : !state.sidebarToggle
    },
    setToolSidebarToggle: (state, action: PayloadAction<boolean | undefined>) => {
      state.toolSidebarToggle = typeof action.payload === 'boolean' ? action.payload : !state.toolSidebarToggle
    },
    setFileModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isFileModalOpen = action.payload
    },
  },
})

export const { toggleSidebar, setSidebarToggle, setFileModalOpen, setToolSidebarToggle } = layoutSlice.actions
export default layoutSlice.reducer
