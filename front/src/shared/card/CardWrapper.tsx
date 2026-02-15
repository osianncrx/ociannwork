import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { RiAddFill, RiDownload2Line, RiUpload2Line } from 'react-icons/ri'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardBody, CardFooter, CardHeader } from 'reactstrap'
import { mutations } from '../../api'
import { ROUTES } from '../../constants'
import { CardWrapperProps } from '../../types'
import { SolidButton } from '../button'
import { SvgIcon } from '../icons'

const CardWrapper: FC<CardWrapperProps> = ({
  heading,
  cardClassName,
  className,
  footer,
  children,
  cardProps = {},
  headerProps = {},
  bodyProps = {},
  footerProps = {},
  headerActions,
  showAddNew,
  backBtn = false,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { mutate: exportMutate } = mutations.useExportCsv(headerActions?.exportUrl!)
  const { t } = useTranslation()

  const handleExport = () => {
    exportMutate(headerActions?.exportParams || {}, {
      onSuccess: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${headerActions?.exportFileName?.toLowerCase() || 'data'}.csv`
        link.click()
        window.URL.revokeObjectURL(url)
      },
    })
  }

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
    <Card {...cardProps} className={`${backBtn ? 'managechannel' : ''} ${cardClassName ? cardClassName : ''}`}>
      {(heading?.title || heading?.subtitle || heading?.headerChildren) && (
        <CardHeader className={`flex-between ${className ? className : ''}`} {...headerProps}>
          <div className={`d-flex flex-column ${backBtn ? 'header-info' : ''}`}>
            {backBtn && (
              <div className="admin-back-btn-badge me-3" onClick={handleBack}>
                <SvgIcon iconId="back-arrow-icon" />
              </div>
            )}
            <div>
              {heading?.title && <h4 className="card-title">{t(heading.title)}</h4>}
              {heading?.subtitle && <span className="card-subtitle">{t(heading.subtitle)}</span>}
            </div>
          </div>
          <div className="d-flex flex-btns gap-3">
            {headerActions && headerActions?.showExport && (
              <SolidButton className="btn-outline-primary" onClick={handleExport}>
                <RiDownload2Line className="me-1" />
                {t(headerActions?.exportText || 'export')}
              </SolidButton>
            )}
            {headerActions && headerActions?.showImport && (
              <SolidButton className="btn-outline-primary">
                <RiUpload2Line className="me-1" />
                {t(headerActions?.importText || 'import')}
              </SolidButton>
            )}
            {showAddNew && (
              <SolidButton
                color="primary"
                className="btn-outline-primary"
                onClick={() =>
                  showAddNew?.redirectUrl
                    ? navigate(ROUTES.ADMIN.CREATE_CUSTOM_FIELD)
                    : showAddNew?.onClick && showAddNew?.onClick()
                }
              >
                <RiAddFill className="me-1" />

                {t(showAddNew?.text ? showAddNew?.text : 'create_new')}
              </SolidButton>
            )}
            {heading?.headerChildren}
          </div>
        </CardHeader>
      )}
      {children && <CardBody {...bodyProps}>{children}</CardBody>}
      {footer && <CardFooter {...footerProps}>{footer.content}</CardFooter>}
    </Card>
  )
}

export default CardWrapper
