import { Outlet } from 'react-router-dom'
import Footer from './footer'
import Header from './header'
import Sidebar from './sidebar'
import PageLoader from './loader/PageLoader'

const AdminLayout = () => {
  return (
    <div className="page-wrapper compact-wrapper">
      <Header />
      <div className="page-body-wrapper">
        <Sidebar />
        <div className="page-body">
          <PageLoader>
            <Outlet />
          </PageLoader>
        </div>
        <Footer />
      </div>
    </div>
  )
}

export default AdminLayout
