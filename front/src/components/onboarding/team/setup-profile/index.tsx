import { useTranslation } from 'react-i18next'
import AuthWrapper from '../../widgets/AuthWrapper'
import SetupProfileForm from './SetupProfileForm'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'

const SetupProfile = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  return (
    <AuthWrapper bg="set-your-profile">
      <div className="content-title">
        <h1>{t('set_up_your_profile')}</h1>
      </div>
      <p>{t('profile_setup_subtitle')}</p>
      <SetupProfileForm />
      <span className="text-center w-100  custom-subtitle bottom-footer">
        {t('looking_for_a_fresh_start')}
        <div className="link-text ms-1" onClick={() => dispatch(setScreen('email'))}>
          {t('begin_now')}
        </div>
      </span>
    </AuthWrapper>
  )
}
export default SetupProfile
