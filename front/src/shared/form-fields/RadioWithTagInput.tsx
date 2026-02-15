import { useField, useFormikContext } from 'formik'
import { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from 'reactstrap'
import { RadioInputOption, RadioWithTagInputProps } from '../../types'
import CheckboxInput from './CheckboxInput'
import FormFieldWrapper from './widgets/FormFieldWrapper'

const RadioWithTagInput: FC<RadioWithTagInputProps> = ({
  name,
  label,
  radioOptions,
  placeholder = 'Type and press Enter',
  layout = 'horizontal',
  helperText,
  formGroupClass,
}) => {
  const [field, meta] = useField(name)
  const { setFieldValue } = useFormikContext<any>()
  const [selectedOption, setSelectedOption] = useState<string>(radioOptions[0]?.value || '')
  const [inputValue, setInputValue] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const { t } = useTranslation()

  useEffect(() => {
    if (Array.isArray(field.value)) {
      const selected = radioOptions.find((opt) => field.value.includes(opt.value))?.value || radioOptions[0]?.value
      setSelectedOption(selected)
      const filteredTags = field.value.filter((val: string) => val !== selected)
      setTags(filteredTags)
    } else if (typeof field.value === 'string') {
      setSelectedOption(field.value)
      setTags([])
    }
  }, [field.value])

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      const newTag = inputValue.trim()
      if (!tags.includes(newTag)) {
        const updated = [...tags, newTag]
        setTags(updated)
        setFieldValue(name, [selectedOption, ...updated])
      }
      setInputValue('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    const updated = tags.filter((t) => t !== tag)
    setTags(updated)
    setFieldValue(name, [selectedOption, ...updated])
  }

  const handleRadioChange = (option: RadioInputOption) => {
    setSelectedOption(option.value)
    setTags([])
    const value = option.showTagInput ? [option.value] : option.value
    setFieldValue(name, value)

    if (option.checkboxAbove?.name && option.checkboxAbove?.show !== false) {
      setFieldValue(option.checkboxAbove.name, false)
    }
    if (option.checkboxBelow?.name && option.checkboxBelow?.show !== false) {
      setFieldValue(option.checkboxBelow.name, false)
    }
  }

  return (
    <FormFieldWrapper
      label={label}
      name={name}
      id={name}
      layout={layout}
      helperText={helperText}
      formGroupClass={formGroupClass}
      error={meta.error}
      touched={meta.touched}
    >
      <div className="d-flex flex-column gap-2">
        {radioOptions.map((option) => (
          <div key={option.value} className="mt-2">
            <Input
              className="radio-input"
              type="radio"
              name={name}
              value={option.value}
              checked={selectedOption === option.value}
              onChange={() => handleRadioChange(option)}
            />
            <label className="custom-form-label ms-2">{t(option.label)}</label>

            {selectedOption === option.value && option.showTagInput && (
              <div className="custom-tag-values">
                {option.checkboxAbove?.name && (
                  <div className="mt-2">
                    <CheckboxInput
                      name={option.checkboxAbove.name}
                      label={t(option.checkboxAbove.label ?? '')}
                      customClass
                    />
                  </div>
                )}

                <div className="custom-tag-input mt-2">
                  {tags.map((tag, index) => (
                    <span key={`${tag}-${index}`} className="tag">
                      {tag}
                      <button type="button" className="remove-btn" onClick={() => handleRemoveTag(tag)}>
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="tag-input-field"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={t(placeholder)}
                  />
                </div>

                {option.checkboxBelow?.name && (
                  <div className="mt-2">
                    <CheckboxInput
                      name={option.checkboxBelow.name}
                      label={t(option.checkboxBelow.label ?? '')}
                      customClass
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </FormFieldWrapper>
  )
}

export default RadioWithTagInput
