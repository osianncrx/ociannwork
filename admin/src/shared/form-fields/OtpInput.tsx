import { ChangeEvent, ClipboardEvent, FC, KeyboardEvent, useEffect, useRef } from 'react'
import { OtpInputProps } from '../../types'
import { FormikHelpers } from 'formik'

const OtpInput: FC<OtpInputProps> = ({ val, setVal,submitForm }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleBoxChange = (value: string, index: number) => {
    if (value.length > 1) return

    const updated = [...val]
    updated[index] = value
    setVal(updated)
       if (submitForm && updated.every((digit) => digit !== "")) {
      submitForm({ otp: updated.join("") }, {} as FormikHelpers<{ otp: string }>);
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target
    if (/^\d$/.test(value)) {
      handleBoxChange(value, index)
      if (index < inputRefs.current.length - 1) {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    const updated = [...val]

    if (e.key === 'Backspace') {
      if (val[index]) {
        updated[index] = ''
        setVal(updated)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
        updated[index - 1] = ''
        setVal(updated)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, val.length)
    const split = paste.split('')
    const updated = [...val]
    for (let i = 0; i < split.length; i++) {
      updated[i] = split[i]
    }
    setVal(updated)
    inputRefs.current[split.length - 1]?.focus()
  }

  return (
    <div className="otp-input-wrapper">
      {[...Array(6)].map((_, index) => (
        <input
          key={index}
          value={val[index] || ''}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          className="otp-input"
        />
      ))}
    </div>
  )
}

export default OtpInput
