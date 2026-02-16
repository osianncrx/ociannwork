import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/authSlice'
import screenSlice from './slices/screenSlice'
import teamSlice from './slices/teamSlice'
import loaderSlice from './slices/loaderSlice'
import layoutSlice from './slices/admin/layoutSlice'
import chatSlice from './slices/chatSlice'
import channelSlice from './slices/channelSlice'
import themeCustomizerSlice from './slices/themeCustomizerSlice'
import userStatusSlice from './slices/userStatusSlice'
import teamSettingSlice from './slices/teamSettingSlice'
import shortCutKeySlice from './slices/shortCutKeySlice'
import settingSlice from './slices/settingSlice'
import publicSettingSlice from './slices/publicSettingSlice'
import subscriptionSlice from './slices/subscriptionSlice'
import messageSelectionSlice from './slices/messageSelectionSlice'
import virtualOfficeSlice from './slices/virtualOfficeSlice'
import attendanceSlice from './slices/attendanceSlice'


const Store = configureStore({
  reducer: {
    auth: authSlice,
    screen: screenSlice,
    team: teamSlice,
    loader: loaderSlice,
    admin_layout: layoutSlice,
    chat: chatSlice,
    channel: channelSlice,
    theme: themeCustomizerSlice,
    userStatus: userStatusSlice,
    teamSetting: teamSettingSlice,
    shortCutKey: shortCutKeySlice,
    setting: settingSlice,
    publicSetting: publicSettingSlice,
    subscription: subscriptionSlice,
    messageSelection: messageSelectionSlice,
    virtualOffice: virtualOfficeSlice,
    attendance: attendanceSlice,
  },
})

export default Store

export type RootState = ReturnType<typeof Store.getState>
export type AppDispatch = typeof Store.dispatch
