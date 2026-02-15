import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ROUTES, STORAGE_KEYS, TeamRole } from '../constants'
import { getStorage, getToken } from '../utils'

export const PrivateRoutes = () => {
  const location = useLocation()
  const storage = getStorage()
  const role = storage.getItem(STORAGE_KEYS.Team_Member_Role) || storage.getItem(STORAGE_KEYS.USER_TEAM_DATA)?.role

  const token = getToken()
  const isAuthenticated = !!token
  const isAdmin = role === TeamRole.Admin && token

  const isAccessingAdminRoute = location.pathname.startsWith('/admin')

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (isAccessingAdminRoute && !isAdmin) {
    return <Navigate to={ROUTES.ADMIN.ERROR_403} replace />
  }

  return <Outlet />
}

export default PrivateRoutes
