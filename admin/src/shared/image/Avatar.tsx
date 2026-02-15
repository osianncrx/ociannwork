import { FC, useState } from 'react'
import Image from './Image'
import { ImageBaseUrl } from '../../constants'
import { getInitials } from '../../utils'
import { AvatarProps } from '../../types'

const Avatar: FC<AvatarProps> = ({ data, placeHolder, name,channel = false, customClass = '', height = 50, width = 50 }) => {
  const [hasError, setHasError] = useState(false)
  const initials = getInitials(name?.name)
  const displayName = initials ? initials : name?.name || name?.first_name || ''
  const firstLetter = initials ? initials : displayName.charAt(0).toUpperCase()

  const renderInitial = () => (
    <div
      className={`user-info img-fluid user-placeholder img-50 d-flex align-items-center justify-content-center ${customClass}`}
    >
      <span>{channel ? '#' : firstLetter}</span>
    </div>
  )

  const imageSrc = typeof data == 'string' ? data : data?.avatar || ''

  if (!hasError && imageSrc) {
    return (
      <Image
        src={ImageBaseUrl + imageSrc}
        fallbackSrc={placeHolder}
        height={height}
        width={width}
        alt={displayName}
        onError={() => setHasError(true)}
        className={customClass}
      />
    )
  }

  return renderInitial()
}

export default Avatar
