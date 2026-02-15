import { createSlice } from '@reduxjs/toolkit'
import { AppSettings } from '../../types'

const initialState: AppSettings = {
  settings: null,
  sidebar_logo_url: '',
  logo_light_url: '',
  logo_dark_url: '',
  favicon_url: '',
  no_internet_title: '',
  no_internet_content: '',
  no_internet_image_url: '',
  page_404_title: '',
  page_404_content: '',
  page_404_image_url: '',
  maintenance_mode: false,
  maintenance_image_url: '',
  maintenance_title: '',
  maintenance_message: '',
  site_name: '',
  site_description: '',
  contact_email: '',
  contact_phone: '',
  company_address: '',
  support_email: '',
  otp_digits: 6,
  favicon_notification_logo: '',
  loading_logo: '',
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
      state.no_internet_title = action.payload.settings.no_internet_title
      state.no_internet_content = action.payload.settings.no_internet_content
      state.no_internet_image_url = action.payload.settings.no_internet_image_url
      state.page_404_title = action.payload.settings.page_404_title
      state.page_404_content = action.payload.settings.page_404_content
      state.page_404_image_url = action.payload.settings.page_404_image_url
      state.maintenance_mode = action.payload.settings.maintenance_mode
      state.maintenance_image_url = action.payload.settings.maintenance_image_url
      state.maintenance_title = action.payload.settings.maintenance_title
      state.maintenance_message = action.payload.settings.maintenance_message
      state.site_name = action.payload.settings.site_name
      state.site_description = action.payload.settings.site_description
      state.contact_email = action.payload.settings.contact_email
      state.contact_phone = action.payload.settings.contact_phone
      state.company_address = action.payload.settings.company_address
      state.support_email = action.payload.settings.support_email
      state.otp_digits = action.payload.settings.otp_digits
      state.favicon_notification_logo = action.payload.settings.favicon_notification_logo_url
      state.loading_logo = action.payload.settings.landing_logo_url
    },
  },
})

export const { setSetting } = settingSlice.actions

export default settingSlice.reducer
