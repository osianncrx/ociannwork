import { lazy, Suspense } from 'react'
import CallManager from '../../components/web/call'
import ChatSection from '../../components/web/chat'
import { useAwayDetector } from '../../components/web/chat/hooks'
import ImpersonationBanner from '../../components/web/impersonation/ImpersonationBanner'
import ChatSidebar from '../../components/web/sidebar'
import VirtualOffice from '../../components/web/virtual-office'
import { useAppSelector } from '../../store/hooks'
import NotificationProvider from './components/NotificationProvider'
import { useNotifications } from './hooks/useNotifications'
import { useSocketHandlers } from './hooks/useSocketHandlers'

const AttendanceMain = lazy(() => import('../../components/web/attendance'))

const WebLayout = () => {
  const { user } = useAppSelector((store) => store.auth)
  const { currentTab } = useAppSelector((store) => store.screen)

  useAwayDetector(user?.id ?? null)
  useSocketHandlers()
  useNotifications()

  const renderMainContent = () => {
    switch (currentTab) {
      case 'virtual-office':
        return <VirtualOffice />
      case 'attendance':
        return (
          <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="loader-main-chat" /></div>}>
            <AttendanceMain />
          </Suspense>
        )
      default:
        return <ChatSection />
    }
  }

  return (
    <NotificationProvider>
      <ImpersonationBanner />
      <div className="sidebar-active main-page">
        <div className="messenger-box sidebar-toggle">
          <ChatSidebar />
          {renderMainContent()}
        </div>
        <CallManager />
      </div>
    </NotificationProvider>
  )
}

export default WebLayout
