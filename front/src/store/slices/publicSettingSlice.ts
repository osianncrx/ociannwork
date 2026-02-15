import { createSlice } from '@reduxjs/toolkit'
import { SiteSettings } from '../../types'

const initialState: SiteSettings = {
  settings: null,
  logo_light_url: '',
  logo_dark_url: '',
  public_favicon_url: '',
  public_site_name: '',
  public_site_description: '',
  public_otp_digits: 6,
  pages: null,
  onboarding_logo: '',
  public_loading_logo: '',
}

const publicSettingSlice = createSlice({
  name: 'publicSetting',
  initialState,
  reducers: {
    setPublicSetting: (state, action) => {
      state.settings = action.payload
      state.logo_light_url = action.payload.settings.logo_light_url
      state.logo_dark_url = action.payload.settings.logo_dark_url
      state.public_favicon_url = action.payload.settings.favicon_url
      state.public_site_name = action.payload.settings.site_name
      state.public_site_description = action.payload.settings.site_description
      state.public_otp_digits = action.payload.settings.otp_digits
      state.pages = action.payload.pages
      state.onboarding_logo = action.payload.settings.onboarding_logo_url
      state.public_loading_logo = action.payload.settings.landing_logo_url
    },
  },
})

export const { setPublicSetting } = publicSettingSlice.actions

export default publicSettingSlice.reducer
