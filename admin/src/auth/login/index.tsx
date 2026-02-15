import { useTranslation } from 'react-i18next'
import AuthWrapper from '../widgets/AuthWrapper'
import LoginForm from './LoginForm'
import { Image } from '../../shared/image'

const LoginContainer = () => {
  const { t } = useTranslation()
  return (
    <AuthWrapper bg='login'>
      <div className="content-title">
        <h1>{t('get_started_with_chat')}</h1>
        <Image src={'/hand.gif'} alt="hand-gif" className="hand-gif" />
      </div>
      <p>{t('please_sign_in_with_your_personal_account_information')}</p>
      <LoginForm />
    </AuthWrapper>
  )
}

export default LoginContainer
