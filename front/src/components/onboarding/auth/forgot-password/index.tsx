import { useTranslation } from 'react-i18next'
import AuthWrapper from '../../widgets/AuthWrapper'
import ForgotPasswordForm from './ForgotPasswordForm'
import { SvgIcon } from '../../../../shared/icons'
import { setScreen } from '../../../../store/slices/screenSlice'
import { useAppDispatch } from '../../../../store/hooks'

const ForgotPassword = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const handleRedirectToPassword = () => {
    dispatch(setScreen('password'))
  }
  return (
    <AuthWrapper bg="forget-password">
      <div className="content-title">
        <div className="back-btn-badge" onClick={handleRedirectToPassword}>
          <SvgIcon className="back-btn-icon" iconId="back-arrow-icon" />
        </div>
        <h1>{t('trouble_signing_in')}</h1>
      </div>
      <p className="w-100">{t('forget_your_password_lets_reset_it_just_a_few_steps')}</p>
      <ForgotPasswordForm />
    </AuthWrapper>
  )
}

export default ForgotPassword
