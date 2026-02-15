import { useTranslation } from 'react-i18next'
import { STORAGE_KEYS } from '../../constants'
import { getStorage, truncateEmail } from '../../utils'
import AuthWrapper from '../widgets/AuthWrapper'
import VerifyOtpForm from './VerifyOtpForm'

const VerifyOtpContainer = () => {
  const storage = getStorage()
  const { t } = useTranslation()
  const forgotPasswordEmail = storage.getItem(STORAGE_KEYS.FORGOT_PASSWORD_EMAIL) || null
  return (
    <AuthWrapper bg='otp-verify'>
      <div className="content-title">
        <h1>Enter OTP to Continue</h1>
      </div>
      <p>
        {t('a_code_has_been_sent_to')} {truncateEmail(forgotPasswordEmail)}
      </p>
      <VerifyOtpForm />
    </AuthWrapper>
  )
}

export default VerifyOtpContainer
