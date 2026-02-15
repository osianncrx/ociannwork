import { useField } from 'formik'
import { useTranslation } from 'react-i18next'
import { FormFeedback, FormGroup, Label } from 'reactstrap'
import { RadioInputProps } from '../../types'

const RadioInput = ({
  name,
  label,
  labelClass = '',
  options,
  formGroupClass = '',
  wrapperClass = '',
}: RadioInputProps) => {
  const [field, meta, helpers] = useField(name)
  const { t } = useTranslation()

  return (
    <FormGroup className={`${formGroupClass} text-start`}>
      {label && <Label className={labelClass}>{t(label)}</Label>}

      {options.map((opt) => (
        <div className={`radio-wrapper ${wrapperClass}`} key={opt.value}>
          <input
            className="radio-input"
            type="radio"
            id={`${name}-${opt.value}`}
            name={name}
            value={opt.value}
            checked={field.value === opt.value}
            onChange={() => helpers.setValue(opt.value)}
          />
          <label className="radio-label" htmlFor={`${name}-${opt.value}`}>
            {t(opt.label)}
          </label>
        </div>
      ))}

      {meta.touched && meta.error && <FormFeedback className="d-block">{meta.error}</FormFeedback>}
    </FormGroup>
  )
}

export default RadioInput
