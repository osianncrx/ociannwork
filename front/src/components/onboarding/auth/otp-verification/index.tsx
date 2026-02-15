import { useTranslation } from 'react-i18next'
import { Href, STORAGE_KEYS } from '../../../../constants'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import { getStorage } from '../../../../utils'
import AuthWrapper from '../../widgets/AuthWrapper'
import VerifyOtpForm from './OtpVerificationForm'

const OtpVerification = () => {
  const storage = getStorage()
  const dispatch = useAppDispatch()
  const forgotPasswordEmail = storage.getItem(STORAGE_KEYS.FORGOT_PASSWORD_EMAIL) || null
  const checkEmail = storage.getItem(STORAGE_KEYS.CHECK_EMAIL) || null
  const email = forgotPasswordEmail || checkEmail
  const { t } = useTranslation()
  const handleRedirectToMail = () => {
    storage.setItem(STORAGE_KEYS.KEEP_MAIL, true)
    dispatch(setScreen('email'))
  }

  return (
    <AuthWrapper bg="otp-screen">
      <div className="content-title">
        <div className="back-btn-badge" onClick={handleRedirectToMail}>
          <SvgIcon className="back-btn-icon" iconId="back-arrow-icon" />
        </div>
        <h1>{t('enter_your_otp_to_proceed')}</h1>
      </div>
      <p className="w-100">
        {t('a_code_has_been_sent_to')}{' '}
        <a className="link-text" href={Href}>
          {email}
        </a>
      </p>
      <VerifyOtpForm />
    </AuthWrapper>
  )
}

export default OtpVerification
