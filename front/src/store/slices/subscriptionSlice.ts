import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { CurrentSubscriptionResponse, TeamSubscription } from '../../types'

export interface SubscriptionState {
  subscription: TeamSubscription | null
  daysRemaining: number | null
  isActive: boolean
}

const initialState: SubscriptionState = {
  subscription: null,
  daysRemaining: null,
  isActive: false,
}

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setSubscription(state, action: PayloadAction<CurrentSubscriptionResponse['data']>) {
      state.subscription = action.payload.subscription
      state.daysRemaining = action.payload.days_remaining
      state.isActive = action.payload.is_active
    },
    clearSubscription(state) {
      state.subscription = null
      state.daysRemaining = null
      state.isActive = false
    },
  },
})

export const { setSubscription, clearSubscription } = subscriptionSlice.actions
export default subscriptionSlice.reducer

