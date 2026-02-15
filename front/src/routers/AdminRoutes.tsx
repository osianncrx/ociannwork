import { ReactNode } from 'react'
import { RouteObject } from 'react-router-dom'
import ManageChannel from '../components/admin/channel'
import ChannelMembers from '../components/admin/channel/ChannelMember'
import CustomFields from '../components/admin/custom-fields'
import CreateCustomFieldForm from '../components/admin/custom-fields/CreateCustomFieldForm'
import Dashboard from '../components/admin/dashboard'
import Plans from '../components/admin/plans'
import PlanSubscribe from '../components/admin/plans/PlanSubscribe'
import SubscriptionManagement from '../components/admin/subscription'
import Wallet from '../components/admin/wallet'
import TeamSetting from '../components/admin/team-setting'
import ManageTeams from '../components/admin/teams'
import UserProfileContainer from '../components/admin/user-profile'
import { ROUTES } from '../constants'
import Error404 from '../pages/ErrorPage404'

type Role = 'admin' | 'user'

// Extended RouteObject with role-based access
export type AdminRoutes = RouteObject & {
  access: Role[]
  path: string
  element?: ReactNode
}

// Central route config with access control
export const AdminRoutes: AdminRoutes[] = [
  {
    path: ROUTES.ADMIN.PROFILE,
    element: <UserProfileContainer />,
    access: ['admin'],
  },

  {
    path: ROUTES.ADMIN.CUSTOM_FIELDS,
    element: <CustomFields />,
    access: ['admin'],
  },

  {
    path: ROUTES.ADMIN.CREATE_CUSTOM_FIELD,
    element: <CreateCustomFieldForm />,
    access: ['admin'],
  },


  {
    path: ROUTES.ADMIN.DASHBOARD,
    element: <Dashboard />,
    access: ['admin'],
  },
  {
    path: ROUTES.ADMIN.MANAGE_TEAM,
    element: <ManageTeams />,
    access: ['admin'],
  },
  {
    path: ROUTES.ADMIN.MANAGE_CHANNEL,
    element: <ManageChannel />,
    access: ['admin'],
  },
  {
    path: ROUTES.ADMIN.WALLET,
    element: <Wallet />,
    access: ['admin'],
  },
  {
    path: ROUTES.ADMIN.PLANS,
    element: <Plans />,
    access: ['admin'],
  },
  {
    path: ROUTES.ADMIN.PLAN_SUBSCRIBE,
    element: <PlanSubscribe />,
    access: ['admin'],
  },
  {
    path: ROUTES.ADMIN.SUBSCRIPTION,
    element: <SubscriptionManagement />,
    access: ['admin'],
  },
  {
    path: ROUTES.ADMIN.MANAGE_CHANNEL_MEMBER,
    element: <ChannelMembers />,
    access: ['admin'],
  },
  {
    path: ROUTES.ADMIN.ERROR_404,
    element: <Error404 />,
    access: ['admin'],
  },

  {
    path: ROUTES.ADMIN.TEAM_PERMISSION,
    element: <TeamSetting />,
    access: ['admin'],
  },
]
