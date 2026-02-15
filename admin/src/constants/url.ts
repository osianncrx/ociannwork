export const BASE_URL = import.meta.env.VITE_API_BASE_URL

const URL = {
  Auth: {
    Login: 'auth/login',
    ForgotPassword: 'auth/forgot-password',
    ResetPassword: 'auth/reset-password',
    ResendOtp: 'auth/resend-otp',
    VerifyOtp: 'auth/verify-otp',
  },
  Profile: {
    UpdateDetails: 'account/updateProfile',
    Details: 'account/getUserDetails',
    UpdatePassword: 'account/updatePassword',
  },
  Settings: {
    GetSettings: 'setting',
    UpdateSettings: 'setting',
  },
  Users: {
    GetAllUsers: 'user/all',
    DeleteUser: 'user/delete',
    UpdateUserStatus: 'user/update/status',
  },
  Teams: {
    GetAllTeams: 'team/all',
    TeamMembers: 'team/members',
    Dashboard: 'team/admin/dashboard',
    DeleteTeam: 'team/delete',
    DeleteTeamMember: 'team/users',
    TeamUpdateStatus: 'team/update/status',
    DeleteChannels: 'team/channel/delete',
  },
  Channels: {
    GetAllChannels: 'channel/all',
    DeleteChannel: 'channel/delete',
    GetChannel: 'channel/info/:id',
    UpdateChannel: 'channel/:id'
  },
  FAQ: {
    GetAllFaqs: 'faq',
    CreateFaq: 'faq/create',
    UpdateFaq: 'faq/update/:id',
    UpdateFaqStatus: 'faq/status/:id',
    DeleteFaq: 'faq/delete',
  },
  Page: {
    GetAllPages: 'page',
    CreatePage: 'page/create',
    UpdatePage: 'page/update/:id',
    UpdatePageStatus: 'page/status/:id',
    DeletePage: 'page/delete',
  },
  Plan: {
    GetAllPlans: 'plan',
    CreatePlan: 'plan',
    UpdatePlan: 'plan/:id',
    UpdatePlanStatus: 'plan/:id/status',
    SetDefaultPlan: 'plan/:id/set-default',
    DeletePlan: 'plan/bulk-delete',
  },
  Impersonation: {
    GetAvailableUsers: 'impersonation/available-users',
    Start: 'impersonation/start',
    Stop: 'impersonation/stop',
    Status: 'impersonation/status',
    GetMyTeams: 'impersonation/my-teams',
  },
} as const

export const URL_KEYS: { [K in keyof typeof URL]: { [P in keyof (typeof URL)[K]]: string } } = Object.fromEntries(
  Object.entries(URL).map(([key, subKeys]) => [
    key,
    Object.fromEntries(Object.entries(subKeys).map(([subKey, path]) => [subKey, `${BASE_URL}${path}`])),
  ]),
) as {
  [K in keyof typeof URL]: { [P in keyof (typeof URL)[K]]: string }
}
