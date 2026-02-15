import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Col } from 'reactstrap'
import { queries } from '../../../../api'
import CardWrapper from '../../../../shared/card/CardWrapper'
import { Team } from '../../../../types'
import { getInitials } from '../../../../utils'

const UserTeams = () => {
  const { data, refetch } = queries.useGetTeamList()
  const { t } = useTranslation()
  useEffect(() => {
    refetch()
  }, [])
  return (
    <Col xl="12">
      <CardWrapper
      cardClassName="custom-team"
        className="custom-according"
        heading={{ 
          title: 'my_teams', 
          subtitle: `this_account_is_connected_to_teams`,
        }}
      >
        <ul className={`team-group custom-scrollbar margin-b-19`}>
          {data?.teams.map((team: Team) => {
            return (
              <li className="team-data team-btn" key={team.id}>
                <div className="team-des">
                  <div className="user-info">
                    <span>{getInitials(team.name)}</span>
                  </div>
                  <div className="user-data">
                    <h5>{team.name}</h5>
                    <span className="divider-text">
                      {team.memberCount} {team.memberCount > 1 ? t('members') : t('member')}
                    </span> 
                  </div> 
                </div>
              </li>
            )
          })}
        </ul>
      </CardWrapper>
    </Col>
  )
}

export default UserTeams
