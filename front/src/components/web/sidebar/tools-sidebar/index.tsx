import { useEffect } from 'react'
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setCurrentTab } from '../../../../store/slices/screenSlice'
import { setSearchModal } from '../../../../store/slices/shortCutKeySlice'
import SearchModal from '../search-modal'
import AppLogo from './AppLogo'
import { setSidebarToggle, setToolSidebarToggle } from '../../../../store/slices/admin/layoutSlice'
import { useHotkeys } from 'react-hotkeys-hook'

const ToolSidebar = () => {
  const { currentTab } = useAppSelector((state) => state.screen)
  const { searchModal } = useAppSelector((state) => state.shortCutKey)
  const { toolSidebarToggle } = useAppSelector((store) => store.admin_layout)
  const location = useLocation()
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const menuItems = [
    { icon: 'home', label: 'Oficina', key: 'virtual-office' },
    { icon: 'group-chat', label: 'Chat', key: 'home' },
    { icon: 'search-sidebar', label: 'Buscar', key: 'Search', actions: () => dispatch(setSearchModal()) },
    { icon: 'folder-open', label: 'Archivos', key: 'files' },
    { icon: 'reminder', label: 'Recordatorios', key: 'reminder' },
    { icon: 'magic-star', label: 'Favoritos', key: 'favorite' },
    { icon: 'pin', label: 'Fijados', key: 'pin' },
    { icon: 'directory', label: 'Directorio', key: 'directory' },
    { icon: 'video', label: 'Grabaciones', key: 'recordings' },
    { icon: 'sidebar-setting', label: 'Configuración', key: 'settings' },
    { icon: 'clock', label: 'Marcas', key: 'attendance', emoji: '⏰' },
  ]
  const faqItem = { icon: 'confirmation', label: 'Ayuda', key: 'help' }

  useEffect(() => {
    if (location.pathname === '/help') {
      return
    }

    const tabFromUrl = searchParams.get('tab')
    const validTabs = menuItems.map((item) => item.key)

    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      if (currentTab !== tabFromUrl) {
        dispatch(setCurrentTab(tabFromUrl))
      }
    } else {
      // No tab or invalid tab: default to virtual-office
      if (currentTab !== 'virtual-office') {
        dispatch(setCurrentTab('virtual-office'))
      }
      navigate(`?tab=virtual-office`, { replace: true })
    }
  }, [searchParams, dispatch, navigate, currentTab, location.pathname])

  useHotkeys(
    'ctrl+d',
    (event) => {
      event.preventDefault()
      dispatch(setCurrentTab('directory'))
      navigate(`?tab=directory`, { replace: true })
    },
    {
      enableOnFormTags: true,
      preventDefault: true,
    },
  )

  const handleClick = (item: any, e: React.MouseEvent) => {
    if (item.actions) {
      e.preventDefault()
      item.actions()
    } else if (item.key === 'help') {
      // Let the NavLink handle navigation for help (external route)
    } else {
      e.preventDefault()
      navigate(`?tab=${item.key}`, { replace: true })
      dispatch(setCurrentTab(item.key))
    }
    const width = window.innerWidth
    if (width <= 767) {
      dispatch(setToolSidebarToggle(false))
      dispatch(setSidebarToggle(true))
    }
  }

  const isHelpPage = location.pathname === '/help'

  return (
    <>
      <nav
        className={`main-navigation custom-scrollbar on ${!toolSidebarToggle ? 'close-nav-toggle' : 'open-nav-toggle'}`}
      >
        <AppLogo />
        <div className="main-sidebar">
          <ul className="top-sidebar">
            {menuItems.map((item) => (
              <li key={item.key}>
                <NavLink
                  to={`?tab=${item.key}`}
                  className={() => {
                    const urlTab = searchParams.get('tab') || 'home'
                    return `header-action-icon ${urlTab === item.key ? 'active' : ''}`
                  }}
                  onClick={(e) => handleClick(item, e)}
                >
                  <div className="header-symbol btn-effect">
                    {(item as any).emoji ? (
                      <span style={{ fontSize: '1.2rem' }}>{(item as any).emoji}</span>
                    ) : (
                      <SvgIcon iconId={item.icon} />
                    )}
                  </div>
                  <span className="text-title">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <ul className='more-info-sidebar'>
            <li>
              <NavLink
                to="/help"
                target="_blank"
                rel="noopener,noreferrer"
                className={`header-action-icon ${isHelpPage ? 'active' : ''}`}
                onClick={(e) => handleClick(faqItem, e)}
              >
                <div className="header-symbol btn-effect">
                  <SvgIcon iconId={faqItem.icon} className="" />
                </div>
                <span className="text-title">{faqItem.label}</span>
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
      <SearchModal searchModal={searchModal} />
    </>
  )
}

export default ToolSidebar
