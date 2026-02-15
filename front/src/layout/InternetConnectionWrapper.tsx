import { ReactNode } from 'react'
import NoInternetPage from '../pages/NoInternetPage'
import { useAppSelector } from '../store/hooks'
import { useInternetConnection } from '../utils/hooks'
import { Image } from '../shared/image'

interface InternetConnectionWrapperProps {
  children: ReactNode
}

const InternetConnectionWrapper = ({ children }: InternetConnectionWrapperProps) => {
  const { isOnline, isChecking, retry } = useInternetConnection()
  const { public_loading_logo } = useAppSelector((state) => state.publicSetting)
  const { loading_logo } = useAppSelector((state) => state.setting)

  if (isChecking) {
    return (
      <div className="internet-connection-loading flex-center ">
        <div className="text-center">
          <div className="main-loader">
            {loading_logo || public_loading_logo ? (
              <Image src={loading_logo || public_loading_logo} alt="OciannWork" height={35} />
            ) : (
              <Image src="/logo/ociannwork-logo.png" alt="OciannWork" height={35} />
            )}
            <p>Simple, secure messaging for fast moving teams...!</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isOnline) {
    return <NoInternetPage onRetry={retry} isRetrying={isChecking} />
  }

  return <>{children}</>
}

export default InternetConnectionWrapper
