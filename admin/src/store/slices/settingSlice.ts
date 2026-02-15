import { createSlice } from '@reduxjs/toolkit'
import { AppSettings } from '../../types/store'

const initialState: AppSettings = {
  settings: null,
  sidebar_logo_url: '',
  logo_light_url: null,
  logo_dark_url: '',
  favicon_url: '',
  page_404_title: '',
  page_404_content: '',
  page_404_image_url: '',
}

const settingSlice = createSlice({
  name: 'setting',
  initialState,
  reducers: {
    setSetting: (state, action) => {
      state.settings = action.payload
      state.sidebar_logo_url = action.payload.settings.sidebar_logo_url
      state.logo_light_url = action.payload.settings.logo_light_url
      state.logo_dark_url = action.payload.settings.logo_dark_url
      state.favicon_url = action.payload.settings.favicon_url
      state.page_404_title = action.payload.settings.page_404_title
      state.page_404_content = action.payload.settings.page_404_content
      state.page_404_image_url = action.payload.settings.page_404_image_url
    },
  },
})

export const { setSetting } = settingSlice.actions

export default settingSlice.reducer
