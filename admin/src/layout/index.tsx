import { Outlet } from 'react-router-dom'
import Footer from './footer'
import Header from './header'
import Sidebar from './sidebar'
import { useAppSelector } from '../store/hooks'

const Layout = () => {
  const { isImpersonating } = useAppSelector((store) => store.auth)

  return (
    <div className="page-wrapper compact-wrapper">
      <div style={{ paddingTop: isImpersonating ? '40px' : '0' }}>
        <Header />
        <div className="page-body-wrapper">
          <Sidebar />
          <div className="page-body">
            <Outlet />
          </div>
          <Footer />
        </div>
      </div>
    </div>
  )
}

export default Layout
