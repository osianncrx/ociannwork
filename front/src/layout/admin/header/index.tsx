import { Row } from 'reactstrap'
import { useAppSelector } from '../../../store/hooks'
import DarkLight from './DarkLight'
import FullScreen from './FullScreen'
import UserProfile from './UserProfile'
import { SvgIcon } from '../../../shared/icons'
import { useDispatch } from 'react-redux'
import { toggleSidebar } from '../../../store/slices/admin/layoutSlice'

const Header = () => {
  const { isSidebarOpen } = useAppSelector((store) => store.admin_layout)
  const dispatch = useDispatch()

  return (
    <div className={`page-header ${isSidebarOpen ? 'close_icon' : ''}`}>
      <Row className="header-wrapper m-0">
        <div className="nav-right">
          <div className="toggle-sidebar">
            <SvgIcon iconId="burger-menu" className='responsive-toggle' onClick={() => dispatch(toggleSidebar())} />
          </div>
          <ul className="nav-menus">
            <DarkLight />
            <FullScreen />
            <UserProfile />
          </ul>
        </div>
      </Row>
    </div>
  )
}

export default Header
