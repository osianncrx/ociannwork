import { NavLink, useLocation } from 'react-router-dom'
import { ROUTES } from '../../constants'
import { useAppSelector } from '../../store/hooks'
import {
  FiClock, FiUsers, FiCalendar, FiCheckSquare, FiPlusCircle,
  FiEye, FiFileText, FiBarChart2, FiSettings, FiBriefcase,
  FiCreditCard, FiShield
} from 'react-icons/fi'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  minRole?: number
  superOnly?: boolean
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Principal',
    items: [
      { path: ROUTES.ATTENDANCE.HOME, label: 'Registro de Marcas', icon: <FiClock /> },
    ],
  },
  {
    title: 'Monitoreo',
    items: [
      { path: ROUTES.ATTENDANCE.EMPLOYEE_STATUS, label: 'Estado Empleados', icon: <FiUsers />, minRole: 1 },
      { path: ROUTES.ATTENDANCE.EMPLOYEE_STATUS_DATE, label: 'Estado por Fecha', icon: <FiCalendar />, minRole: 1 },
    ],
  },
  {
    title: 'Aprobaciones',
    items: [
      { path: ROUTES.ATTENDANCE.ACCEPT_MARKS, label: 'Aceptar Marcas', icon: <FiCheckSquare />, minRole: 1 },
      { path: ROUTES.ATTENDANCE.ACCEPT_OVERTIME, label: 'Aceptar Extras', icon: <FiCheckSquare />, minRole: 1 },
    ],
  },
  {
    title: 'Horas Extras',
    items: [
      { path: ROUTES.ATTENDANCE.REQUEST_OVERTIME, label: 'Solicitar Extras', icon: <FiPlusCircle /> },
      { path: ROUTES.ATTENDANCE.VIEW_OVERTIME, label: 'Ver Mis Extras', icon: <FiEye /> },
    ],
  },
  {
    title: 'Reportes',
    items: [
      { path: ROUTES.ATTENDANCE.MY_REPORT, label: 'Mi Reporte', icon: <FiFileText /> },
      { path: ROUTES.ATTENDANCE.ADMIN_REPORT, label: 'Reporte General', icon: <FiBarChart2 />, minRole: 1 },
    ],
  },
  {
    title: 'Administracion',
    items: [
      { path: ROUTES.ATTENDANCE.MANAGE_USERS, label: 'Gestion Usuarios', icon: <FiSettings />, minRole: 1 },
      { path: ROUTES.ATTENDANCE.MANAGE_PROJECTS, label: 'Gestion Proyectos', icon: <FiBriefcase />, minRole: 1 },
      { path: ROUTES.ATTENDANCE.BANK_ACCOUNTS, label: 'Cuentas Bancarias', icon: <FiCreditCard /> },
      { path: ROUTES.ATTENDANCE.SUPER_ADMIN, label: 'Super Admin', icon: <FiShield />, superOnly: true },
    ],
  },
]

const AttendanceSidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation()
  const user = useAppSelector((state) => state.auth.user)
  const userRole = (user as Record<string, unknown>)?.tipo_permiso_marcas as number ?? 0
  const isSuperAdmin = (user as Record<string, unknown>)?.es_super_admin_marcas as boolean ?? false

  const canAccess = (item: NavItem) => {
    if (item.superOnly && !isSuperAdmin) return false
    if (item.minRole !== undefined && userRole < item.minRole && !isSuperAdmin) return false
    return true
  }

  return (
    <aside className={`attendance-sidebar ${isOpen ? 'attendance-sidebar--open' : ''}`}>
      <div className="attendance-sidebar__brand">
        <div>
          <h2>Marcas</h2>
          <span>OCIANN</span>
        </div>
      </div>

      <nav className="attendance-sidebar__nav">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(canAccess)
          if (visibleItems.length === 0) return null

          return (
            <div key={section.title} className="attendance-sidebar__section">
              <div className="attendance-sidebar__section-title">{section.title}</div>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === ROUTES.ATTENDANCE.HOME}
                  className={() =>
                    `attendance-sidebar__link ${
                      (item.path === ROUTES.ATTENDANCE.HOME
                        ? location.pathname === item.path
                        : location.pathname.startsWith(item.path))
                        ? 'attendance-sidebar__link--active'
                        : ''
                    }`
                  }
                  onClick={onClose}
                >
                  <span className="attendance-sidebar__link-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      <div className="attendance-sidebar__footer">
        OciannWork &copy; {new Date().getFullYear()}
      </div>
    </aside>
  )
}

export default AttendanceSidebar
