import { FALLBACKS, Href } from '../../../../constants'
import { Image } from '../../../../shared/image'
import { useAppSelector } from '../../../../store/hooks'

const AppLogo = () => {
  const { sidebar_logo_url } = useAppSelector((state) => state.setting)

  return (
    <div className="logo-container">
      <a href={Href}>
        <Image
          src={`${sidebar_logo_url ? sidebar_logo_url : FALLBACKS.sidebar_logo_url}`}
          className="logo-messenger left-arrow-form"
        />
      </a>
    </div>
  )
}

export default AppLogo
