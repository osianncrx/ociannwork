import { useTranslation } from 'react-i18next'
import { SolidButton } from '../../../shared/button'
import { useAppDispatch } from '../../../store/hooks'
import { setScreen } from '../../../store/slices/screenSlice'
import { getStorage } from '../../../utils'

const ScreenLoadContent = () => {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const storage = getStorage()

  type Screen =
    | 'email'
    | 'password'
    | 'forgotPassword'
    | 'otp'
    | 'resetPassword'
    | 'createTeam'
    | 'setupProfile'
    | 'discoverTeam'
    | 'welcome'
    | 'webScreen'
    | 'termsAndConditions'
    | 'inviteTeam'
    | 'channelBanner'
    | 'customFields'
    | 'createChannel'

  const validScreens: Screen[] = [
    'email',
    'password',
    'forgotPassword',
    'otp',
    'resetPassword',
    'createTeam',
    'setupProfile',
    'discoverTeam',
    'welcome',
    'webScreen',
    'termsAndConditions',
    'inviteTeam',
    'channelBanner',
    'customFields',
    'createChannel',
  ]

  const handleContinue = () => {
    const redirect = storage.getItem('redirectAfterTerms')
    if (redirect && validScreens.includes(redirect as Screen)) {
      dispatch(setScreen(redirect as Screen))
      storage.removeItem('redirectAfterTerms')
    } else {
      dispatch(setScreen('webScreen')) // fallback
    }
  }

  return (
    <>
      <p className="w-100 margin-b-30">
        {t('return_user_heading')}
        <br />
        {t('want_to_pick_up_where_you_left_off')}?
      </p>

      <SolidButton
        title="continue_team_setup"
        type="submit"
        color="primary"
        className="w-100 login-btn margin-b-30"
        onClick={handleContinue}
      />

      <p className="text-center w-100 common-flex">
        {t('looking_for_a_fresh_start')}
        <div className="link-text ms-1" onClick={() => dispatch(setScreen('email'))}>
          {t('begin_now')}
        </div>
      </p>
    </>
  )
}

export default ScreenLoadContent
