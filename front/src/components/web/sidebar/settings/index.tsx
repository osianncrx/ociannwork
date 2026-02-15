import { ROUTES } from '../../../../constants'
import { SvgIcon } from '../../../../shared/icons'
import { useAppSelector } from '../../../../store/hooks'
import DoNotDisturb from './DoNotDisturb'
import EditProfile from './EditProfile'
import InviteTeam from './InviteTeam'
import LogoutFromAllDevices from './LogoutFromAllDevices'
import Shortcuts from './Shortcuts'
import SignOut from './SignOut'
import ThemeMode from './ThemeMode'

const Settings = () => {
  const { isTeamAdmin } = useAppSelector((store) => store.team)

  const redirectToTeamAdmin = () => {
    window.open(ROUTES.ADMIN.PROFILE, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="setting-list">
      <h6>Settings</h6>
      <ul className="chat-list">
        {isTeamAdmin && (
          <li className="chat-item" onClick={redirectToTeamAdmin}>
            <SvgIcon className="common-svg-hw" iconId="administration" />
            Team Administration
          </li>
        )}
        <EditProfile />
        <ThemeMode />
        <DoNotDisturb />
        <InviteTeam />
        <Shortcuts />
        <li className="chat-item">
          <SvgIcon className="common-svg-hw version" iconId="version" />
          Version
          <span className="d-flex justify-content-end flex-grow-1 text-secondary me-1">1.0.0</span>
        </li>
        <SignOut />
        <LogoutFromAllDevices />
      </ul>
    </div>
  )
}

export default Settings
