import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Screen, ScreenState } from '../../types'

const initialState: ScreenState = {
  screen: 'customFields',
  currentTab: "home"
}

const screenSlice = createSlice({
  name: 'screen',
  initialState,
  reducers: {
    setScreen(state, action: PayloadAction<Screen>) {
      state.screen = action.payload
    },
     setCurrentTab(state, action) {
      state.currentTab = action.payload
    },
  },
})

export const { setScreen,setCurrentTab } = screenSlice.actions
export default screenSlice.reducer
