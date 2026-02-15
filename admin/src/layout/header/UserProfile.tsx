import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { queries } from '../../api'
import SvgIcon from '../../shared/icons/SvgIcon'
import { Avatar } from '../../shared/image'
import { useAppDispatch } from '../../store/hooks'
import { logout } from '../../store/slices/authSlice'

const UserProfile = () => {
  const { data } = queries.useGetUserDetails()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  return (
    <li className="profile-nav on-hover-dropdown pe-0 py-0">
      <div className="profile-media">
        <Avatar data={data?.user} name={data?.user} customClass="img-fluid user-img" />
        <div className="user-data">
          <span>{data?.user?.name}</span>
        </div>
      </div>
      <ul className="profile-dropdown onhover-show-div">
        <li onClick={() => navigate('/profile')}>
          <div className="profile-icon">
            <SvgIcon iconId="user-pro" className="common-svg-md" />
          </div>
          <a>{t('account')}</a>
        </li>
        <li onClick={() => dispatch(logout())}>
          <div className="profile-icon">
            <SvgIcon iconId="login" className="common-svg-md" />
          </div>
          <a>{t('logout')}</a>
        </li>
      </ul>
    </li>
  )
}

export default UserProfile
