import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/authSlice'
import layoutSlice from './slices/layoutSlice'
import loaderSlice from './slices/loaderSlice'
import themeCustomizerSlice from './slices/themeCustomizerSlice'
import settingSlice from './slices/settingSlice'

const Store = configureStore({
  reducer: {
    auth: authSlice,
    layout: layoutSlice,
    loader: loaderSlice,
    theme: themeCustomizerSlice,
    setting: settingSlice,
  },
})

export default Store

export type RootState = ReturnType<typeof Store.getState>
export type AppDispatch = typeof Store.dispatch
