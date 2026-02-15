import { FC } from 'react'
import { Avatar } from '../../shared/image'
import { AvatarListProps } from '../../types'

const AvatarList: FC<AvatarListProps> = ({ data = [], maxVisible = 3, customClass = '' }) => {
  const visible = data.slice(0, maxVisible)
  const hiddenCount = data.length - maxVisible

  return (
    <>
      {visible.map((item, index) => (
        <li key={index} className="d-inline-block">
          <Avatar data={item} name={item} customClass={`user-img ${customClass}`} />
        </li>
      ))}
      {hiddenCount > 0 && (
        <li className="d-inline-block">
          <p>{hiddenCount}+</p>
        </li>
      )}
    </>
  )
}

export default AvatarList
