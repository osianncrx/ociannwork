import { useFormikContext } from 'formik'
import { FC, KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FormFieldWrapper from './widgets/FormFieldWrapper'
import { TagInputProps } from '../../types'
import { safeJsonParse } from '../../components/web/utils/custom-functions'

const TagInput: FC<TagInputProps> = ({
  name,
  placeholder = 'Type and press Enter',
  className,
  label,
  layout = 'horizontal',
  helperText,
  formGroupClass,
  labelClass,
}) => {
  const { values, setFieldValue } = useFormikContext<any>()
  const [inputValue, setInputValue] = useState('')
  const { t } = useTranslation()

  const raw = values?.[name] || []
  const tags: string[] = useMemo(() => {
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try {
        const parsed = safeJsonParse(raw)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }, [raw])

  useEffect(() => {
    if (!Array.isArray(raw)) {
      setFieldValue(name, tags)
    }
  }, [raw, name, setFieldValue, tags])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const trimmed = inputValue.trim()
      if (trimmed && !tags.includes(trimmed)) {
        setFieldValue(name, [...tags, trimmed])
      }
      setInputValue('')
    }
  }

  const handleRemove = (tag: string) => {
    setFieldValue(
      name,
      tags.filter((t) => t !== tag),
    )
  }

  return (
    <FormFieldWrapper
      label={label}
      name={name}
      id={name}
      layout={layout}
      helperText={helperText}
      formGroupClass={formGroupClass}
      labelClass={labelClass}
    >
      <div className={`custom-tag-input  ${className || ''}`}>
        {tags?.map((tag, index) => (
          <span key={`${tag}-${index}`} className="tag">
            {tag}
            <button type="button" className="remove-btn" onClick={() => handleRemove(tag)}>
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          className="tag-input-field"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={!tags?.length ? t(placeholder) : ''}
        />
      </div>
    </FormFieldWrapper>
  )
}

export default TagInput
