import { useTranslation } from 'react-i18next'
import AuthWrapper from '../widgets/AuthWrapper'
import ForgotPasswordForm from './ForgotPasswordForm'

const ForgotPasswordContainer = () => {
  const { t } = useTranslation()
  return (
    <AuthWrapper bg='forgot-password'>
      <div className="content-title">
        <h1>{t('need_a_password_reset')}</h1>
      </div>
      <p>{t('forget_your_password_lets_reset_it_just_a_few_steps')}</p>
      <ForgotPasswordForm />
    </AuthWrapper>
  )
}

export default ForgotPasswordContainer
