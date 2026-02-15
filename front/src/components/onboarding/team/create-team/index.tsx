import { useTranslation } from 'react-i18next'
import AuthWrapper from '../../widgets/AuthWrapper'
import CreateTeamForm from './CreateTeamForm'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'

const CreateTeam = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  
  return (
    <AuthWrapper bg="create-team">
      <div className="content-title">
        <h1>{t('create_your_team')}</h1>
      </div>
      <p className="w-80 margin-b-30">{t('create_team_subtitle')}</p>
      <CreateTeamForm />
      <span className="text-center w-100 common-flex custom-subtitle flex-wrap bottom-footer">
        {t('looking_for_a_fresh_start')}
        <div className="link-text ms-1" onClick={() => dispatch(setScreen('email'))}>
          {t('begin_now')}
        </div>
      </span>
    </AuthWrapper>
  )
}

export default CreateTeam
