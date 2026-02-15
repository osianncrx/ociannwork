import { useTranslation } from 'react-i18next'
import { STORAGE_KEYS } from '../../../constants'
import { getStorage } from '../../../utils'
import AuthWrapper from '../widgets/AuthWrapper'
import ScreenLoadContent from './ScreenLoadContent'

const ScreenLoad = () => {
  const storage = getStorage()
  const checkEmail = storage.getItem(STORAGE_KEYS.CHECK_EMAIL) || null
  const { t } = useTranslation()
  return (
    <AuthWrapper bg='reload-screen'>
      <div className="content-title">
        <h1>{t('looks_like_youve_been_here_before')}</h1>
      </div>
      <p>
       {t('signed_in')} <div className="link-text">{checkEmail}</div>
      </p>
      <ScreenLoadContent />
    </AuthWrapper>
  )
}

export default ScreenLoad
