import { useTranslation } from 'react-i18next'
import { SvgIcon } from '../shared/icons'
import { SolidButton } from '../shared/button'
import { useAppSelector } from '../store/hooks'
import { Image } from '../shared/image'

interface NoInternetPageProps {
  onRetry: () => void
  isRetrying?: boolean
}

const NoInternetPage = ({ onRetry, isRetrying = false }: NoInternetPageProps) => {
  const { t } = useTranslation()
  const { no_internet_title, no_internet_content, no_internet_image_url } = useAppSelector((state) => state.setting)

  return (
    <div className="no-internet-page flex-center min-vh-100">
      <div className="text-center p-4">
        <div className="mb-4">
          <div className="no-internet-icon">
            {no_internet_image_url ? (
              <Image src={no_internet_image_url} alt="noInternet" />
            ) : (
              <SvgIcon iconId="alert-triangle" />
            )}
          </div>
        </div>

        <h2 className="mb-3 text-muted">{no_internet_title}</h2>

        <p className="mb-4 text-muted">{no_internet_content}</p>

        <SolidButton
          onClick={onRetry}
          loading={isRetrying}
          disabled={isRetrying}
          color="primary"
          className="px-4 py-2"
          title={isRetrying ? t('Checking...') : t('Retry')}
        />

        {isRetrying && (
          <div className="mt-3">
            <small className="text-info">{t('Checking internet connection...')}</small>
          </div>
        )}

        <div className="mt-3">
          <small className="text-muted">{t('Make sure you are connected to the internet and try again.')}</small>
        </div>
      </div>
    </div>
  )
}

export default NoInternetPage
