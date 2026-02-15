import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { setCurrentTab } from '../../../store/slices/screenSlice'
import Directory from './directory'
import Favorite from './favorite'
import Files from './files'
import Pin from './pin'
import Recordings from './recordings'
import Reminders from './reminders'
import Settings from './settings'
import ToolSidebar from './tools-sidebar'
import UserChannelSidebar from './user-channel-sidebar'
import UserProfile from './user-channel-sidebar/user-profile'

const ChatSidebar = () => {
  const { currentTab } = useAppSelector((state) => state.screen)
  const { sidebarToggle } = useAppSelector((store) => store.admin_layout)
  const [searchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const [isTabChanging, setIsTabChanging] = useState(false)
  const [previousTab, setPreviousTab] = useState(currentTab)

  const tabConfig: { [key: string]: { label: string; icon: string } } = {
    home: { label: 'Home', icon: 'home' },
    reminder: { label: 'Reminder', icon: 'reminder' },
    directory: { label: 'Directory', icon: 'directory' },
    activity: { label: 'Activity', icon: 'notification-bing' },
    folders: { label: 'Folder', icon: 'folder-open' },
    notes: { label: 'Notes', icon: 'Notes' },
    favorite: { label: 'Favorite', icon: 'magic-star' },
    todo: { label: 'To-do', icon: 'todo' },
    files: { label: 'Files', icon: 'folder-open' },
    pin: { label: 'Pin', icon: 'pin' },
    recordings: { label: 'Recordings', icon: 'video' },
    setting: { label: 'Setting', icon: 'sidebar-setting' },
  }

  // Sync Redux state with URL on component mount and URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'home'
    const validTabs = Object.keys(tabConfig)

    if (validTabs.includes(tabFromUrl) && currentTab !== tabFromUrl) {
      // Show loader when tab is changing
      setIsTabChanging(true)
      setPreviousTab(currentTab)

      dispatch(setCurrentTab(tabFromUrl))

      // Hide loader after a short delay to allow component to mount
      setTimeout(() => {
        setIsTabChanging(false)
      }, 300) 
    }
  }, [searchParams, dispatch, currentTab])

  // Reset loading state when currentTab actually changes
  useEffect(() => {
    if (currentTab !== previousTab) {
      setPreviousTab(currentTab)
      // Give a bit more time for data-heavy components
      const timeout = ['pin', 'favorite', 'files', 'directory'].includes(currentTab) ? 500 : 300
      setTimeout(() => {
        setIsTabChanging(false)
      }, timeout)
    }
  }, [currentTab, previousTab])

  const currentTabConfig = tabConfig[currentTab] || { label: 'Home', icon: 'home' }

  const renderActiveComponent = () => {
    // Show loader during tab transition
    if (isTabChanging) {
      return (
        <div className="custom-loader-chat">
          <span className="loader-main-chat"></span>
        </div>
      )
    }

    switch (currentTab) {
      case 'home':
        return <UserChannelSidebar />
      case 'reminder':
        return <Reminders />
      case 'directory':
        return <Directory />
      case 'files':
        return <Files />
      case 'pin':
        return <Pin />
      case 'favorite':
        return <Favorite />
      case 'settings':
        return <Settings />
      case 'recordings':
        return <Recordings />
      default:
        return <UserChannelSidebar />
    }
  }

  return (
    <>
      <ToolSidebar />
      <aside className={`messenger-left-sidebar`}>
        <div
          className={`recent-default dynemic-sidebar custom-scrollbar ${!sidebarToggle ? 'close-sidebar' : 'open-sidebar'}`}
        >
          <UserProfile />
          {currentTabConfig.label !== 'Home' && <></>}
          {renderActiveComponent()}
        </div>
      </aside>
    </>
  )
}

export default ChatSidebar
