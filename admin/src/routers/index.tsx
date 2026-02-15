import { createBrowserRouter, Navigate } from 'react-router-dom'
import ForgotPasswordContainer from '../auth/forgot-password'
import Login from '../auth/login'
import NewPasswordContainer from '../auth/new-password'
import VerifyOtpContainer from '../auth/verify-otp'
import Setting from '../components/setting'
import ManageTeams from '../components/teams'
import UserProfileContainer from '../components/user-profile'
import ManageUsers from '../components/users'
import { ROUTES } from '../constants'
import Layout from '../layout'
import ErrorPage from '../pages/ErrorPage'
import PrivateRoutes from './PrivateRoutes'
import PublicRoutes from './PublicRoutes'
import ManageTeamMembers from '../components/teams/members'
import ManageChannels from '../components/channels'
import ManageFaqs from '../components/faqs'
import FaqForm from '../components/faqs/FaqForm'
import ManagePages from '../components/pages'
import PageForm from '../components/pages/PageForm'
import Dashboard from '../components/dashboard'
import EditUsers from '../components/users/EditUsers'
import EditChannels from '../components/channels/EditChannels'
import Plans from '../components/plans'
import PlanForm from '../components/plans/PlansForm'

export const Router = createBrowserRouter([
  {
    element: <PrivateRoutes />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to={ROUTES.DASHBOARD} replace /> },
          { path: ROUTES.DASHBOARD, element: <Dashboard /> },
          { path: ROUTES.MANAGE_USERS, element: <ManageUsers /> },
          { path: ROUTES.EDIT_USERS, element: <EditUsers /> },
          { path: ROUTES.MANAGE_TEAM, element: <ManageTeams /> },
          { path: ROUTES.PROFILE, element: <UserProfileContainer /> },
          { path: ROUTES.SETTING, element: <Setting /> },
          { path: ROUTES.MANAGE_TEAM_MEMBERS, element: <ManageTeamMembers /> },
          { path: ROUTES.MANAGE_CHANNELS, element: <ManageChannels /> },
          { path: ROUTES.EDIT_CHANNELS, element: <EditChannels /> },
          { path: ROUTES.MANAGE_FAQS, element: <ManageFaqs /> },
          { path: ROUTES.ADD_FAQ, element: <FaqForm /> },
          { path: ROUTES.EDIT_FAQ, element: <FaqForm /> },
          { path: ROUTES.MANAGE_PAGES, element: <ManagePages /> },
          { path: ROUTES.ADD_PAGE, element: <PageForm /> },
          { path: ROUTES.EDIT_PAGE, element: <PageForm /> },
          { path: ROUTES.PLANS, element: <Plans /> },
          { path: ROUTES.ADD_PLAN, element: <PlanForm /> },
          { path: ROUTES.EDIT_PLAN, element: <PlanForm /> },
        ],
      },
    ],
  },
  {
    element: <PublicRoutes />,
    children: [
      { path: ROUTES.LOGIN, element: <Login /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordContainer /> },
      { path: ROUTES.VERIFY_OTP, element: <VerifyOtpContainer /> },
      { path: ROUTES.SET_NEW_PASSWORD, element: <NewPasswordContainer /> },
    ],
  },
  {
    path: '*',
    element: <ErrorPage />,
  },
])
