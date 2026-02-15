import { FC } from 'react'
import { Button } from 'reactstrap'
import { SolidButtonProps } from '../../types'
import { useTranslation } from 'react-i18next'
import { SvgIcon } from '../icons'

export const SolidButton: FC<SolidButtonProps> = ({
  children,
  icon,
  color,
  type,
  className,
  loading,
  disabled,
  onClick,
  title,
  iconClass,
  ...props
}) => {
  const { t } = useTranslation()
  return (
    <Button
      {...props}
      onClick={onClick}
      type={type ? type : 'button'}
      color={color ? color : ''}
      disabled={loading || disabled ? true : false}
      className={` ${className ? className : ''} ${loading ? 'btn-loader-disabled' : ''} btn-solid`}
    >
      {loading ? (
        <div className="common-flex gap-2">
          {title ? t(title) : children}
          <div className="btn-loader">
            <svg className="animate-spin h-full" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M255.999 469.333C371.647 469.333 469.333 371.647 469.333 255.999H426.666C426.666 348.522 348.522 426.666 255.999 426.666C163.477 426.666 85.3327 348.522 85.3327 255.999C85.3327 163.498 163.477 85.3327 255.999 85.3327V42.666C140.351 42.666 42.666 140.373 42.666 255.999C42.666 371.647 140.351 469.333 255.999 469.333Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      ) : (
        <>
          {icon && <SvgIcon className={`common-svg-btn ${iconClass}`} iconId={icon} />}
          {title ? t(title) : children}
        </>
      )}
    </Button>
  )
}
