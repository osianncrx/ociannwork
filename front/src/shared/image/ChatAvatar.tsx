import { FC, useState } from 'react'
import { ChatType } from '../../constants'
import { AvatarProps } from '../../types'
import { getInitials } from '../../utils'
import Image from './Image'
import { SvgIcon } from '../icons'

const ChatAvatar: FC<AvatarProps> = ({ data, placeHolder, name, customClass = '', height = 50, width = 50 }) => {
  const [hasError, setHasError] = useState(false)
  const initials = getInitials(name?.name)
  const displayName = initials ? initials : name?.name || name?.first_name || ''
  const firstLetter = initials ? initials : displayName.charAt(0).toUpperCase()

  const renderInitial = () => (
    <>
      {data?.type !== ChatType.Channel ? (
        <div
          style={{
            backgroundColor: data?.profile_color ? data?.profile_color : '#5579F8',
          }}
          className={`user-info img-fluid  user-placeholder-primary d-flex align-items-center justify-content-center ${customClass}`}
        >
          <span>{firstLetter}</span>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: data?.profile_color ? data?.profile_color : '#5579F8',
          }}
          className={`user-info img-fluid  user-placeholder-primary d-flex align-items-center justify-content-center ${customClass}`}
        >
          <SvgIcon iconId="administration" className="common-svg-hw fill-none" />
        </div>
      )}
    </>
  )

  const imageSrc = data?.avatar

  if (!hasError && imageSrc) {
    return (
      <Image
        src={imageSrc}
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

export default ChatAvatar
