import { Link } from 'react-router-dom'
import { ROUTES } from '../../../constants'
import SvgIcon from '../../../shared/icons/SvgIcon'
import { Image } from '../../../shared/image'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { toggleSidebar } from '../../../store/slices/admin/layoutSlice'

const LogoWrapper = () => {
  const dispatch = useAppDispatch()
  const { logo_light_url, logo_dark_url } = useAppSelector((state) => state.setting)
  const { mixBackgroundLayout } = useAppSelector((store) => store.theme)

  return (
    <div className="logo-wrapper">
      <Link to={ROUTES.ADMIN.DASHBOARD} className="text-decoration-none">
        {logo_light_url ? (
          <Image src={mixBackgroundLayout == 'light' ? logo_light_url : logo_dark_url} alt="OciannWork" height={35} />
        ) : (
          <Image src="/logo/ociannwork-logo.png" alt="OciannWork" height={35} />
        )}
      </Link>
      <div className="toggle-sidebar" onClick={() => dispatch(toggleSidebar())}>
        <div className="sidebar-toggle">
          <SvgIcon className="Category" iconId="Category" />
        </div>
      </div>
    </div>
  )
}

export default LogoWrapper
