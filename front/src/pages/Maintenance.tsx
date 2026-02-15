import { SvgIcon } from '../shared/icons'
import { Image } from '../shared/image'
import { useAppSelector } from '../store/hooks'

const MaintenancePage = () => {
  const { maintenance_image_url, maintenance_title, maintenance_message } = useAppSelector((state) => state.setting)

  return (
    <div className="maintenance-page flex-center min-vh-100">
      <div className="text-center p-4">
        <div className="mb-4">
          <div className="maintenance-icon">
            {maintenance_image_url ? (
              <Image src={maintenance_image_url} />
            ) : (
              <SvgIcon className="maintenance-svg" iconId="maintenance-svg" />
            )}
          </div>
        </div>

        <h2 className="text-muted">{maintenance_title}</h2>
        <p className="text-muted">{maintenance_message}</p>
      </div>
    </div>
  )
}

export default MaintenancePage
