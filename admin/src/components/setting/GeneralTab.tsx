import { Col, Container, Label, Row } from 'reactstrap'
import { MediaInput, TextArea, TextInput } from '../../shared/form-fields'
import SearchableSelect from '../../shared/form-fields/SearchableSelectInput'
import { useEffect, useState } from 'react'
import { SelectOption } from '../../types/components/pages'
import { useTranslation } from 'react-i18next'
import { useFormikContext } from 'formik'
import { SettingFormValues } from '../../types'

const TypeOptions: SelectOption[] = [
  { label: '6', value: 6 },
  { label: '4', value: 4 },
]

const MinutesOptions: SelectOption[] = [
  { label: '5', value: 5 },
  { label: '15', value: 15 },
  { label: '25', value: 25 },
  { label: '30', value: 30 },
]

const GeneralTab = () => {
  const { t } = useTranslation()
  const { values, setFieldValue } = useFormikContext<SettingFormValues>()
  const [selectedType, setSelectedType] = useState<SelectOption | null>(null)
  const [selectedMinutes, setSelectedMinutes] = useState<SelectOption | null>(null)

  useEffect(() => {
    const otpDigitsValue = values.otp_digits
    if (otpDigitsValue !== undefined && otpDigitsValue !== null && otpDigitsValue !== '') {
      const option = TypeOptions.find((opt) => opt.value === Number(otpDigitsValue))
      if (option) {
        setSelectedType(option)
      } else {
        setSelectedType(TypeOptions[0])
      }
    }
  }, [values.otp_digits])

  useEffect(() => {
    const otpMinutesValue = values.otp_expiration_minutes
    if (otpMinutesValue !== undefined && otpMinutesValue !== null && otpMinutesValue !== '') {
      const option = MinutesOptions.find((opt) => opt.value === Number(otpMinutesValue))
      if (option) {
        setSelectedMinutes(option)
      } else {
        setSelectedMinutes(MinutesOptions[0])
      }
    }
  }, [values.otp_expiration_minutes])

  const handleTypeChange = (option: SelectOption | null) => {
    setSelectedType(option)
    setFieldValue('otp_digits', option?.value)
  }

  const handleMinutesChange = (option: SelectOption | null) => {
    setSelectedMinutes(option)
    setFieldValue('otp_expiration_minutes', option?.value)
  }

  return (
    <Container fluid>
      <Row>
        <Col md="3" className="margin-b-40">
          <MediaInput label="light_logo" name="logo_light" size="160px * 35px" />
        </Col>
        <Col md="3" className="margin-b-40">
          <MediaInput label="dark_logo" name="logo_dark" size="160px * 35px" />
        </Col>
        <Col md="3" className="margin-b-40">
          <MediaInput label="favicon" name="favicon" size="16px * 16px" />
        </Col>
        <Col md="3" className="margin-b-40">
          <MediaInput label="favicon_notification_logo" name="favicon_notification_logo" size="16px * 16px" />
        </Col>
        <Col md="3" className="margin-b-40">
          <MediaInput label="sidebar_logo" name="sidebar_logo" size="37px * 37px" />
        </Col>
        <Col md="3" className="margin-b-40">
          <MediaInput label="onboarding_logo" name="onboarding_logo" size="132px * 29px" />
        </Col>
        <Col md="3" className="margin-b-40">
          <MediaInput label="landing_logo" name="landing_logo" size="396px * 115px" />
        </Col>
        <Col md="4">
          <TextInput name="site_name" label="app_name" placeholder="enter_your_app_name" />
        </Col>
        <Col md="4">
          <Label>{t(`otp_digits`)}</Label>
          <SearchableSelect
            options={TypeOptions}
            value={selectedType}
            onChange={handleTypeChange}
            placeholder={t(`enter_your_otp_digits`)}
            name="otp_digits"
            isClearable={false}
          />
        </Col>
        <Col md="4">
          <Label>{t(`otp_expiration_minutes`)}</Label>
          <SearchableSelect
            options={MinutesOptions}
            value={selectedMinutes}
            onChange={handleMinutesChange}
            placeholder={t(`enter_your_otp_expiration_minutes`)}
            name="otp_expiration_minutes"
            isClearable={false}
          />
        </Col>
        <Col md="12">
          <TextArea name="site_description" label="app_description" placeholder="enter_your_app_description" />
        </Col>

      </Row>
    </Container>
  )
}

export default GeneralTab
