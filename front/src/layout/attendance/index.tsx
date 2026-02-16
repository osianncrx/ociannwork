import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AttendanceSidebar from './AttendanceSidebar'
import AttendanceHeader from './AttendanceHeader'
import './attendance.scss'

const AttendanceLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="attendance-wrapper">
      <AttendanceSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`attendance-overlay ${sidebarOpen ? 'attendance-overlay--visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      <div className="attendance-main">
        <AttendanceHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <div className="attendance-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AttendanceLayout
