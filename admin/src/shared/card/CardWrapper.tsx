import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardBody, CardFooter, CardHeader } from 'reactstrap'
import { CardWrapperProps } from '../../types'
import SvgIcon from '../icons/SvgIcon'
import { useNavigate } from 'react-router-dom'

const CardWrapper: FC<CardWrapperProps> = ({
  heading,
  footer,
  children,
  cardProps = {},
  headerProps = {},
  bodyProps = {},
  footerProps = {},
  backBtn = false,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleBack = () => {
    const segments = location.pathname.split('/').filter(Boolean)
    if (segments.length > 1) {
      segments.pop()
      navigate('/' + segments.join('/'))
    } else {
      navigate('/')
    }
  }

  return (
    <div className="custom-manage-teams">
      <Card {...cardProps} className={`${backBtn ? 'managechannel' : ''}`}>
        {(heading?.title || heading?.subtitle || heading?.headerChildren) && (
          <CardHeader className="flex-between" {...headerProps}>
            <div className={`d-flex flex-column ${backBtn ? 'header-info' : ''}`}>
              {backBtn && (
                <div className="admin-back-btn-badge me-3" onClick={handleBack}>
                  <SvgIcon iconId="back-arrow-icon" />
                </div>
              )}
              {heading?.title && <h4 className="card-title">{t(heading.title)}</h4>}
              {heading?.subtitle && <span className="card-subtitle">{t(heading.subtitle)}</span>}
            </div>
            {heading?.headerChildren}
          </CardHeader>
        )}
        {children && <CardBody {...bodyProps}>{children}</CardBody>}
        {footer && <CardFooter {...footerProps}>{footer.content}</CardFooter>}
      </Card>
    </div>
  )
}

export default CardWrapper
