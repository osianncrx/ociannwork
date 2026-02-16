import { lazy, Suspense } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import type { AttendancePage } from './index'

const EstadoEmpleados = lazy(() => import('../../attendance/EstadoEmpleados'))
const EstadoPorFecha = lazy(() => import('../../attendance/EstadoPorFecha'))
const AceptarMarcas = lazy(() => import('../../attendance/AceptarMarcas'))
const AceptarExtras = lazy(() => import('../../attendance/AceptarExtras'))
const SolicitarExtras = lazy(() => import('../../attendance/SolicitarExtras'))
const VerExtras = lazy(() => import('../../attendance/VerExtras'))
const MiReporte = lazy(() => import('../../attendance/MiReporte'))
const ReporteAdmin = lazy(() => import('../../attendance/ReporteAdmin'))
const GestionUsuarios = lazy(() => import('../../attendance/GestionUsuarios'))
const GestionProyectos = lazy(() => import('../../attendance/GestionProyectos'))
const PanelSuperAdmin = lazy(() => import('../../attendance/PanelSuperAdmin'))
const CuentasBancarias = lazy(() => import('../../attendance/CuentasBancarias'))

const pageTitles: Record<string, string> = {
  'employee-status': 'Estado de Empleados',
  'employee-status-date': 'Estado por Fecha',
  'accept-marks': 'Aprobar Marcas',
  'accept-overtime': 'Aprobar Horas Extra',
  'request-overtime': 'Solicitar Horas Extra',
  'view-overtime': 'Mis Horas Extra',
  'my-report': 'Mi Reporte',
  'admin-report': 'Reporte General',
  'manage-users': 'Gestión de Usuarios',
  'manage-projects': 'Gestión de Proyectos',
  'super-admin': 'Panel Super Admin',
  'bank-accounts': 'Cuentas Bancarias',
}

const Loader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
    <div className="custom-loader-chat"><span className="loader-main-chat" /></div>
  </div>
)

interface Props {
  page: AttendancePage
  onBack: () => void
}

const AttendanceSubPage = ({ page, onBack }: Props) => {
  const renderPage = () => {
    switch (page) {
      case 'employee-status': return <EstadoEmpleados />
      case 'employee-status-date': return <EstadoPorFecha />
      case 'accept-marks': return <AceptarMarcas />
      case 'accept-overtime': return <AceptarExtras />
      case 'request-overtime': return <SolicitarExtras />
      case 'view-overtime': return <VerExtras />
      case 'my-report': return <MiReporte />
      case 'admin-report': return <ReporteAdmin />
      case 'manage-users': return <GestionUsuarios />
      case 'manage-projects': return <GestionProyectos />
      case 'super-admin': return <PanelSuperAdmin />
      case 'bank-accounts': return <CuentasBancarias />
      default: return null
    }
  }

  return (
    <div className="att-subpage">
      <div className="att-subpage__header">
        <button className="att-subpage__back" onClick={onBack}>
          <FiArrowLeft size={18} />
          <span>Volver</span>
        </button>
        <h2 className="att-subpage__title">{pageTitles[page] || 'Marcas'}</h2>
      </div>
      <div className="att-subpage__content">
        <Suspense fallback={<Loader />}>
          {renderPage()}
        </Suspense>
      </div>
    </div>
  )
}

export default AttendanceSubPage
