import { Fragment, useState } from 'react'
import SimpleBar from 'simplebar-react'
import LogoWrapper from './LogoWrapper'
import SubMenu from './SidebarMenu'
import { useAppSelector } from '../../../store/hooks'
import { menuList } from '../../../data'
import { MenuItem } from '../../../types'

const Sidebar = () => {
  const [activeMenu, setActiveMenu] = useState<MenuItem[]>([])
  const { isSidebarOpen } = useAppSelector((store) => store.admin_layout)
  return (
    <div className={`sidebar-wrapper ${isSidebarOpen ? 'close_icon' : ''}`}>
      <LogoWrapper />
      <nav className="sidebar-main">
        <div className="left-arrow" id="left-arrow">
          <i data-feather="arrow-left"></i>
        </div>
        <div id="sidebar-menu">
          <ul className="sidebar-links custom-scrollbar" id="simple-bar">
            <SimpleBar>
              {menuList?.map((mainMenu, index) => (
                <Fragment key={index}>
                  <li className={`sidebar-main-title `}>
                    <div>
                      <h6>{mainMenu.title}</h6>
                    </div>
                  </li>
                  <SubMenu menu={mainMenu.menu} activeMenu={activeMenu} setActiveMenu={setActiveMenu} level={0} />
                </Fragment>
              ))}
            </SimpleBar>
          </ul>
        </div>
      </nav>
    </div>
  )
}

export default Sidebar
