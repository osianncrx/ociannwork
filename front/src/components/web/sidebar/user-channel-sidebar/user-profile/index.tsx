import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap'
import { mutations, queries } from '../../../../../api'
import { STORAGE_KEYS, UserTeamStatus } from '../../../../../constants'
import { SvgIcon } from '../../../../../shared/icons'
import ChatAvatar from '../../../../../shared/image/ChatAvatar'
import { ConfirmModal } from '../../../../../shared/modal'
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks'
import { setSidebarToggle, setToolSidebarToggle } from '../../../../../store/slices/admin/layoutSlice'
import { logout } from '../../../../../store/slices/authSlice'
import { setTeam } from '../../../../../store/slices/teamSlice'
import { Team } from '../../../../../types'
import { getStorage } from '../../../../../utils'

const UserProfile = () => {
  const { user } = useAppSelector((store) => store.auth)
  const { userTeamData, team } = useAppSelector((store) => store.team)
  const { toolSidebarToggle } = useAppSelector((store) => store.admin_layout)
  const { mutate: leaveTeam } = mutations.useLeaveTeam()
  const { data, refetch } = queries.useGetTeamList()
  const { t } = useTranslation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')

  const dispatch = useAppDispatch()
  const storage = getStorage()

  const confirmLeaveTeam = () => {
    leaveTeam(
      { user_id: user.id, team_id: selectedTeamId },
      {
        onSuccess: async () => {
          const { data: updatedData } = await refetch()
          const activeTeams = updatedData?.teams?.filter((team: any) => team.status === UserTeamStatus.Active) || []
          if (activeTeams.length > 0) {
            dispatch(setTeam(activeTeams[0]))
            window.location.reload()
            return
          }
          dispatch(logout())
          setConfirmLeaveOpen(false)
        },
      },
    )
  }

  useEffect(() => {
    refetch()
  }, [refetch])

  const toggle = () => setDropdownOpen((prev) => !prev)

  const handleLeaveTeam = (id: string | number) => {
    setSelectedTeamId(String(id))
    setConfirmLeaveOpen(true)
  }
  const onToolSidebarToggle = () => {
    dispatch(setToolSidebarToggle(!toolSidebarToggle))
  }
  const switchTeam = (team: Team) => {
    dispatch(setTeam(team))
    storage.removeItem(STORAGE_KEYS.SELECTED_CHAT)
    window.location.reload()
  }

  return (
    <>
      <div className="user-profile-dropdown">
        <div className="user-profile-header">
          <div className="user-info">
            <div className="d-md-none d-block" onClick={onToolSidebarToggle}>
              <SvgIcon iconId="logo-messenger" className="menu-icon" />
            </div>
            <div className="position-relative d-md-block d-none">
              <div className="my-profile">
                <div className="position-relative d-md-block d-none">
                  <ChatAvatar data={user} name={user} customClass="avatar" />
                  <span className="status-dot online" />
                </div>
              </div>
            </div>
            <Dropdown isOpen={dropdownOpen} toggle={toggle} className="text-group">
              <DropdownToggle tag="div">
                <div className="name">
                  {user?.name}
                  <SvgIcon iconId="drop-down-menu" className="dropdown-icon" />
                </div>
              </DropdownToggle>
              <DropdownMenu className="team-dropdown">
                <span className="team-divider">Current Team: </span>
                <div className="profile-info">
                  <ChatAvatar data={team} name={team} customClass="avatar" />
                  <div className="name">{team?.name}</div>
                </div>
                <span className="team-divider">All Teams: </span>
                {data?.teams?.map((team: Team) => (
                  <DropdownItem
                    key={team.id}
                    className={`team-data team-btn ${team?.id == userTeamData?.team_id ? 'active' : ''}`}
                    onClick={
                      team.id !== userTeamData?.team_id && team.status == UserTeamStatus.Active
                        ? () => switchTeam(team)
                        : undefined
                    }
                  >
                    <div className="team-des">
                      <ChatAvatar data={team} name={team} customClass="avatar" />
                      <div className="user-data">
                        <h5>{team.name}</h5>
                        <span className="divider-text">
                          {team.memberCount} {team.memberCount > 1 ? t('members') : t('member')}
                        </span>
                      </div>
                      {team.status == UserTeamStatus.Active && (
                        <SvgIcon
                          iconId="log-out"
                          className="common-svg-hw log-out"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLeaveTeam(team.id)
                          }}
                        />
                      )}
                      {team.status == UserTeamStatus.Pending && (
                        <div className="team-link-text lock-btn gap-2 flex-between">
                          <SvgIcon className="common-svg-hw reminderid" iconId="reminder" />
                        </div>
                      )}
                      {team.status == UserTeamStatus.Deactivated && (
                        <div className="team-link-text lock-btn gap-2 flex-between">
                          <SvgIcon className="common-svg-hw lockid" iconId="lock" />
                        </div>
                      )}
                    </div>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
          <button className="close-btn-icon btn d-md-none d-flex" onClick={() => dispatch(setSidebarToggle(false))}>
            <SvgIcon iconId="close-btn-icon" />
          </button>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmLeaveOpen}
        onClose={() => setConfirmLeaveOpen(false)}
        onConfirm={confirmLeaveTeam}
        title="Leave Team"
        subtitle={`Are you sure you want to leave this team?`}
        confirmText="Leave Team"
        cancelText="Cancel"
        variant="danger"
        showIcon={true}
        iconId="login"
      />
    </>
  )
}

export default UserProfile
