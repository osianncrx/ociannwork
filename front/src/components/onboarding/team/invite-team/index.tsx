import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import OnboardingWrapper from '../../widgets/OnboardingWrapper'
import InviteTeamForm from './InviteTeamForm'

const InviteTeam = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  return (
    <OnboardingWrapper wrapperClass="invite-user">
      <div className="content-title">
        <h1>{t('invite_your_team')}</h1>
      </div>
      <p className="margin-b-30">{t('invite_team_subtitle')}</p>
      <InviteTeamForm />
      <span className="text-center w-100 common-flex custom-subtitle flex-wrap bottom-footer">
        {t('looking_for_a_fresh_start')}
        <div className="link-text ms-1" onClick={() => dispatch(setScreen('email'))}>
          {t('begin_now')}
        </div>
      </span>
    </OnboardingWrapper>
  )
}

export default InviteTeam
