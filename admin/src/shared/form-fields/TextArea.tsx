import { FieldHookConfig, useField } from 'formik'
import { useTranslation } from 'react-i18next'
import { FormFeedback, FormGroup, Input, Label } from 'reactstrap'
import { TextInputProps } from '../../types'

export default function TextArea({
  label,
  containerClass = 'login-input',
  children,
  name,
  rows = 4,
  ...props
}: TextInputProps & { rows?: number }) {
  const { validate, ...inputProps } = props
  const fieldConfig: FieldHookConfig<string> = { name, validate }
  const [field, meta] = useField(fieldConfig)
  const { t } = useTranslation()

  const formGroupContent = (
    <FormGroup className={`text-start position-relative ${containerClass}`}>
      {label && <Label for={props.id || name}>{t(label)}</Label>}
      <Input
        {...field}
        {...inputProps}
        type="textarea"
        rows={rows}
        placeholder={props.placeholder ? t(props.placeholder) : undefined}
        invalid={meta.touched && !!meta.error}
      />
      {meta.touched && meta.error ? <FormFeedback>{meta.error}</FormFeedback> : null}
      {children}
    </FormGroup>
  )

  return formGroupContent
}
