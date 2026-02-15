import { FC } from 'react'
import { TimePreviewProps } from '../../../../../types'

const TimePreview: FC<TimePreviewProps> = ({ previewText }) => {
  return <div className="custom-time-preview">{previewText}</div>
}

export default TimePreview
