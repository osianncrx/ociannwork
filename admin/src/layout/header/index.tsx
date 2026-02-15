import { Row } from 'reactstrap'
import SvgIcon from '../../shared/icons/SvgIcon'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { toggleSidebar } from '../../store/slices/layoutSlice'
import DarkLight from './DarkLight'
import FullScreen from './FullScreen'
import UserProfile from './UserProfile'

const Header = () => {
  const { isSidebarOpen } = useAppSelector((store) => store.layout)
  const dispatch = useAppDispatch()

  return (
    <div className={`page-header ${isSidebarOpen ? 'close_icon' : ''}`}>
      <Row className="header-wrapper m-0">
        <div className="nav-right">
          <div className="toggle-sidebar">
            <SvgIcon iconId="burger-menu" className='responsive-toggle'  onClick={() => dispatch(toggleSidebar())} />
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
