import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'reactstrap'
import { queries } from '../../../../api'
import { SvgIcon } from '../../../../shared/icons'
import { Hint } from '../../../../shared/tooltip'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import { setTeam, setTeamRole } from '../../../../store/slices/teamSlice'
import { Team } from '../../../../types'
import { getInitials } from '../../../../utils'
import { safeJsonParse } from '../../../web/utils/custom-functions'
import { UserTeamStatus } from '../../../../constants'

const WelcomeTeamForm = () => {
  const dispatch = useAppDispatch()
  const { data: teamList, refetch: fetchTeams } = queries.useGetTeamList()
  const { t } = useTranslation()

  const handleOpenTeam = (team: Team) => {
    const customFields = team.teamCustomField ? Object.keys(safeJsonParse(team.teamCustomField)).length : 0
    const customFieldsLength = team?.fields?.length
    dispatch(setTeam(team))
    dispatch(setTeamRole(team?.role))
    if (customFields === customFieldsLength || !team?.fields?.length) {
      dispatch(setScreen('webScreen'))
    } else {
      dispatch(setScreen('customFields'))
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  return (
    <div className="teams-scrollable custom-scrollbar">
      {teamList?.teams.map((team: Team) => (
        <div className="team-data team-records" key={team.id}>
          <div className="team-des">
            <div className="user-info">
              <span>{getInitials(team.name)}</span>
            </div>
            <div className="user-data">
              <h5>{team.name}</h5>
            </div>
          </div>
          {team.status == UserTeamStatus.Deactivated ? (
            <Hint label="Your account has been deactivated">
              <div className="team-link-text lock-btn gap-2 flex-between">
                <SvgIcon className="base-svg-hw" iconId="lock" />
              </div>
            </Hint>
          ) : team.status == UserTeamStatus.Pending ? (
            <Hint label="Team admin haven't accepted your invitation">
              <div className="team-link-text lock-btn gap-2 flex-between">
                <SvgIcon className="base-svg-hw" iconId="reminder" />
              </div>
            </Hint>
          ) : (
            <Button
              color='unset'
              className="team-link-text btn-outline-primary gap-1 flex-between"
              disabled={team.status == UserTeamStatus.Deactivated}
              onClick={() => handleOpenTeam(team)}
            >
              <span className="d-sm-inline-block d-none">{t('open')}</span>
              <SvgIcon className="base-svg-hw" iconId="left-arrow" />
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

export default WelcomeTeamForm
