import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { LoaderState } from '../../types'

const initialState: LoaderState = {
  loading: false,
  pageLoading: {},
}

const loaderSlice = createSlice({
  name: 'loader',
  initialState,
  reducers: {
    showLoader: (state) => {
      state.loading = true
    },
    hideLoader: (state) => {
      state.loading = false
    },
    showPageLoader: (state, action: PayloadAction<string>) => {
      state.pageLoading[action.payload] = true
    },
    hidePageLoader: (state, action: PayloadAction<string>) => {
      state.pageLoading[action.payload] = false
    },
  },
})

export const { showLoader, hideLoader, showPageLoader, hidePageLoader } = loaderSlice.actions

export default loaderSlice.reducer
