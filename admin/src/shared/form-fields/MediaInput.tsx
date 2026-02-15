import { useField, useFormikContext } from 'formik'
import { FC, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MediaInputProps } from '../../types'
import SvgIcon from '../icons/SvgIcon'
import { Image } from '../image'

const MediaInput: FC<MediaInputProps> = ({
  name,
  label,
  type = 'image',
  description,
  className = '',
  accept,
  size,
}) => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [field, meta] = useField<string>(name)
  const { setFieldValue, setFieldTouched } = useFormikContext()

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setPreviewUrl(URL.createObjectURL(file)) 
      setFieldValue(name, file)
      setFieldTouched(name, true, false)
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    setFieldValue(name, null)
    setFieldTouched(name, true, false)
  }

  const renderPreview = () => {
    if (!previewUrl) return null

    return type === 'video' ? (
      <video src={previewUrl} controls className="uploaded-media" onLoad={() => URL.revokeObjectURL(previewUrl)} />
    ) : (
      <Image
        src={previewUrl}
        alt={`${label} Preview`}
        className="uploaded-media"
        onLoad={() => URL.revokeObjectURL(previewUrl)}
      />
    )
  }

  const getAcceptTypes = () => {
    return accept || (type === 'video' ? 'video/*' : 'image/*')
  }

  const hasError = meta.touched && meta.error

  useEffect(() => {
    if (typeof field.value === 'string') {
      setPreviewUrl(field.value)
    }
    if (!field.value) {
      setPreviewUrl(null)
    }
  }, [field.value])
  return (
    <div className={`settings-logo-upload ${className}`}>
      <div className="settings-logo-upload__item">
        <h4 className="settings-logo-upload__title">{t(label)}</h4>
        {description && <p className="settings-logo-upload__description">{description}</p>}

        <div className="settings-logo-upload__images flex gap-3">
          <div
            className={`upload-box ${hasError ? 'upload-box--error' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <SvgIcon className="common-svg-hw" iconId="plus" />
            <input type="file" hidden accept={getAcceptTypes()} ref={fileInputRef} onChange={handleUpload} />
          </div>

          {field.value && (
            <div className="upload-box has-image relative">
              {renderPreview()}
              <button
                className="upload-box__remove absolute top-1 right-1"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove()
                }}
              >
                <SvgIcon className="common-svg-hw" iconId="close" />
              </button>
            </div>
          )}
        </div>
        {size && <p className="size-recommendation">Recommended size is {size}</p>}

        {hasError && <div className="settings-logo-upload__error">{meta.error}</div>}
      </div>
    </div>
  )
}

export default MediaInput
