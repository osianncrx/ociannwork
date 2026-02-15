import { FieldHookConfig, useField } from 'formik'
import { useTranslation } from 'react-i18next'
import { FormFeedback, FormGroup, Input, Label } from 'reactstrap'
import { TextInputProps } from '../../types'
import SvgIcon from '../icons/SvgIcon'
import { ClipboardEvent, KeyboardEvent, useState } from 'react'

export default function TextInput({
  label,
  iconProps,
  containerClass = 'login-input',
  children,
  name,
  autoComplete = 'off',
  type = 'text',
  onlyNumeric,
  allowDecimal,
  ...props
}: TextInputProps) {
  const { validate, onKeyDown, onPaste, ...inputProps } = props
  const fieldConfig: FieldHookConfig<string> = { name, validate }
  const [field, meta] = useField(fieldConfig)
  const { t } = useTranslation()

  const isPassword = type === 'password'
  const [show, setShow] = useState(false)
  const toggleVisibility = () => setShow((prev) => !prev)

  const resolvedType = isPassword ? (show ? 'text' : 'password') : type
  const inputType = onlyNumeric && !isPassword ? 'text' : resolvedType

  const numericRegex = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/
  const computedInputMode = onlyNumeric ? (allowDecimal ? 'decimal' : 'numeric') : inputProps.inputMode
  const computedPattern = onlyNumeric ? (allowDecimal ? '[0-9]*[.]?[0-9]*' : '[0-9]*') : inputProps.pattern

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (onlyNumeric) {
      const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End', 'Enter']
      if (
        allowedKeys.includes(event.key) ||
        (event.ctrlKey || event.metaKey) ||
        (allowDecimal && event.key === '.' && !event.currentTarget.value.includes('.'))
      ) {
        // allow control/navigation keys and a single decimal separator
      } else if (!/^\d$/.test(event.key)) {
        event.preventDefault()
      }
    }

    onKeyDown?.(event)
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (onlyNumeric) {
      const pastedData = event.clipboardData.getData('text')
      if (!numericRegex.test(pastedData)) {
        event.preventDefault()
        return
      }
    }

    onPaste?.(event)
  }

  const formGroupContent = (
    <FormGroup className="text-start position-relative">
      {label && <Label for={props.id || name}>{t(label)}</Label>}
      <Input
        {...field}
        {...inputProps}
        autoComplete={autoComplete}
        type={inputType}
        inputMode={computedInputMode}
        pattern={computedPattern}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={props.placeholder ? t(props.placeholder) : undefined}
        invalid={meta.touched && !!meta.error}
      />
      {meta.touched && meta.error ? <FormFeedback>{meta.error}</FormFeedback> : null}

      {isPassword && (
        <div className="password-wrap" onClick={toggleVisibility} style={{ cursor: 'pointer' }}>
          <SvgIcon className="icon-eye" iconId={show ? 'show-eye' : 'hide-eye'} />
        </div>
      )}

      {children}
    </FormGroup>
  )

  return iconProps?.iconId ? (
    <div className={containerClass}>
      <SvgIcon {...iconProps} />
      {formGroupContent}
    </div>
  ) : (
    formGroupContent
  )
}
