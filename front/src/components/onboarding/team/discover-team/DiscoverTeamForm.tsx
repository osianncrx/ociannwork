import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mutations, queries } from '../../../../api'
import { Href, STORAGE_KEYS, UserTeamStatus } from '../../../../constants'
import { SolidButton } from '../../../../shared/button'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import { FindTeamResponse, Team } from '../../../../types'
import { getInitials, getStorage } from '../../../../utils'
import { toaster } from '../../../../utils/custom-functions'
import { useDebounce } from '../../../../utils/hooks'
import { keepPreviousData } from '@tanstack/react-query'

const DiscoverTeamForm = () => {
  const dispatch = useAppDispatch()
  const storage = getStorage()
  const { t } = useTranslation()
  const checkEmail = storage.getItem(STORAGE_KEYS.CHECK_EMAIL)
  const [searchValue, setSearchValue] = useState('')
  const debouncedSearchTerm = useDebounce(searchValue, 300)
  const [findTeamData, setFindTeamData] = useState<FindTeamResponse | null>(null)
  const [loadingTeamId, setLoadingTeamId] = useState<number | null>(null)

  const showProfileScreen = storage.getItem(STORAGE_KEYS.ADDING_TEAM)

  // Team data
  const { mutate: joinTeam } = mutations.useJoinTeam()
  const { data: findTeam, refetch } = queries.useGetFindTeam(
    { term: debouncedSearchTerm, email: checkEmail },
    { enabled: !!debouncedSearchTerm && !!checkEmail, placeholderData: keepPreviousData },
  )

  const getButtonProps = (status: string) => ({
    label: status === UserTeamStatus.Joined ? 'Joined' : status === UserTeamStatus.Requested ? 'Requested' : 'Join',
    className:
      status === UserTeamStatus.Requested || status === UserTeamStatus.Joined
        ? 'btn btn-primary'
        : 'btn btn-outline-primary',
    disabled: status === UserTeamStatus.Requested,
  })

  const handleJoinTeam = (teamId: number, status: string) => {
    if (status === UserTeamStatus.Requested) return
    if (status === UserTeamStatus.Joined) return dispatch(setScreen('welcome'))
    setLoadingTeamId(teamId)

    joinTeam(
      { email: checkEmail, team_id: teamId },
      {
        onSuccess: async (res) => {
          if (showProfileScreen || res.isProfileUpdated) {
            dispatch(setScreen('welcome'))
          } else {
            setTimeout(() => dispatch(setScreen('setupProfile')), 700)
          }
          await refetch()
          setLoadingTeamId(null)
        },
        onError: (error: any) => toaster('error', error?.message),
      },
    )
  }

  useEffect(() => {
    if (findTeam) {
      setFindTeamData(findTeam)
    }
  }, [findTeam])

  return (
    <div className="login-form">
      <div className="login-input search-input margin-b-19">
        <SvgIcon className="form-icon base-svg-hw" iconId="search-bar" />
        <input
          autoFocus
          type="text"
          value={searchValue}
          onChange={(e) => {
            e.preventDefault()
            setSearchValue(e.target.value)
          }}
          placeholder={t('search_by_team_name')}
          className="form-control"
        />
      </div>

      {debouncedSearchTerm && findTeamData?.teams?.length === 0 ? (
        <div className="loading margin-b-30">
          <SvgIcon iconId="No-data-found" className="not-found-hw" />
          <span className="divider-text d-block mt-3">{t('matches_not_found')}</span>
        </div>
      ) : debouncedSearchTerm && findTeamData?.teams?.length ? (
        <ul
          className={`team-group custom-scrollbar margin-b-19 ${findTeamData?.teams?.length === 1 ? 'single-item' : ''}`}
        >
          {findTeamData.teams.map((team: Team) => {
            const { label, className, disabled } = getButtonProps(team.status)
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
                <SolidButton
                  loading={loadingTeamId === team.id}
                  onClick={() => handleJoinTeam(team.id, team.status)}
                  className={className}
                  disabled={disabled}
                >
                  {label}
                </SolidButton>
              </li>
            )
          })}
        </ul>
      ) : null}

      <span className="text-center">{t('or')}</span>

      <div className="text-center team-builder">
        <a
          href={Href}
          onClick={(e) => {
            e.preventDefault()
            dispatch(setScreen('createTeam'))
          }}
        >
          {t('create_your_team')}
        </a>
      </div>
    </div>
  )
}

export default DiscoverTeamForm
