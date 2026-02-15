import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { STORAGE_KEYS } from '../../../../constants'
import { Image } from '../../../../shared/image'
import { clearStorageExcept } from '../../../../utils'
import AuthWrapper from '../../widgets/AuthWrapper'
import EmailForm from './EmailForm'

const EmailCheck = () => {
  const { t } = useTranslation()
  useEffect(() => {
    clearStorageExcept([STORAGE_KEYS.KEEP_MAIL])
  }, [])

  return (
    <AuthWrapper>
      <div className="content-title">
        <h1>{t('get_started_with_chat')}</h1>
        <Image src="/hand.gif" alt="hand-gif" className="hand-gif" />
      </div>
      <p>{t('enter_your_work_email_address_to_continue')}</p>
      <EmailForm />
    </AuthWrapper>
  )
}

export default EmailCheck
