import { useTranslation } from 'react-i18next'
import { STORAGE_KEYS } from '../../../../constants'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import { getStorage } from '../../../../utils'
import AuthWrapper from '../../widgets/AuthWrapper'
import PasswordCheckForm from './PasswordForm'

const Password = () => {
  const dispatch = useAppDispatch()
  const storage = getStorage()
  const checkEmail = storage.getItem(STORAGE_KEYS.CHECK_EMAIL) || null
  const { t } = useTranslation()
  const handleEditMail = () => {
    storage.setItem(STORAGE_KEYS.CHECK_EMAIL, checkEmail)
    dispatch(setScreen('email'))
  }

  return (
    <AuthWrapper bg="new-password">
      <div className="content-title">
        <div className="back-btn-badge" onClick={handleEditMail}>
          <SvgIcon className="back-btn-icon" iconId="back-arrow-icon" />
        </div>
        <h1>{t('enter_your_password')}</h1>
      </div>
      <p>{checkEmail}</p>
      <PasswordCheckForm />
    </AuthWrapper>
  )
}

export default Password
