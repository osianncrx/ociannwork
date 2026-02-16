import { lazy, Suspense } from 'react'
import { RouteObject } from 'react-router-dom'
import { ROUTES } from '../constants'

const RegistroMarcas = lazy(() => import('../components/attendance/RegistroMarcas'))
const EstadoEmpleados = lazy(() => import('../components/attendance/EstadoEmpleados'))
const EstadoPorFecha = lazy(() => import('../components/attendance/EstadoPorFecha'))
const AceptarMarcas = lazy(() => import('../components/attendance/AceptarMarcas'))
const AceptarExtras = lazy(() => import('../components/attendance/AceptarExtras'))
const SolicitarExtras = lazy(() => import('../components/attendance/SolicitarExtras'))
const VerExtras = lazy(() => import('../components/attendance/VerExtras'))
const MiReporte = lazy(() => import('../components/attendance/MiReporte'))
const ReporteAdmin = lazy(() => import('../components/attendance/ReporteAdmin'))
const GestionUsuarios = lazy(() => import('../components/attendance/GestionUsuarios'))
const GestionProyectos = lazy(() => import('../components/attendance/GestionProyectos'))
const PanelSuperAdmin = lazy(() => import('../components/attendance/PanelSuperAdmin'))
const CuentasBancarias = lazy(() => import('../components/attendance/CuentasBancarias'))

const Loader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
    <span className="att-spinner" />
  </div>
)

const wrap = (Component: React.LazyExoticComponent<() => JSX.Element>) => (
  <Suspense fallback={<Loader />}>
    <Component />
  </Suspense>
)

export const AttendanceRoutes: RouteObject[] = [
  { index: true, element: wrap(RegistroMarcas) },
  { path: 'employee-status', element: wrap(EstadoEmpleados) },
  { path: 'employee-status-date', element: wrap(EstadoPorFecha) },
  { path: 'accept-marks', element: wrap(AceptarMarcas) },
  { path: 'accept-overtime', element: wrap(AceptarExtras) },
  { path: 'request-overtime', element: wrap(SolicitarExtras) },
  { path: 'view-overtime', element: wrap(VerExtras) },
  { path: 'my-report', element: wrap(MiReporte) },
  { path: 'admin-report', element: wrap(ReporteAdmin) },
  { path: 'manage-users', element: wrap(GestionUsuarios) },
  { path: 'manage-projects', element: wrap(GestionProyectos) },
  { path: 'super-admin', element: wrap(PanelSuperAdmin) },
  { path: 'bank-accounts', element: wrap(CuentasBancarias) },
]
