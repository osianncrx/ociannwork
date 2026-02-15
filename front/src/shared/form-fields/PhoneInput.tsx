import { useField } from 'formik'
import { useTranslation } from 'react-i18next'
import Select from 'react-select'
import { Col, FormFeedback, FormGroup, Input, Label, Row } from 'reactstrap'
import { countryCodes } from '../../data'
import { PhoneInputGroupProps } from '../../types'
import { Image } from '../image'

const PhoneInput = ({
  label,
  name,
  codeName,
  formGroupClass = '',
  xxlClass = 2,
  xxlClass2 = 4,
}: PhoneInputGroupProps) => {
  const [codeField, codeMeta, codeHelpers] = useField(codeName)
  const [phoneField, phoneMeta] = useField(name)
  const { t } = useTranslation()

  const countryCodeOptions = countryCodes.map((c) => ({
    label: c.name,
    value: c.code.replace('+', ''),
    flag: c.flag,
    displayCode: c.code,
  }))

  const selectedCode = countryCodeOptions.find((opt) => opt.value === codeField.value)

  return (
    <FormGroup className={`${formGroupClass} text-start no-margin`}>
      {label && <Label>{t(label)}</Label>}
      <Row className="g-md-3 g-2">
        <Col xxl={xxlClass} xl={4} sm={4} xs={4}>
          <Select
            className="phone-input"
            options={countryCodeOptions}
            value={selectedCode || countryCodeOptions[0]}
            onChange={(option) => {
              codeHelpers.setValue(option?.value || '')
            }}
            onBlur={() => codeHelpers.setTouched(true)}
            isClearable={false}
            isSearchable
            classNamePrefix="react-select"
            placeholder={t('select')}
            formatOptionLabel={(option) => (
              <div className="flag-icon-box">
                {option.flag.startsWith('http') ? (
                  <Image src={option.flag} alt={option.label} width={20} height={15} className="object-fit-cover" />
                ) : (
                  <span className="flag">{option.flag}</span>
                )}
                <span>{option.displayCode}</span>
              </div>
            )}
          />
          {codeMeta.touched && codeMeta.error && <FormFeedback className="d-block">{codeMeta.error}</FormFeedback>}
        </Col>
        <Col xxl={xxlClass2} xl={8} sm={8} xs={8}>
          <Input
            autoComplete="off"
            {...phoneField}
            type="tel"
            className="custom-input"
            placeholder={t('type_a_number')}
            invalid={phoneMeta.touched && !!phoneMeta.error}
            pattern="[0-9]*"
            inputMode="numeric"
            onKeyDown={(e) => {
              const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Tab']
              const isPasteShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v'
              const isSelectAllShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a'

              if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key) && !isPasteShortcut && !isSelectAllShortcut) {
                e.preventDefault()
              }
            }}
          />
          {phoneMeta.touched && phoneMeta.error && <FormFeedback>{phoneMeta.error}</FormFeedback>}
        </Col>
      </Row>
    </FormGroup>
  )
}

export default PhoneInput
