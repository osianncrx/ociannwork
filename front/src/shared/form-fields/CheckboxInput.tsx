import { useField } from 'formik'
import { FormFeedback, FormGroup, Input, Label } from 'reactstrap'
import { SvgIcon } from '../icons'
import { useTranslation } from 'react-i18next'
import { CheckboxProps } from '../../types'

const CheckboxInput = ({
  customClass,
  label,
  iconProps,
  formGroupClass,
  containerClass = 'login-input',
  labelClass,
  ...props
}: CheckboxProps) => {
  const [field, meta] = useField({ name: props.name, type: 'checkbox' })
  const { t } = useTranslation()

  const formGroupContent = (
    <FormGroup className={`${formGroupClass ? formGroupClass : ''} text-start`}>
      <div className="form-check">
        <Input
          {...field}
          {...props}
          type="checkbox"
          className={`${customClass ? 'mt-2' : 'form-check-input '} `}
          id={props.name}
          checked={field.value}
          invalid={meta.touched && !!meta.error}
        />
        <Label for={props.name} className={`form-check-label ${labelClass ? labelClass : ''}`}>
          {t(label)}
        </Label>
      </div>
      {meta.touched && meta.error ? <FormFeedback>{meta.error}</FormFeedback> : null}
    </FormGroup>
  )

  const hasIcon = iconProps?.iconId !== undefined

  return hasIcon ? (
    <div className={containerClass}>
      <SvgIcon {...iconProps} />
      {formGroupContent}
    </div>
  ) : (
    formGroupContent
  )
}

export default CheckboxInput
