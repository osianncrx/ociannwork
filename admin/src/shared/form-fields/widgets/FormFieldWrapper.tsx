import { FormFeedback, FormGroup, Label } from 'reactstrap'
import { FormFieldWrapperProps } from '../../../types'

const FormFieldWrapper = ({
  label,
  id,
  name,
  error,
  touched,
  helperText,
  layout = 'vertical',
  labelclass = '',
  formgroupclass = '',
  children,
}: FormFieldWrapperProps) => {
  const hasError = touched && !!error

  return (
    <FormGroup className={`text-start position-relative ${formgroupclass}`}>
      {label && (
        <Label for={id || name} className={labelclass}>
          {label}
        </Label>
      )}
      <div className={layout === 'horizontal' ? 'd-flex align-items-center gap-2' : ''}>{children}</div>
      {hasError && <FormFeedback>{error}</FormFeedback>}
      {helperText && !hasError && <small className="form-text text-muted">{helperText}</small>}
    </FormGroup>
  )
}

export default FormFieldWrapper
