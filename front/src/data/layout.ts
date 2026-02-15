import { ROUTES } from '../constants'
import { MenuItem } from '../types'

// ********** Sidebar Data **********

export const menuList: MenuItem[] = [
  {
    title: 'You',
    menu: [
      { id: 1, title: 'profile', url: ROUTES.ADMIN.PROFILE, icon: 'user-profile', type: 'link' },
    ],
  },
  {
    title: 'Your Team',
    menu: [
      { id: 4, title: 'dashboard', url: ROUTES.ADMIN.DASHBOARD, icon: 'home', type: 'link' },
      { id: 6, title: 'manage_team_members', url: ROUTES.ADMIN.MANAGE_TEAM, icon: 'administration', type: 'link' },
      { id: 7, title: 'manage_channels', url: ROUTES.ADMIN.MANAGE_CHANNEL, icon: 'manage-team', type: 'link' },
      { id: 8, title: 'team_permissions', url: ROUTES.ADMIN.TEAM_PERMISSION, icon: 'team-permission', type: 'link' },
      { id: 10, title: 'custom_fields', url: ROUTES.ADMIN.CUSTOM_FIELDS, icon: 'custom-fields', type: 'link' },
      { id: 11, title: 'plans', url: ROUTES.ADMIN.PLANS, icon: 'plan', type: 'link' },
      { id: 12, title: 'wallet', url: ROUTES.ADMIN.WALLET, icon: 'wallet', type: 'link' },
      { id: 13, title: 'subscription', url: ROUTES.ADMIN.SUBSCRIPTION, icon: 'subscribe', type: 'link' },
    ],
  },
]
