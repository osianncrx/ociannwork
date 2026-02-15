import { ROUTES } from '../constants'
import { MenuItem } from '../types'

export const menuList: MenuItem[] = [
  {
    title: 'You',
    menu: [
      { id: 1, title: 'dashboard', url: ROUTES.DASHBOARD, icon: 'home', type: 'link' },
      { id: 2, title: 'manage_users', url: ROUTES.MANAGE_USERS, icon: 'user-group', type: 'link' },
      { id: 3, title: 'manage_teams', url: ROUTES.MANAGE_TEAM, icon: 'manage-team', type: 'link' },
      { id: 4, title: 'manage_channels', url: ROUTES.MANAGE_CHANNELS, icon: 'manage-channels', type: 'link' },
      { id: 5, title: 'manage_faqs', url: ROUTES.MANAGE_FAQS, icon: 'plans', type: 'link' },
      { id: 6, title: 'manage_pages', url: ROUTES.MANAGE_PAGES, icon: 'manage-page', type: 'link' },
      { id: 7, title: 'plans', url: ROUTES.PLANS, icon: 'sidebar-plans', type: 'link' },
    ],
  },
  {
    title: 'Your Team',
    menu: [
      { id: 12, title: 'settings', url: ROUTES.SETTING, icon: 'setting', type: 'link' },
    ],
  },
]
