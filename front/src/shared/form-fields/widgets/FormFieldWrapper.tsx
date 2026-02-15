import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Col, FormFeedback, Label, Tooltip } from 'reactstrap'
import { FormFieldWrapperProps } from '../../../types'
import { SvgIcon } from '../../icons'

const FormFieldWrapper: FC<FormFieldWrapperProps> = ({
  label,
  id,
  name,
  error,
  helperText,
  layout = 'horizontal',
  children,
  formGroupClass = '',
  labelClass = '',
  labelColSize = 4,
}) => {
  const { t } = useTranslation()
  const inputId = id || name
  const hasError = !!error
  const sanitizedInputId = inputId?.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '')
  const tooltipId = `${sanitizedInputId}-info-icon`
  const [tooltipOpen, setTooltipOpen] = useState(false)

  const labelNode = label ? (
    <div className="d-flex align-items-center gap-2">
      <Label for={inputId} className={`${helperText ? 'mb-0' : ''} ${labelClass}`}>
        {t(label)}
      </Label>
      {helperText && (
        <div className="tooltip-wrapper">
          <span id={tooltipId} className="icon-parent">
            <SvgIcon iconId="info" className="common-svg-md" />
            <Tooltip
              placement="top"
              isOpen={tooltipOpen}
              target={tooltipId}
              toggle={() => setTooltipOpen(!tooltipOpen)}
              className="custom-tooltip"
            >
              {t(helperText)}
            </Tooltip>
          </span>
        </div>
      )}
    </div>
  ) : null

  if (layout === 'vertical') {
    return (
      <div className={`${formGroupClass} form-group text-start`}>
        {labelNode}
        <div>{children}</div>
        {hasError && <FormFeedback className="d-block">{error}</FormFeedback>}
      </div>
    )
  }

  return (
    <div className={`${formGroupClass} form-group row align-items-center text-start`}>
      <Col xl={labelColSize}>{labelNode}</Col>
      <Col xl={12 - labelColSize}>
        {children}
        {hasError && <FormFeedback className="d-block">{error}</FormFeedback>}
      </Col>
    </div>
  )
}

export default FormFieldWrapper
