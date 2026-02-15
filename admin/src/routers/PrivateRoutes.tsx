import { Navigate, Outlet } from 'react-router-dom'
import { ROUTES } from '../constants'
import { useAppSelector } from '../store/hooks'

export const PrivateRoutes = () => {
  const { isAuthenticated } = useAppSelector((store) => store.auth)
  return isAuthenticated ? <Outlet /> : <Navigate to={ROUTES.LOGIN} replace />
}

export default PrivateRoutes
