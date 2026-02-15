import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { STORAGE_KEYS } from '../../../../constants'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import { getStorage } from '../../../../utils'
import AuthWrapper from '../../widgets/AuthWrapper'
import DiscoverTeamForm from './DiscoverTeamForm'

const DiscoverTeam = () => {
  const { t } = useTranslation()
  const storage = getStorage()
  const isAddingTeam = storage.getItem(STORAGE_KEYS.ADDING_TEAM)
  const dispatch = useAppDispatch()
  
  useEffect(() => {
    if (isAddingTeam) {
      storage.removeItem(STORAGE_KEYS.SELECTED_CHAT)
    }
  }, [])

  return (
    <AuthWrapper bg="discover-team">
      <div className="content-title">
        <h1>{t('discover_teams')}</h1>
      </div>
      <p>{t('look_for_existing_teams_you_can_join')}</p>
      <DiscoverTeamForm />
      <span className="text-center w-100 common-flex custom-subtitle flex-wrap bottom-footer">
        {t('looking_for_a_fresh_start')}
        <div className="link-text ms-1" onClick={() => dispatch(setScreen('email'))}>
          {t('begin_now')}
        </div>
      </span>
    </AuthWrapper>
  )
}

export default DiscoverTeam
