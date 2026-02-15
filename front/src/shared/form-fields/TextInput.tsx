import { FormikContext, useField } from 'formik'
import { useContext, useEffect, useRef, KeyboardEvent, ClipboardEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from 'reactstrap'
import { TextInputProps } from '../../types'
import { SvgIcon } from '../icons'
import FormFieldWrapper from './widgets/FormFieldWrapper'

const TextInput = ({
  label,
  iconProps,
  formGroupClass,
  labelClass,
  containerClass = 'login-input',
  children,
  autoComplete = 'off',
  onlyAlphabets = false,
  helperText = '',
  layout = 'horizontal',
  noWrapper,
  autoFocus = false,
  ...props
}: TextInputProps) => {
  const formik = useContext(FormikContext)
  const [field, meta] = formik ? useField(props.name) : [{}, {} as any]

  const { t } = useTranslation()
  const inputId = props.id || props.name
  const hasError = !!meta.error
  const isNumberType = props.type === 'number'
  const isPassword = props.type === 'password'

  const inputRef = useRef<HTMLInputElement>(null)
  const [show, setShow] = useState(false)
  const toggleVisibility = () => setShow((prev) => !prev)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const inputType = isNumberType ? 'text' : isPassword ? (show ? 'text' : 'password') : props.type

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (onlyAlphabets) {
      const regex = /^[a-zA-Z\s\b]+$/
      if (!regex.test(e.key) && e.key.length === 1) {
        e.preventDefault()
      }
    }

    if (isNumberType) {
      const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Tab', 'Delete', 'Home', 'End']
      if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
        e.preventDefault()
      }
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (isNumberType) {
      const paste = e.clipboardData.getData('text')
      if (!/^\d+$/.test(paste)) {
        e.preventDefault()
      }
    }
  }

  const inputElement = (
    <Input
      {...field}
      {...props}
      innerRef={inputRef}
      id={inputId}
      type={inputType}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      autoComplete={autoComplete}
      placeholder={t(props?.placeholder || '')}
      value={formik ? (field.value ?? '') : (props.value ?? '')}
      onChange={formik ? field.onChange : props.onChange}
      onBlur={formik ? field.onBlur : props.onBlur}
      invalid={!!hasError}
    />
  )

  const hasIcon = iconProps?.iconId !== undefined

  const content = (
    <FormFieldWrapper
      label={label}
      id={inputId}
      name={props.name}
      error={meta.error}
      helperText={helperText}
      layout={layout}
      labelClass={labelClass}
      formGroupClass={formGroupClass}
    >
      <div className="position-relative">
        {hasIcon && <SvgIcon {...iconProps} />}
        {inputElement}
        {isPassword && (
          <div className="password-wrap cursor-pointer" onClick={toggleVisibility}>
            <SvgIcon className="icon-eye" iconId={show ? 'show-eye' : 'hide-eye'} />
          </div>
        )}
        {children}
      </div>
    </FormFieldWrapper>
  )
  return content
}

export default TextInput
