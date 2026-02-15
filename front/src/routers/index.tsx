import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { ROUTES, STORAGE_KEYS, TeamRole } from '../constants'
import { getStorage } from '../utils'
import { AdminRoutes } from './AdminRoutes'
import PrivateRoutes from './PrivateRoutes'

const AdminLayout = lazy(() => import('../layout/admin'))
const Error403 = lazy(() => import('../pages/ErrorPage403'))
const Error404 = lazy(() => import('../pages/ErrorPage404'))
const PayPalStatus = lazy(() => import('../pages/payment/PayPalStatus'))

const storage = getStorage()
const userRole =
  storage.getItem(STORAGE_KEYS.Team_Member_Role) ||
  storage.getItem(STORAGE_KEYS.USER_TEAM_DATA)?.role ||
  TeamRole.Member
const isAdmin = userRole === TeamRole.Admin

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="spinner" />
  </div>
)

const Router = createBrowserRouter([
  {
    element: <PrivateRoutes />,
    children: isAdmin
      ? [
          {
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <AdminLayout />
              </Suspense>
            ),
            children: [
              ...AdminRoutes,
              {
                path: ROUTES.ADMIN.ERROR_404,
                element: (
                  <Suspense fallback={<LoadingSpinner />}>
                    <Error404 />
                  </Suspense>
                ),
              },
              {
                path: ROUTES.PAYMENT.SUCCESS,
                element: (
                  <Suspense fallback={<LoadingSpinner />}>
                    <PayPalStatus type="success" />
                  </Suspense>
                ),
              },
              {
                path: ROUTES.PAYMENT.CANCEL,
                element: (
                  <Suspense fallback={<LoadingSpinner />}>
                    <PayPalStatus type="cancel" />
                  </Suspense>
                ),
              },
            ],
          },
        ]
      : [
          {
            path: '*',
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <Error403 />
              </Suspense>
            ),
          },
        ],
  },
  {
    path: ROUTES.ADMIN.ERROR_403,
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <Error403 />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <Error404 />
      </Suspense>
    ),
  },
])

export default Router
