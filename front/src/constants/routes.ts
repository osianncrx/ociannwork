export const ROUTES = {
  ADMIN: {
    HOME: '/',
    DASHBOARD: '/admin/dashboard',
    PROFILE: '/admin/profile',
    MANAGE_USERS: '/admin/manage-users',
    MANAGE_TEAM: '/admin/manage-team',
    MANAGE_CHANNEL: '/admin/manage-channel',
    MANAGE_CHANNEL_MEMBER: '/admin/manage-channel/:id',
    SETTING: '/admin/setting',
    CUSTOM_FIELDS: '/admin/custom-fields',
    CREATE_CUSTOM_FIELD: '/admin/create/custom-fields',
    CREATE_PLAN: '/admin/create/plan',
    ERROR_404: '/admin/error/404',
    ERROR_403: '/admin/error/403',
    TEAM_PERMISSION: '/admin/team-permission',
    PLANS: '/admin/plans',
    PLAN_SUBSCRIBE: '/admin/plans/:slug/subscribe',
    SUBSCRIPTION: '/admin/subscription',
    WALLET: '/admin/wallet',
  },
  CHAT: {
    FAQS: '/faqs',
  },
  PAYMENT: {
    SUCCESS: '/admin/payment/success',
    CANCEL: '/admin/payment/cancel',
  },
} as const
