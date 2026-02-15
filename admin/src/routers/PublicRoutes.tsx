import { Navigate, Outlet } from 'react-router-dom'
import { ROUTES } from '../constants'
import { useAppSelector } from '../store/hooks'

export const PublicRoutes = () => {
  const { isAuthenticated } = useAppSelector((store) => store.auth)
  return isAuthenticated ? <Navigate to={ROUTES.HOME} replace /> : <Outlet />
}

export default PublicRoutes
