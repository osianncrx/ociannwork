import { User } from "../api";

export interface DashboardResponse {
  data?: {
    charts?: {
      messageTypeDistribution?: { message_type: string; count: number }[]
      activeUsersGraph?: { date: string; active_users: number }[]
      growthMemberChart?: { date: string; new_members: number; total_members: string }[]
      userLocationDistribution?: {
        country: string
        country_code: string
        user_count: number
        percentage: number
      }[]
    }
    counts?: {
      totalMembers?: number
      newThisWeek?: number
      totalChannels?: number
      fileShared?: number
      totalOnlineUsers?: number
      totalChats?: number
      totalMembersGrowth?: string
      newThisWeekGrowth?: string
      totalChannelsGrowth?: string
      totalOnlineUsersGrowth?: string
      totalChatsGrowth?: string
      fileSharedGrowth?: string
      mediaSharedGrowth?: string
      mediaShared?: number
      totalCalls?: number
      totalCallsGrowth: string
    }
    insights?: {
      latestInvites?: {
        User: User
        display_name: string
        invited_by: number
        role: string
        status: string
        created_at: Date
        invited: { id: number; name: string }
      }[]
      recentActivity?: {}[]
      teamHealth?: {
        activeToday: string
        countriesCount: number
        healthPercentage: string
        pendingInvites: number
        topCountries: []
        totalInvites: number
        totalMembers: number
      }[]
      topActiveMembers?: {
        message_count: number
        sender_id: number
        sender: {
          avatar: string
          country: string
          country_code: string
          id: number
          is_online: number
          name: string
        }
      }
    }
    storage?: {
      current_usage_mb: number
      max_storage_mb: number | null
      usage_percentage: string | null
      is_unlimited: boolean
      breakdown?: {
        image: number
        video: number
        file: number
        audio: number
      }
    }
  }
}

export interface DashboardProps {
  data?: DashboardResponse
}

export interface InviteMember extends User {
  display_name: string
  invited_by: number
  role: string
  created_at: Date
  invited: { id: number; name: string }
}