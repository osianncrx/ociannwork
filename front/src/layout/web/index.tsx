import CallManager from '../../components/web/call'
import ChatSection from '../../components/web/chat'
import { useAwayDetector } from '../../components/web/chat/hooks'
import ImpersonationBanner from '../../components/web/impersonation/ImpersonationBanner'
import ChatSidebar from '../../components/web/sidebar'
import { useAppSelector } from '../../store/hooks'
import NotificationProvider from './components/NotificationProvider'
import { useNotifications } from './hooks/useNotifications'
import { useSocketHandlers } from './hooks/useSocketHandlers'

const WebLayout = () => {
  const { user } = useAppSelector((store) => store.auth)

  useAwayDetector(user?.id ?? null)
  useSocketHandlers()
  useNotifications()

  return (
    <NotificationProvider>
      <ImpersonationBanner />
      <div className="sidebar-active main-page">
        <div className="messenger-box sidebar-toggle">
          <ChatSidebar />
          <ChatSection />
        </div>
        <CallManager />
      </div>
    </NotificationProvider>
  )
}

export default WebLayout
