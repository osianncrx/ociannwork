import { useState } from 'react'
import { useAppSelector } from '../../../store/hooks'
import AttendanceDashboard from './AttendanceDashboard'
import AttendanceSubPage from './AttendanceSubPage'
import './attendance-integrated.scss'

export type AttendancePage =
  | 'dashboard'
  | 'employee-status'
  | 'employee-status-date'
  | 'accept-marks'
  | 'accept-overtime'
  | 'request-overtime'
  | 'view-overtime'
  | 'my-report'
  | 'admin-report'
  | 'manage-users'
  | 'manage-projects'
  | 'super-admin'
  | 'bank-accounts'

const AttendanceMain = () => {
  const [activePage, setActivePage] = useState<AttendancePage>('dashboard')
  const { sidebarToggle } = useAppSelector((store) => store.admin_layout)

  return (
    <div className={`att-integrated ${!sidebarToggle ? 'att-integrated--full' : ''}`}>
      {activePage === 'dashboard' ? (
        <AttendanceDashboard onNavigate={setActivePage} />
      ) : (
        <AttendanceSubPage page={activePage} onBack={() => setActivePage('dashboard')} />
      )}
    </div>
  )
}

export default AttendanceMain
