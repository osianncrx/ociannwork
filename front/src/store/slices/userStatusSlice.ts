import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserStatusState } from '../../types';

const initialState: UserStatusState = {
  userStatus: {},
}

const userStatusSlice = createSlice({
  name: 'userStatus',
  initialState,
  reducers: {
    updateUserStatus: (state, action: PayloadAction<{ userId: string; status: string; lastSeen?: string }>) => {
      const { userId, status, lastSeen } = action.payload
      state.userStatus[userId] = { status, lastSeen }
    },
    updateMultipleUserStatus: (
      state,
      action: PayloadAction<Array<{ userId: string; status: string; lastSeen?: string }>>,
    ) => {
      action.payload.forEach(({ userId, status, lastSeen }) => {
        state.userStatus[userId] = { status, lastSeen }
      })
    },
  },
})

export const { updateUserStatus, updateMultipleUserStatus } = userStatusSlice.actions
export default userStatusSlice.reducer
