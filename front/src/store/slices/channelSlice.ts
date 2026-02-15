import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ChannelRole } from '../../constants'
import { Channel, ChannelMember, ChannelState } from '../../types'

const initialState: ChannelState = {
  currentChannel: null,
  currentUserRole: 'member',
  isChannelAdmin:false,
}

const channelSlice = createSlice({
  name: 'channelSlice',
  initialState,
  reducers: {
    setCurrentChannel: (state, action: PayloadAction<Channel>) => {
      state.currentChannel = action.payload
    },

    // Add a member safely
    addChannelMember: (state, action: PayloadAction<ChannelMember>) => {
      if (state.currentChannel) {
        state.currentChannel.members.push(action.payload)
      }
    },

    removeChannelMember: (state, action: PayloadAction<string | number>) => {
      if (state.currentChannel) {
        state.currentChannel.members = state.currentChannel.members.filter((m) => m.User.id !== action.payload)
      }
    },

    makeChannelAdmin: (state, action: PayloadAction<string | number>) => {
      if (state.currentChannel) {
        const member = state.currentChannel.members.find((m) => m.User.id === action.payload)
        if (member) member.role = ChannelRole.Admin
      }
    },

    dismissChannelAdmin: (state, action: PayloadAction<string | number>) => {
      if (state.currentChannel) {
        const member = state.currentChannel.members.find((m) => m.User.id === action.payload)
        if (member) member.role = ChannelRole.Member
      }
    },

    updateMemberRole: (state, action: PayloadAction<{ userId: string | number; newRole: ChannelRole }>) => {
      if (state.currentChannel) {
        const member = state.currentChannel.members.find((m) => m.User.id === action.payload.userId)
        if (member) {
          member.role = action.payload.newRole
        }
      }
    },
    setCurrentUserRoleInChannel: (state, action: PayloadAction<{ userId: string | number }>) => {
      if (state.currentChannel) {
        const member = state.currentChannel.members.find((m) => m.User.id === action.payload.userId)
        state.currentUserRole = member ? member.role : ChannelRole.Member
        state.currentUserRole = member ? member.role : ChannelRole.Member
      } else {
        state.currentUserRole = ChannelRole.Member
      }
    },
  },
})

export const {
  setCurrentChannel,
  addChannelMember,
  removeChannelMember,
  makeChannelAdmin,
  dismissChannelAdmin,
  updateMemberRole,
  setCurrentUserRoleInChannel,
} = channelSlice.actions

export default channelSlice.reducer
