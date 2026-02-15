import { useTranslation } from 'react-i18next'
import AuthWrapper from '../../widgets/AuthWrapper'
import NewPasswordForm from './NewPasswordForm'

const NewPassword = () => {
  const { t } = useTranslation()
  return (
    <AuthWrapper bg='new-password'>
      <div className="content-title">
        <h1>{t('set_your_new_password')}</h1>
      </div>
      <p> {t('enter_and_confirm_your_new_password_below')}</p>
      <NewPasswordForm />
    </AuthWrapper>
  )
}

export default NewPassword
